import { gameLogger } from "../../utils/gameLogger";

/**
 * Interface representing the structure of OpenRouter chat completion request messages.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * OpenRouter LLM HTTP client wrapper using the global fetch API.
 * Works in React Native / Expo. Jest tests should mock global fetch.
 */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  apiUrl: string,
  messages: ChatMessage[],
  timeoutMs = 15000,
): Promise<string> {
  const isJest =
    typeof process !== "undefined" && process.env && process.env.JEST_WORKER_ID;

  if (isJest) {
    return callOpenRouterNode(apiKey, model, apiUrl, messages, timeoutMs);
  }

  const postData = JSON.stringify({
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.1, // Low temperature for deterministic card selection and formatting
  });

  gameLogger.info("llm_api_call_start", {
    model,
    apiUrl,
    messageCount: messages.length,
    timeoutMs,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/ejfn/Tractor",
        "X-Title": "Tractor Shengji AI",
      },
      body: postData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      gameLogger.error("llm_api_error_response", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `OpenRouter API error (HTTP ${response.status}): ${response.statusText}. Details: ${errorText}`,
      );
    }

    const data = await response.json();
    const assistantMessage = data?.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      gameLogger.error("llm_api_empty_response", { data });
      throw new Error(
        "OpenRouter API returned an empty or invalid chat completion payload.",
      );
    }

    gameLogger.info("llm_api_call_success", {
      responseLength: assistantMessage.length,
    });

    return assistantMessage;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      gameLogger.error("llm_api_timeout", { timeoutMs });
      throw new Error(
        `OpenRouter API request timed out after ${timeoutMs}ms.`,
      );
    }
    gameLogger.error("llm_api_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Fallback implementation using Node.js native https module for Jest/Node CLI environments.
 * This completely avoids issues with react-native fetch polyfills/stubs.
 */
function callOpenRouterNode(
  apiKey: string,
  model: string,
  apiUrl: string,
  messages: ChatMessage[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const modName = "https";
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const https = typeof require !== "undefined" ? require(modName) : undefined;
      if (!https) {
        throw new Error("Node.js https module is not available in this environment.");
      }

      const postData = JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const url = new URL(apiUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://github.com/ejfn/Tractor",
          "X-Title": "Tractor Shengji AI",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: timeoutMs,
      };

      gameLogger.info("llm_api_call_start", {
        model,
        apiUrl,
        messageCount: messages.length,
        timeoutMs,
        transport: "node-https",
      });

      const req = https.request(options, (res: any) => {
        const statusCode = res.statusCode || 0;
        res.setEncoding("utf8");
        let body = "";

        res.on("data", (chunk: string) => {
          body += chunk;
        });

        res.on("end", () => {
          if (statusCode < 200 || statusCode >= 300) {
            gameLogger.error("llm_api_error_response", {
              status: statusCode,
              statusText: res.statusMessage || "HTTP Error",
              error: body,
            });
            reject(
              new Error(
                `OpenRouter API error (HTTP ${statusCode}): ${res.statusMessage || "HTTP Error"}. Details: ${body}`,
              ),
            );
            return;
          }

          try {
            const data = JSON.parse(body);
            const assistantMessage = data?.choices?.[0]?.message?.content;

            if (!assistantMessage) {
              gameLogger.error("llm_api_empty_response", { data });
              reject(
                new Error(
                  "OpenRouter API returned an empty or invalid chat completion payload.",
                ),
              );
              return;
            }

            gameLogger.info("llm_api_call_success", {
              responseLength: assistantMessage.length,
            });
            resolve(assistantMessage);
          } catch (error) {
            reject(new Error(`Failed to parse OpenRouter response JSON: ${error}`));
          }
        });
      });

      req.on("error", (error: any) => {
        gameLogger.error("llm_api_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      });

      req.on("timeout", () => {
        req.destroy();
        gameLogger.error("llm_api_timeout", { timeoutMs });
        reject(new Error(`OpenRouter API request timed out after ${timeoutMs}ms.`));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}


/**
 * Fast check to test if an API Key can connect to OpenRouter successfully.
 * Tries a very small query with a short timeout.
 */
export async function testOpenRouterConnection(
  apiKey: string,
  model = "deepseek/deepseek-chat-v3.1",
  apiUrl = "https://openrouter.ai/api/v1/chat/completions",
): Promise<{ success: boolean; message: string }> {
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a test helper." },
      {
        role: "user",
        content: "Respond with JSON key 'status' equal to 'ok'.",
      },
    ];

    const result = await callOpenRouter(apiKey, model, apiUrl, messages, 12000);
    const parsed = JSON.parse(result);

    if (parsed && parsed.status === "ok") {
      return { success: true, message: "Connection successful!" };
    }
    return { success: false, message: `Unexpected payload: ${result}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
