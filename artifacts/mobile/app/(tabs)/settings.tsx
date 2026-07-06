import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
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
import { useSettings } from "@/hooks/useSettings";
import { HANDLE_PLATFORM_IDS, PLATFORMS } from "@/lib/platforms";
import { VOICE_OPTIONS, type VoiceOption } from "@/lib/settings";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const [savedFlash, setSavedFlash] = useState(false);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const setVoice = (voice: VoiceOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    update({ ...settings, voice });
    flashSaved();
  };

  const setHandle = (id: keyof typeof PLATFORMS, value: string) => {
    update({ ...settings, handles: { ...settings.handles, [id]: value } });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;
  const isDark = colors.background === "#080c14";

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
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
            <Ionicons name="settings-sharp" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[s.logoName, { color: colors.foreground }]}>
              Repurpose
              <Text style={{ color: "#818cf8" }}>.ai</Text>
            </Text>
            <Text style={[s.logoSub, { color: colors.mutedForeground }]}>YOUR PROFILE</Text>
          </View>
          {savedFlash && (
            <View style={[s.savedBadge, { backgroundColor: isDark ? "#052e16" : "#dcfce7" }]}>
              <Ionicons name="checkmark" size={11} color="#22c55e" />
              <Text style={s.savedBadgeText}>Saved</Text>
            </View>
          )}
        </View>

        {/* Headline */}
        <View style={s.headline}>
          <Text style={[s.h1, { color: colors.foreground }]}>
            Set it once.{"\n"}Sound like you everywhere.
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Your voice and your handles, remembered for every post Imagine writes.
          </Text>
        </View>

        {/* Voice Card */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>YOUR VOICE</Text>
          <View style={s.voiceWrap}>
            {VOICE_OPTIONS.map((v) => {
              const active = settings.voice === v;
              if (active) {
                return (
                  <LinearGradient
                    key={v}
                    colors={["#6366f1", "#a855f7"]}
                    style={s.voicePill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <TouchableOpacity onPress={() => setVoice(v)}>
                      <Text style={[s.voicePillText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>
                );
              }
              return (
                <TouchableOpacity
                  key={v}
                  style={[s.voicePill, { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setVoice(v)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.voicePillText, { color: colors.mutedForeground }]}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Handles Card */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>YOUR HANDLES</Text>
          {HANDLE_PLATFORM_IDS.map((id) => {
            const meta = PLATFORMS[id];
            return (
              <View
                key={id}
                style={[s.handleRow, { borderColor: colors.border }]}
              >
                <MaterialCommunityIcons name={meta.icon as never} size={18} color="#818cf8" />
                <Text style={[s.handleLabel, { color: colors.foreground }]}>{meta.label}</Text>
                <TextInput
                  value={settings.handles[id] ?? ""}
                  onChangeText={(v) => setHandle(id, v)}
                  onBlur={flashSaved}
                  placeholder="@handle"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    s.handleInput,
                    {
                      color: colors.foreground,
                      backgroundColor: isDark ? "#060a10" : "#f8f9ff",
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  logoGrad: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  logoName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3, fontFamily: "Inter_700Bold" },
  logoSub: { fontSize: 9, letterSpacing: 1.5, marginTop: 1, fontFamily: "Inter_400Regular" },
  savedBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  savedBadgeText: { fontSize: 10, color: "#22c55e", fontFamily: "Inter_600SemiBold" },
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
  cardLabel: { fontSize: 9, letterSpacing: 1.8, marginBottom: 14, fontFamily: "Inter_600SemiBold" },
  voiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voicePill: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 },
  voicePillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  handleLabel: { width: 84, fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  handleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
