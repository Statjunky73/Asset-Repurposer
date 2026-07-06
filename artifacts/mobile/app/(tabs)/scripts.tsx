import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RemixableField } from "@/components/RemixableField";
import { useColors } from "@/hooks/useColors";
import { apiUrl } from "@/lib/apiBase";
import { callRemix } from "@/lib/remix";

type ScriptScene = {
  order: number;
  visual: string;
  voiceover: string;
  onScreenText: string;
  durationSeconds: number;
};

type VideoScriptResult = {
  hook: string;
  hookAlternatives: string[];
  scenes: ScriptScene[];
  caption: string;
  hashtags: string[];
  cta: string;
  estimatedTotalSeconds: number;
};

const PLATFORMS = [
  {
    id: "tiktok",
    label: "TikTok",
    icon: "music-note" as const,
    desc: "Punchy caption, trending hashtags",
  },
  {
    id: "reels",
    label: "Instagram Reels",
    icon: "instagram" as const,
    desc: "Hook text overlay in scene 1",
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    icon: "youtube" as const,
    desc: "Caption doubles as description",
  },
];

const DURATIONS = [15, 30, 60, 90];

const TONES = ["Casual", "Professional", "Bold", "Witty", "Inspiring"];

const EXAMPLE =
  "A day in the life of a freelance video editor working from coffee shops around the world.";

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildFullScriptText(input: {
  hook: string;
  scenes: ScriptScene[];
  caption: string;
  hashtags: string;
  cta: string;
}) {
  let elapsed = 0;
  const sceneLines = input.scenes
    .map((scene) => {
      const start = elapsed;
      elapsed += scene.durationSeconds;
      const parts = [
        `Scene ${scene.order} (${formatTimestamp(start)}–${formatTimestamp(elapsed)})`,
        `VISUAL: ${scene.visual}`,
        `VO: ${scene.voiceover}`,
      ];
      if (scene.onScreenText) parts.push(`TEXT: ${scene.onScreenText}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return [
    `HOOK: ${input.hook}`,
    sceneLines,
    `CAPTION:\n${input.caption}`,
    `HASHTAGS: ${input.hashtags}`,
    `CTA: ${input.cta}`,
  ].join("\n\n");
}

export default function VideoScriptScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [idea, setIdea] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "tiktok",
  ]);
  const [duration, setDuration] = useState(30);
  const [tone, setTone] = useState("Casual");
  const [result, setResult] = useState<VideoScriptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editedHook, setEditedHook] = useState("");
  const [editedScenes, setEditedScenes] = useState<ScriptScene[]>([]);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [editedCta, setEditedCta] = useState("");

  const canGenerate =
    !loading && idea.trim().length > 0 && selectedPlatforms.length > 0;

  const togglePlatform = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generateScript = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setResult(null);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(apiUrl("/api/video-script"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          platforms: selectedPlatforms,
          durationSeconds: duration,
          tone,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResult(data.result);
      setEditedHook(data.result.hook);
      setEditedScenes(data.result.scenes.map((sc: ScriptScene) => ({ ...sc })));
      setEditedCaption(data.result.caption);
      setEditedHashtags(data.result.hashtags.map((h: string) => `#${h}`).join(" "));
      setEditedCta(data.result.cta);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const promoteHook = (alt: string, index: number) => {
    if (!result) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextAlternatives = [...result.hookAlternatives];
    nextAlternatives[index] = editedHook;
    setResult({ ...result, hookAlternatives: nextAlternatives });
    setEditedHook(alt);
  };

  const updateScene = (index: number, patch: Partial<ScriptScene>) => {
    setEditedScenes((prev) => prev.map((sc, i) => (i === index ? { ...sc, ...patch } : sc)));
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;
  const isDark = colors.background === "#080c14";

  let elapsed = 0;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <LinearGradient
            colors={["#6366f1", "#a855f7"]}
            style={s.logoGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="film" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[s.logoName, { color: colors.foreground }]}>
              Repurpose
              <Text style={{ color: "#818cf8" }}>.ai</Text>
            </Text>
            <Text style={[s.logoSub, { color: colors.mutedForeground }]}>
              VIDEO SCRIPT WRITER
            </Text>
          </View>
          <View
            style={[
              s.badge,
              {
                backgroundColor: isDark ? "#0f172a" : "#e8eaf5",
                borderColor: isDark ? "#1e3a5f" : "#c7d2fe",
              },
            ]}
          >
            <Text style={[s.badgeText, { color: isDark ? "#60a5fa" : "#6366f1" }]}>
              AI
            </Text>
          </View>
        </View>

        {/* Headline */}
        <View style={s.headline}>
          <Text style={[s.h1, { color: colors.foreground }]}>
            Your idea goes in.{"\n"}A script comes out.
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Type a video idea — get a scene-by-scene script ready for TikTok,
            Reels, or Shorts.
          </Text>
        </View>

        {/* Idea Input Card */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            YOUR VIDEO IDEA
          </Text>
          <TextInput
            style={[
              s.textarea,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: isDark ? "#060a10" : "#f8f9ff",
              },
            ]}
            value={idea}
            onChangeText={setIdea}
            placeholder="A day in the life of..., 3 mistakes beginners make when..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={s.inputFooter}>
            <Text style={[s.metaText, { color: colors.mutedForeground }]}>
              {idea.length} chars
            </Text>
            <TouchableOpacity onPress={() => setIdea(EXAMPLE)}>
              <Text style={[s.exampleLink, { color: "#818cf8" }]}>
                Load example
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Platform Picker */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            PLATFORMS
          </Text>
          {PLATFORMS.map((p) => {
            const active = selectedPlatforms.includes(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  s.formatRow,
                  {
                    backgroundColor: active
                      ? isDark
                        ? "#0f1e35"
                        : "#eef0ff"
                      : "transparent",
                    borderColor: active ? "#3b5bdb" : colors.border,
                  },
                ]}
                onPress={() => togglePlatform(p.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={p.icon}
                  size={18}
                  color={active ? "#818cf8" : colors.mutedForeground}
                />
                <View style={s.formatMeta}>
                  <Text
                    style={[
                      s.formatLabel,
                      {
                        color: active ? colors.foreground : colors.mutedForeground,
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                  <Text style={[s.formatDesc, { color: colors.mutedForeground }]}>
                    {p.desc}
                  </Text>
                </View>
                <View
                  style={[
                    s.checkbox,
                    {
                      backgroundColor: active ? "#6366f1" : "transparent",
                      borderColor: active ? "#6366f1" : colors.border,
                    },
                  ]}
                >
                  {active && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration Picker */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            TARGET DURATION
          </Text>
          <View style={s.toneRow}>
            {DURATIONS.map((d) => {
              const active = duration === d;
              const label = `${d}s`;
              if (active) {
                return (
                  <LinearGradient
                    key={d}
                    colors={["#6366f1", "#a855f7"]}
                    style={s.tonePill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setDuration(d);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text
                        style={[
                          s.tonePillText,
                          { color: "#fff", fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>
                );
              }
              return (
                <TouchableOpacity
                  key={d}
                  style={[s.tonePill, { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => {
                    setDuration(d);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.tonePillText, { color: colors.mutedForeground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tone Picker */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            TONE OF VOICE
          </Text>
          <View style={s.toneRow}>
            {TONES.map((t) => {
              const active = tone === t;
              if (active) {
                return (
                  <LinearGradient
                    key={t}
                    colors={["#6366f1", "#a855f7"]}
                    style={s.tonePill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setTone(t);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text
                        style={[
                          s.tonePillText,
                          { color: "#fff", fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>
                );
              }
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.tonePill, { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => {
                    setTone(t);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.tonePillText, { color: colors.mutedForeground }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Generate Button */}
        {loading ? (
          <View style={[s.genBtn, { backgroundColor: isDark ? "#1a2540" : "#e8eaf5" }]}>
            <ActivityIndicator size="small" color="#818cf8" />
            <Text style={[s.genBtnText, { color: "#818cf8" }]}>Writing script...</Text>
          </View>
        ) : canGenerate ? (
          <TouchableOpacity onPress={generateScript} activeOpacity={0.85}>
            <LinearGradient
              colors={["#6366f1", "#a855f7"]}
              style={s.genBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="film" size={18} color="#fff" />
              <Text style={[s.genBtnText, { color: "#fff" }]}>Generate Script</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[s.genBtn, { backgroundColor: isDark ? "#1a2540" : "#e8eaf5" }]}>
            <Ionicons name="film" size={18} color={isDark ? "#374151" : "#9ca3af"} />
            <Text style={[s.genBtnText, { color: isDark ? "#374151" : "#9ca3af" }]}>
              Generate Script
            </Text>
          </View>
        )}

        {/* Error */}
        {!!error && (
          <View style={[s.errorBox, { backgroundColor: "#1a0a0a", borderColor: "#7f1d1d" }]}>
            <Ionicons name="alert-circle-outline" size={15} color="#fca5a5" />
            <Text style={[s.errorText, { color: "#fca5a5" }]}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={s.results}>
            <View style={[s.resultsDivider, { borderBottomColor: colors.border }]}>
              <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
                SCRIPT — ~{result.estimatedTotalSeconds}s
              </Text>
            </View>

            {/* Hook */}
            <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.resultHeader}>
                <View style={s.resultTitle}>
                  <Ionicons name="flash" size={15} color="#818cf8" />
                  <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                    Hook
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.copyBtn,
                    {
                      backgroundColor: copiedId === "hook" ? "#22c55e" : "transparent",
                      borderColor: copiedId === "hook" ? "#22c55e" : colors.border,
                    },
                  ]}
                  onPress={() => copyText("hook", editedHook)}
                >
                  <Text
                    style={[
                      s.copyBtnText,
                      { color: copiedId === "hook" ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {copiedId === "hook" ? "COPIED" : "COPY"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[s.resultBody, { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe" }]}>
                <RemixableField
                  value={editedHook}
                  onChange={setEditedHook}
                  onRemix={(instruction) => callRemix(editedHook, instruction)}
                  textStyle={{ fontWeight: "700" }}
                  placeholder="Your hook..."
                />
              </View>
              {result.hookAlternatives.map((alt, index) => (
                <TouchableOpacity
                  key={index}
                  style={s.altHookRow}
                  onPress={() => promoteHook(alt, index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="swap-horizontal" size={13} color={colors.mutedForeground} />
                  <Text style={[s.altHookText, { color: colors.mutedForeground }]}>{alt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scenes */}
            {editedScenes.map((scene, index) => {
              const start = elapsed;
              elapsed += scene.durationSeconds;
              const sceneId = `scene-${scene.order}`;
              const sceneText = [
                `VISUAL: ${scene.visual}`,
                `VO: ${scene.voiceover}`,
                scene.onScreenText ? `TEXT: ${scene.onScreenText}` : null,
              ]
                .filter(Boolean)
                .join("\n");
              return (
                <View
                  key={sceneId}
                  style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={s.resultHeader}>
                    <View style={s.resultTitle}>
                      <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                        Scene {scene.order}
                      </Text>
                      <View style={[s.timeBadge, { backgroundColor: isDark ? "#0f1e35" : "#eef0ff" }]}>
                        <Text style={[s.timeBadgeText, { color: colors.mutedForeground }]}>
                          {formatTimestamp(start)}–{formatTimestamp(elapsed)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        s.copyBtn,
                        {
                          backgroundColor: copiedId === sceneId ? "#22c55e" : "transparent",
                          borderColor: copiedId === sceneId ? "#22c55e" : colors.border,
                        },
                      ]}
                      onPress={() => copyText(sceneId, sceneText)}
                    >
                      <Text
                        style={[
                          s.copyBtnText,
                          { color: copiedId === sceneId ? "#fff" : colors.mutedForeground },
                        ]}
                      >
                        {copiedId === sceneId ? "COPIED" : "COPY"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[s.resultBody, { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe" }]}>
                    <View style={s.sceneRow}>
                      <MaterialCommunityIcons name="movie-outline" size={14} color={colors.mutedForeground} />
                      <TextInput
                        value={scene.visual}
                        onChangeText={(v) => updateScene(index, { visual: v })}
                        multiline
                        style={[s.resultText, s.sceneInput, { color: isDark ? "#d1d5db" : "#374151" }]}
                      />
                    </View>
                    <View style={s.sceneRow}>
                      <MaterialCommunityIcons name="microphone-outline" size={14} color={colors.mutedForeground} />
                      <TextInput
                        value={scene.voiceover}
                        onChangeText={(v) => updateScene(index, { voiceover: v })}
                        multiline
                        style={[s.resultText, s.sceneInput, { color: isDark ? "#d1d5db" : "#374151" }]}
                      />
                    </View>
                    <View style={s.sceneRow}>
                      <MaterialCommunityIcons name="format-text" size={14} color={colors.mutedForeground} />
                      <TextInput
                        value={scene.onScreenText}
                        onChangeText={(v) => updateScene(index, { onScreenText: v })}
                        placeholder="On-screen text (optional)"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        style={[s.resultText, s.sceneInput, { color: isDark ? "#d1d5db" : "#374151" }]}
                      />
                    </View>
                    <RemixableField
                      value={scene.voiceover}
                      onChange={(v) => updateScene(index, { voiceover: v })}
                      onRemix={(instruction) => callRemix(scene.voiceover, instruction)}
                      remixLabel="Remix scene"
                      hideInput
                    />
                  </View>
                </View>
              );
            })}

            {/* Caption + Hashtags */}
            <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.resultHeader}>
                <View style={s.resultTitle}>
                  <Ionicons name="chatbox-ellipses-outline" size={15} color="#818cf8" />
                  <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                    Caption &amp; Hashtags
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.copyBtn,
                    {
                      backgroundColor: copiedId === "caption" ? "#22c55e" : "transparent",
                      borderColor: copiedId === "caption" ? "#22c55e" : colors.border,
                    },
                  ]}
                  onPress={() => copyText("caption", `${editedCaption}\n\n${editedHashtags}`)}
                >
                  <Text
                    style={[
                      s.copyBtnText,
                      { color: copiedId === "caption" ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {copiedId === "caption" ? "COPIED" : "COPY"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[s.resultBody, { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe" }]}>
                <RemixableField
                  value={editedCaption}
                  onChange={setEditedCaption}
                  onRemix={(instruction) => callRemix(editedCaption, instruction)}
                  placeholder="Your caption..."
                />
                <TextInput
                  value={editedHashtags}
                  onChangeText={setEditedHashtags}
                  multiline
                  placeholder="#yourtags"
                  placeholderTextColor={colors.mutedForeground}
                  style={[s.hashtagText, { color: "#818cf8", padding: 0 }]}
                />
              </View>
            </View>

            {/* CTA */}
            <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.resultTitle}>
                <Ionicons name="megaphone-outline" size={15} color="#818cf8" />
                <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                  Closing CTA
                </Text>
              </View>
              <View style={[s.resultBody, { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe", marginTop: 14 }]}>
                <RemixableField
                  value={editedCta}
                  onChange={setEditedCta}
                  onRemix={(instruction) => callRemix(editedCta, instruction)}
                  placeholder="Your closing line..."
                />
              </View>
            </View>

            {/* Copy Full Script */}
            <TouchableOpacity
              onPress={() =>
                copyText(
                  "full",
                  buildFullScriptText({
                    hook: editedHook,
                    scenes: editedScenes,
                    caption: editedCaption,
                    hashtags: editedHashtags,
                    cta: editedCta,
                  })
                )
              }
              activeOpacity={0.85}
            >
              <View
                style={[
                  s.genBtn,
                  {
                    backgroundColor: copiedId === "full" ? "#22c55e" : isDark ? "#1a2540" : "#e8eaf5",
                  },
                ]}
              >
                <Ionicons
                  name={copiedId === "full" ? "checkmark" : "copy-outline"}
                  size={18}
                  color={copiedId === "full" ? "#fff" : "#818cf8"}
                />
                <Text
                  style={[
                    s.genBtnText,
                    { color: copiedId === "full" ? "#fff" : "#818cf8" },
                  ]}
                >
                  {copiedId === "full" ? "Copied Full Script" : "Copy Full Script"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  logoGrad: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  logoName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    fontFamily: "Inter_700Bold",
  },
  logoSub: {
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 1,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    marginLeft: "auto",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: "Inter_600SemiBold",
  },
  headline: { marginBottom: 24 },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 8,
    fontFamily: "Inter_700Bold",
  },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 14 },
  cardLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 14,
    fontFamily: "Inter_600SemiBold",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  exampleLink: { fontSize: 11, fontFamily: "Inter_500Medium" },
  formatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  formatMeta: { flex: 1 },
  formatLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  formatDesc: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toneRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tonePill: { paddingHorizontal: 15, paddingVertical: 7, borderRadius: 20 },
  tonePillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    overflow: "hidden",
  },
  genBtnText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, flex: 1, fontFamily: "Inter_400Regular" },
  results: { marginTop: 4 },
  resultsDivider: { borderBottomWidth: 1, paddingBottom: 12, marginBottom: 14 },
  resultCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  resultTitle: { flexDirection: "row", alignItems: "center", gap: 7 },
  resultLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: "Inter_700Bold",
  },
  timeBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  timeBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  copyBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  copyBtnText: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_600SemiBold",
  },
  resultBody: { borderLeftWidth: 2, paddingLeft: 14, gap: 10 },
  resultText: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  sceneRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  sceneInput: { flex: 1, padding: 0 },
  hashtagText: {
    fontSize: 12.5,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: "Inter_500Medium",
  },
  altHookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingLeft: 14,
  },
  altHookText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
