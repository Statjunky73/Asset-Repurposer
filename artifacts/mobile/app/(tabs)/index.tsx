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
import { useColors } from "@/hooks/useColors";

const FORMATS = [
  {
    id: "tweet",
    label: "X Thread",
    icon: "twitter" as const,
    desc: "3-part tweet thread",
  },
  {
    id: "linkedin",
    label: "LinkedIn Post",
    icon: "linkedin" as const,
    desc: "Professional story post",
  },
  {
    id: "tiktok",
    label: "TikTok Hook",
    icon: "music-note" as const,
    desc: "Scroll-stopping opener",
  },
  {
    id: "email",
    label: "Email Subject",
    icon: "email-outline" as const,
    desc: "5 subject line options",
  },
  {
    id: "newsletter",
    label: "Newsletter Blurb",
    icon: "newspaper-variant-outline" as const,
    desc: "Short teaser paragraph",
  },
  {
    id: "youtube",
    label: "YouTube Description",
    icon: "youtube" as const,
    desc: "Title + SEO description",
  },
];

const TONES = ["Casual", "Professional", "Bold", "Witty", "Inspiring"];

const EXAMPLE =
  "I spent 6 months learning to wake up at 5am every day, and here's what actually happened. The first week was brutal — I failed 4 out of 7 days. But by month 2, I discovered it wasn't about willpower at all. It was about what I did the night before. The secret: I stopped optimizing my mornings and started designing my evenings instead. Prep your clothes, set a specific intention for the morning, and get off screens 90 minutes before bed. Now I wake up before my alarm. Every single day.";

export default function RepurposeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    "tweet",
    "linkedin",
  ]);
  const [tone, setTone] = useState("Casual");
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const canGenerate =
    !loading && content.trim().length > 0 && selectedFormats.length > 0;

  const toggleFormat = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const repurpose = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setResults(null);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const res = await fetch(`https://${domain}/api/repurpose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, formats: selectedFormats, tone }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResults(data.results);
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const isDark = colors.background === "#080c14";

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
            <Ionicons name="flash" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[s.logoName, { color: colors.foreground }]}>
              Repurpose
              <Text style={{ color: "#818cf8" }}>.ai</Text>
            </Text>
            <Text style={[s.logoSub, { color: colors.mutedForeground }]}>
              CONTENT MULTIPLIER
            </Text>
          </View>
          <View
            style={[
              s.badge,
              { backgroundColor: isDark ? "#0f172a" : "#e8eaf5", borderColor: isDark ? "#1e3a5f" : "#c7d2fe" },
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
            One piece of content.{"\n"}Everywhere.
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Paste a transcript, article, or idea — get ready-to-post content for
            every platform.
          </Text>
        </View>

        {/* Input Card */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            YOUR RAW CONTENT
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
            value={content}
            onChangeText={setContent}
            placeholder="Paste a blog post, video transcript, podcast notes, or any raw idea here..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <View style={s.inputFooter}>
            <Text style={[s.metaText, { color: colors.mutedForeground }]}>
              {content.length} chars · ~{wordCount} words
            </Text>
            <TouchableOpacity onPress={() => setContent(EXAMPLE)}>
              <Text style={[s.exampleLink, { color: "#818cf8" }]}>
                Load example
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Format Picker */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            OUTPUT FORMATS
          </Text>
          {FORMATS.map((f) => {
            const active = selectedFormats.includes(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  s.formatRow,
                  {
                    backgroundColor: active
                      ? isDark ? "#0f1e35" : "#eef0ff"
                      : "transparent",
                    borderColor: active ? "#3b5bdb" : colors.border,
                  },
                ]}
                onPress={() => toggleFormat(f.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={f.icon}
                  size={18}
                  color={active ? "#818cf8" : colors.mutedForeground}
                />
                <View style={s.formatMeta}>
                  <Text
                    style={[
                      s.formatLabel,
                      {
                        color: active
                          ? colors.foreground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                  <Text style={[s.formatDesc, { color: colors.mutedForeground }]}>
                    {f.desc}
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
                      <Text style={[s.tonePillText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>
                );
              }
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.tonePill,
                    { borderWidth: 1, borderColor: colors.border },
                  ]}
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
          <View
            style={[
              s.genBtn,
              { backgroundColor: isDark ? "#1a2540" : "#e8eaf5" },
            ]}
          >
            <ActivityIndicator size="small" color="#818cf8" />
            <Text style={[s.genBtnText, { color: "#818cf8" }]}>
              Generating...
            </Text>
          </View>
        ) : canGenerate ? (
          <TouchableOpacity onPress={repurpose} activeOpacity={0.85}>
            <LinearGradient
              colors={["#6366f1", "#a855f7"]}
              style={s.genBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={[s.genBtnText, { color: "#fff" }]}>
                Repurpose Content
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              s.genBtn,
              { backgroundColor: isDark ? "#1a2540" : "#e8eaf5" },
            ]}
          >
            <Ionicons
              name="flash"
              size={18}
              color={isDark ? "#374151" : "#9ca3af"}
            />
            <Text
              style={[
                s.genBtnText,
                { color: isDark ? "#374151" : "#9ca3af" },
              ]}
            >
              Repurpose Content
            </Text>
          </View>
        )}

        {/* Error */}
        {!!error && (
          <View
            style={[
              s.errorBox,
              { backgroundColor: "#1a0a0a", borderColor: "#7f1d1d" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={15} color="#fca5a5" />
            <Text style={[s.errorText, { color: "#fca5a5" }]}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {results && (
          <View style={s.results}>
            <View
              style={[s.resultsDivider, { borderBottomColor: colors.border }]}
            >
              <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
                GENERATED — {tone.toUpperCase()} TONE
              </Text>
            </View>

            {selectedFormats.map((id) => {
              const f = FORMATS.find((fmt) => fmt.id === id);
              const text = results[id];
              if (!f || !text) return null;
              const isCopied = copiedId === id;
              return (
                <View
                  key={id}
                  style={[
                    s.resultCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={s.resultHeader}>
                    <View style={s.resultTitle}>
                      <MaterialCommunityIcons
                        name={f.icon}
                        size={15}
                        color="#818cf8"
                      />
                      <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                        {f.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        s.copyBtn,
                        {
                          backgroundColor: isCopied ? "#22c55e" : "transparent",
                          borderColor: isCopied ? "#22c55e" : colors.border,
                        },
                      ]}
                      onPress={() => copyText(id, text)}
                    >
                      <Text
                        style={[
                          s.copyBtnText,
                          {
                            color: isCopied ? "#fff" : colors.mutedForeground,
                          },
                        ]}
                      >
                        {isCopied ? "COPIED" : "COPY"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      s.resultBody,
                      { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe" },
                    ]}
                  >
                    <Text style={[s.resultText, { color: isDark ? "#d1d5db" : "#374151" }]}>
                      {text}
                    </Text>
                  </View>
                </View>
              );
            })}
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
    minHeight: 130,
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
  resultBody: { borderLeftWidth: 2, paddingLeft: 14 },
  resultText: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
});
