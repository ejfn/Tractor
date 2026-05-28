import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { testOpenRouterConnection } from "../ai/llm/llmAIClient";
import { DEFAULT_LLM_CONFIG, LLMConfig } from "../ai/llm/llmConfig";

// ─── Model catalogue ────────────────────────────────────────────────────────

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
  rank: string;
  rankColor: string;
  inputPrice: string;
  outputPrice: string;
}

const MODELS: ModelInfo[] = [
  {
    id: "deepseek/deepseek-chat-v3.1",
    name: "DeepSeek Chat V3.1",
    icon: "🌊",
    rank: "Best Overall",
    rankColor: "#06B6D4",
    inputPrice: "$0.21",
    outputPrice: "$0.79",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Meta Llama 3.3 70B",
    icon: "🦙",
    rank: "Alternative",
    rankColor: "#F59E0B",
    inputPrice: "$0.10",
    outputPrice: "$0.32",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    icon: "🟢",
    rank: "Ultra Stable",
    rankColor: "#10B981",
    inputPrice: "$0.15",
    outputPrice: "$0.60",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    icon: "✨",
    rank: "Fastest",
    rankColor: "#8B5CF6",
    inputPrice: "$0.30",
    outputPrice: "$2.50",
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface AIConfigModalProps {
  visible: boolean;
  currentConfig: LLMConfig;
  onSave: (config: LLMConfig) => void;
  onClose: () => void;
}

// ─── Connection status types ─────────────────────────────────────────────────

type ConnectionStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

// ─── Component ───────────────────────────────────────────────────────────────

const AIConfigModal: React.FC<AIConfigModalProps> = ({
  visible,
  currentConfig,
  onSave,
  onClose,
}) => {
  const [useLLM, setUseLLM] = useState(currentConfig.enabled);
  const [selectedModel, setSelectedModel] = useState(
    currentConfig.model || DEFAULT_LLM_CONFIG.model,
  );
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || "");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    kind: "idle",
  });

  // Sync local state when the modal opens (handles mid-game reopen)
  useEffect(() => {
    if (visible) {
      setUseLLM(currentConfig.enabled);
      setSelectedModel(currentConfig.model || DEFAULT_LLM_CONFIG.model);
      setApiKey(currentConfig.apiKey || "");
      setConnectionStatus({ kind: "idle" });
    }
  }, [visible, currentConfig]);

  // ── Mode toggle ────────────────────────────────────────────────────────────

  const handleModeToggle = useCallback(
    (llmMode: boolean) => {
      setUseLLM(llmMode);
      // Reset connection status on mode switch
      setConnectionStatus({ kind: "idle" });
    },
    [],
  );

  // ── Connection test ────────────────────────────────────────────────────────

  const handleTestConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      setConnectionStatus({
        kind: "error",
        message: "Please enter your OpenRouter API key first.",
      });
      return;
    }

    setConnectionStatus({ kind: "testing" });

    const result = await testOpenRouterConnection(
      apiKey.trim(),
      selectedModel,
      DEFAULT_LLM_CONFIG.apiUrl,
    );

    setConnectionStatus(
      result.success
        ? { kind: "success", message: `✓ Connected — ${MODELS.find((m) => m.id === selectedModel)?.name ?? selectedModel} is ready!` }
        : { kind: "error", message: `✗ ${result.message}` },
    );
  }, [apiKey, selectedModel]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const canSave =
    !useLLM || connectionStatus.kind === "success";

  const handleSave = useCallback(() => {
    const newConfig: LLMConfig = {
      ...DEFAULT_LLM_CONFIG,
      enabled: useLLM,
      apiKey: apiKey.trim(),
      model: selectedModel,
    };
    onSave(newConfig);
  }, [useLLM, apiKey, selectedModel, onSave]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🤖</Text>
            <Text style={styles.headerTitle}>AI Player Settings</Text>
            <Text style={styles.headerSubtitle}>
              Changes take effect immediately, even mid-game
            </Text>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Mode Segmented Control ── */}
            <View style={styles.segmentWrapper}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentLeft,
                  !useLLM && styles.segmentActive,
                ]}
                onPress={() => handleModeToggle(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.segmentIcon}>⚡</Text>
                <Text
                  style={[
                    styles.segmentText,
                    !useLLM && styles.segmentTextActive,
                  ]}
                >
                  Algorithmic
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentRight,
                  useLLM && styles.segmentActiveLLM,
                ]}
                onPress={() => handleModeToggle(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.segmentIcon}>🧠</Text>
                <Text
                  style={[
                    styles.segmentText,
                    useLLM && styles.segmentTextActive,
                  ]}
                >
                  LLM AI
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Algorithmic mode description ── */}
            {!useLLM && (
              <View style={styles.algoCard}>
                <View style={styles.algoHeaderRow}>
                  <Text style={styles.algoHeaderIcon}>📐</Text>
                  <Text style={styles.algoTitle}>Pure Mathematics</Text>
                </View>
                <Text style={styles.algoDescription}>
                  Fast, deterministic, rule-based AI. No API key required.
                  Zero latency · fully offline.
                </Text>
                <View style={styles.algoFeaturesList}>
                  {[
                    { label: "Instant Decisions", desc: "0ms latency local calculation" },
                    { label: "100% Free & Unlimited", desc: "Zero API token costs or request limits" },
                    { label: "Fully Autonomous", desc: "Runs locally on your device without connection" },
                  ].map((f) => (
                    <View key={f.label} style={styles.algoFeatureItem}>
                      <Text style={styles.algoFeatureCheck}>✓</Text>
                      <View style={styles.algoFeatureTextContainer}>
                        <Text style={styles.algoFeatureTitle}>{f.label}</Text>
                        <Text style={styles.algoFeatureDesc}>{f.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── LLM panel ── */}
            {useLLM && (
              <View style={styles.llmPanel}>
                {/* API Key */}
                <Text style={styles.sectionLabel}>OpenRouter API Key</Text>
                <View style={styles.apiKeyRow}>
                  <TextInput
                    style={styles.apiKeyInput}
                    value={apiKey}
                    onChangeText={(v) => {
                      setApiKey(v);
                      // Reset connection status if user edits the key
                      if (connectionStatus.kind !== "idle") {
                        setConnectionStatus({ kind: "idle" });
                      }
                    }}
                    placeholder="sk-or-v1-…"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                </View>

                <Text style={styles.apiKeyHint}>
                  Get a free key at{" "}
                  <Text style={styles.apiKeyHintLink}>openrouter.ai</Text>
                </Text>

                {/* Model cards */}
                <Text style={styles.sectionLabel}>Select Model</Text>
                {MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelCard,
                        isSelected && styles.modelCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedModel(model.id);
                        setConnectionStatus({ kind: "idle" });
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.modelCardHeader}>
                        <Text style={styles.modelIcon}>{model.icon}</Text>
                        <View style={styles.modelNameBlock}>
                          <Text style={styles.modelName}>{model.name}</Text>
                          <View
                            style={[
                              styles.rankBadge,
                              { borderColor: model.rankColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.rankBadgeText,
                                { color: model.rankColor },
                              ]}
                            >
                              {model.rank}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedCheck}>
                            <Text style={styles.selectedCheckText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>
                          {model.inputPrice}
                          <Text style={styles.pricingUnit}> in</Text>
                        </Text>
                        <Text style={styles.pricingDivider}>/</Text>
                        <Text style={styles.pricingLabel}>
                          {model.outputPrice}
                          <Text style={styles.pricingUnit}> out</Text>
                        </Text>
                        <Text style={styles.pricingUnit}> per 1M tokens</Text>
                      </View>
                    </TouchableOpacity>

                  );
                })}

                {/* Test connection */}
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    connectionStatus.kind === "testing" &&
                      styles.testButtonDisabled,
                  ]}
                  onPress={handleTestConnection}
                  disabled={connectionStatus.kind === "testing"}
                  activeOpacity={0.8}
                >
                  {connectionStatus.kind === "testing" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testButtonText}>
                      🔌 Test Connection
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Connection status banner */}
                {connectionStatus.kind === "success" && (
                  <View style={styles.bannerSuccess}>
                    <Text style={styles.bannerText}>
                      {connectionStatus.message}
                    </Text>
                  </View>
                )}
                {connectionStatus.kind === "error" && (
                  <View style={styles.bannerError}>
                    <Text style={styles.bannerText}>
                      {connectionStatus.message}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* ── Footer buttons ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.cancelBtn]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.saveBtn,
                !canSave && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {useLLM && connectionStatus.kind !== "success"
                  ? "Test First"
                  : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "92%",
    maxWidth: 420,
    maxHeight: "88%",
    flexGrow: 1,
    backgroundColor: "#0F0F1A",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },

  // Header
  header: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: "#1A1A2E",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerEmoji: { fontSize: 28, marginBottom: 6 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F1F5F9",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 18, paddingBottom: 8 },

  // Segmented control
  segmentWrapper: {
    flexDirection: "row",
    backgroundColor: "#1E1E30",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentLeft: { marginRight: 2 },
  segmentRight: { marginLeft: 2 },
  segmentActive: {
    backgroundColor: "#FFC107",
    shadowColor: "#FFC107",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentActiveLLM: {
    backgroundColor: "#7B1FA2",
    shadowColor: "#7B1FA2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentIcon: { fontSize: 16 },
  segmentText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  segmentTextActive: { color: "#FFFFFF" },

  // Algorithmic mode card
  algoCard: {
    backgroundColor: "rgba(30, 30, 48, 0.45)",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.22)",
    marginTop: 4,
    shadowColor: "#FFC107",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  algoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  algoHeaderIcon: {
    fontSize: 20,
  },
  algoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFD54F",
    letterSpacing: 0.5,
  },
  algoDescription: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 19,
    marginBottom: 16,
  },
  algoFeaturesList: {
    gap: 10,
  },
  algoFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 193, 7, 0.03)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.08)",
    gap: 12,
  },
  algoFeatureCheck: {
    color: "#FFC107",
    fontSize: 15,
    fontWeight: "900",
  },
  algoFeatureTextContainer: {
    flex: 1,
  },
  algoFeatureTitle: {
    fontSize: 12,
    color: "#F1F5F9",
    fontWeight: "700",
    marginBottom: 1,
  },
  algoFeatureDesc: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  // LLM panel
  llmPanel: {},

  // API key
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  apiKeyRow: { marginBottom: 6 },
  apiKeyInput: {
    backgroundColor: "#1E1E30",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    fontFamily: "monospace",
  },
  apiKeyHint: { fontSize: 12, color: "#64748B", marginBottom: 16 },
  apiKeyHintLink: { color: "#AB47BC", fontWeight: "600" },

  // Model cards
  modelCard: {
    backgroundColor: "#1E1E30",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  modelCardSelected: {
    borderColor: "#7B1FA2",
    backgroundColor: "rgba(123,31,162,0.12)",
  },
  modelCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  modelIcon: { fontSize: 20, marginRight: 10 },
  modelNameBlock: { flex: 1 },
  modelName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F1F5F9",
    marginBottom: 3,
  },
  rankBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rankBadgeText: { fontSize: 10, fontWeight: "700" },
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#7B1FA2",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  modelDescription: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 17,
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pricingLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1" },
  pricingDivider: { fontSize: 12, color: "#475569" },
  pricingUnit: { fontSize: 11, color: "#64748B", fontWeight: "400" },

  // Test button
  testButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  testButtonDisabled: { backgroundColor: "#1E3A7A", opacity: 0.7 },
  testButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Status banners
  bannerSuccess: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
  },
  bannerError: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
  },
  bannerText: { fontSize: 13, color: "#F1F5F9", lineHeight: 18 },

  // Footer
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "#1A1A2E",
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cancelBtnText: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  saveBtn: { backgroundColor: "#7B1FA2" },
  saveBtnDisabled: { backgroundColor: "#4A1A6A", opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default AIConfigModal;
