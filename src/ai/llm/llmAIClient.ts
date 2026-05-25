import { gameLogger } from "../../utils/gameLogger";

/**
 * Interface representing the structure of OpenRouter chat completion request messages.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * OpenRouter LLM HTTP client wrapper.
 * Calls OpenRouter API using standard fetch (in Expo) or built-in https (in Node/Jest).
 */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  apiUrl: string,
  messages: ChatMessage[],
  timeoutMs = 15000
): Promise<string> {
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

  // Cross-platform check: if fetch is not defined globally OR we are in a JEST test environment
  const isJestEnv = typeof process !== "undefined" && process.env.NODE_ENV === "test";
  
  if (typeof fetch === "undefined" || isJestEnv) {
    // Dynamic import of Node's built-in modules to keep it clean in React Native bundler
    const https = require("https");
    const url = require("url");

    const parsedUrl = url.parse(apiUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
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

    return new Promise<string>((resolve, reject) => {
      const req = https.request(options, (res: any) => {
        let body = "";
        res.setEncoding("utf8");

        res.on("data", (chunk: string) => {
          body += chunk;
        });

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            gameLogger.error("llm_api_error_response", {
              status: res.statusCode,
              statusText: res.statusMessage,
              error: body,
            });
            reject(new Error(`OpenRouter API error (HTTP ${res.statusCode}): ${res.statusMessage}. Details: ${body}`));
            return;
          }

          try {
            const data = JSON.parse(body);
            const assistantMessage = data?.choices?.[0]?.message?.content;
            if (!assistantMessage) {
              gameLogger.error("llm_api_empty_response", { data });
              reject(new Error("OpenRouter API returned an empty or invalid chat completion payload."));
              return;
            }
            gameLogger.info("llm_api_call_success", {
              responseLength: assistantMessage.length,
            });
            resolve(assistantMessage);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on("timeout", () => {
        req.destroy();
        gameLogger.error("llm_api_timeout", { timeoutMs });
        reject(new Error(`OpenRouter API request timed out after ${timeoutMs}ms.`));
      });

      req.on("error", (e: Error) => {
        gameLogger.error("llm_api_failed", { error: e.message });
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  } else {
    // Web / Expo native fetch environment
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
        throw new Error(`OpenRouter API error (HTTP ${response.status}): ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      const assistantMessage = data?.choices?.[0]?.message?.content;

      if (!assistantMessage) {
        gameLogger.error("llm_api_empty_response", { data });
        throw new Error("OpenRouter API returned an empty or invalid chat completion payload.");
      }

      gameLogger.info("llm_api_call_success", {
        responseLength: assistantMessage.length,
      });

      return assistantMessage;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        gameLogger.error("llm_api_timeout", { timeoutMs });
        throw new Error(`OpenRouter API request timed out after ${timeoutMs}ms.`);
      }
      gameLogger.error("llm_api_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Fast check to test if an API Key can connect to OpenRouter successfully.
 * Tries a very small query with a short timeout.
 */
export async function testOpenRouterConnection(
  apiKey: string,
  model = "deepseek/deepseek-chat",
  apiUrl = "https://openrouter.ai/api/v1/chat/completions"
): Promise<{ success: boolean; message: string }> {
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a test helper." },
      { role: "user", content: "Respond with JSON key 'status' equal to 'ok'." },
    ];

    const result = await callOpenRouter(apiKey, model, apiUrl, messages, 6000);
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
