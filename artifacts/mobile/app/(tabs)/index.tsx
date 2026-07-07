import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CarouselPreview } from "@/components/CarouselPreview";
import { PolicyWarnings, type PolicyFlag } from "@/components/PolicyWarnings";
import { RemixableField } from "@/components/RemixableField";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/hooks/useSettings";
import { apiUrl } from "@/lib/apiBase";
import { extractVideoFrame } from "@/lib/extractVideoFrame";
import { HANDLE_PLATFORM_IDS, PLATFORMS } from "@/lib/platforms";
import { callRemix } from "@/lib/remix";
import type { HandlePlatformId } from "@/lib/settings";

type PlatformId = Exclude<HandlePlatformId, "substack">;

const ALL_PLATFORM_IDS = HANDLE_PLATFORM_IDS.filter((id): id is PlatformId => id !== "substack");

type PlatformSuggestion = {
  id: PlatformId;
  label: string;
  reason: string;
};

type MediaAnalysisResult = {
  summary: string;
  caption: string;
  hashtags: string[];
  platforms: PlatformSuggestion[];
};

type MediaItem = {
  id: string;
  kind: "photo" | "video";
  previewUri: string;
  base64: string;
  mimeType: "image/jpeg";
};

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MediaAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [personalContext, setPersonalContext] = useState("");

  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [policyFlags, setPolicyFlags] = useState<PolicyFlag[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
  const [optimizingPlatform, setOptimizingPlatform] = useState<PlatformId | null>(null);

  const lastCheckedCaptionRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canGenerate = !preparing && !analyzing && media.length > 0;

  const resetResults = () => {
    setError("");
    setResult(null);
    setPolicyFlags([]);
    setSelectedPlatforms([]);
  };

  const processAsset = async (
    uri: string,
    kind: "photo" | "video"
  ): Promise<MediaItem | null> => {
    try {
      const frameUri = kind === "video" ? await extractVideoFrame(uri) : uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        frameUri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      if (!manipulated.base64) return null;
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind,
        previewUri: manipulated.uri,
        base64: manipulated.base64,
        mimeType: "image/jpeg",
      };
    } catch {
      return null;
    }
  };

  const pickInitialMedia = async () => {
    resetResults();

    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("We need access to your photos to continue.");
        return;
      }
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (picked.canceled || !picked.assets?.length) return;

    let assets = picked.assets;
    let droppedVideo = false;
    if (assets.length > 1) {
      const before = assets.length;
      assets = assets.filter((a) => a.type !== "video");
      droppedVideo = assets.length < before;
      if (assets.length === 0) return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreparing(true);
    setMedia([]);

    try {
      const items = await Promise.all(
        assets.map((a) => processAsset(a.uri, a.type === "video" ? "video" : "photo"))
      );
      const valid = items.filter((i): i is MediaItem => i !== null);
      if (valid.length === 0) {
        setError("Couldn't process that file. Try a different photo or video.");
        return;
      }
      setMedia(valid);
      if (droppedVideo) {
        setError("Videos can't be part of a photo carousel — added the photos only.");
      }
    } catch {
      setError("Couldn't process that file. Try a different photo or video.");
    } finally {
      setPreparing(false);
    }
  };

  const addPhoto = async () => {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("We need access to your photos to continue.");
        return;
      }
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreparing(true);
    resetResults();

    try {
      const item = await processAsset(picked.assets[0].uri, "photo");
      if (!item) {
        setError("Couldn't process that file. Try a different photo.");
        return;
      }
      setMedia((prev) => [...prev, item]);
    } finally {
      setPreparing(false);
    }
  };

  const removeMediaItem = (id: string) => {
    resetResults();
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const analyze = async () => {
    if (!canGenerate || media.length === 0) return;
    setAnalyzing(true);
    setResult(null);
    setError("");
    setPolicyFlags([]);
    setSelectedPlatforms([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(apiUrl("/api/analyze-media"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: media[0].kind,
          images: media.map((m) => ({ imageBase64: m.base64, mimeType: m.mimeType })),
          voice: settings.voice,
          personalContext: personalContext.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResult(data.result);
      setEditedCaption(data.result.caption);
      setEditedHashtags(data.result.hashtags.map((h: string) => `#${h}`).join(" "));
      setPolicyFlags(data.policyFlags ?? []);
      lastCheckedCaptionRef.current = data.result.caption;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Re-scan the caption text for policy concerns whenever it changes (debounced),
  // merging with — not replacing — any flags already found on the image itself.
  useEffect(() => {
    if (!result) return;
    if (editedCaption === lastCheckedCaptionRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastCheckedCaptionRef.current = editedCaption;
      try {
        const res = await fetch(apiUrl("/api/policy-check-text"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editedCaption }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setPolicyFlags((prev) => [
          ...prev.filter((f) => f.source !== "text"),
          ...(data.policyFlags ?? []),
        ]);
      } catch {
        // Background check — fail silently, don't interrupt the user.
      }
    }, 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedCaption, result]);

  const copyText = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const togglePlatform = (id: PlatformId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const optimizeForPlatform = async (id: PlatformId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOptimizingPlatform(id);
    try {
      const meta = PLATFORMS[id];
      const rewritten = await callRemix(
        editedCaption,
        `Rewrite this caption optimized for ${meta.label}. ${meta.styleHint}. Keep the same core message, voice, and any personal details — just adapt length and tone.`
      );
      setEditedCaption(rewritten);
    } catch {
      // leave the caption as-is if the rewrite fails
    } finally {
      setOptimizingPlatform(null);
    }
  };

  const openAndPost = async (id: PlatformId) => {
    const meta = PLATFORMS[id];
    const handle = settings.handles[id];
    const url = meta.composeUrl ? meta.composeUrl(editedCaption, handle) : meta.profileUrl(handle);

    // On web, window.open must be called synchronously within the click
    // handler — calling it after an await gets silently blocked as a popup.
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    }

    await Clipboard.setStringAsync(editedCaption);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (Platform.OS !== "web") {
      Linking.openURL(url);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;
  const isDark = colors.background === "#080c14";

  // With multiple platforms selectable, prefer showing the handle for whichever
  // selected platform actually has one saved; fall back to the first selection.
  const previewPlatformId =
    selectedPlatforms.find((id) => settings.handles[id]) ?? selectedPlatforms[0];
  const previewHandleRaw = previewPlatformId ? settings.handles[previewPlatformId] : undefined;
  const previewHandle = previewHandleRaw ? `@${previewHandleRaw}` : "your.handle";

  const orderedPlatformIds: PlatformId[] = result
    ? [
        ...result.platforms.map((p) => p.id),
        ...ALL_PLATFORM_IDS.filter((id) => !result.platforms.some((p) => p.id === id)),
      ]
    : ALL_PLATFORM_IDS;

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
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[s.logoName, { color: colors.foreground }]}>
              Repurpose
              <Text style={{ color: "#818cf8" }}>.ai</Text>
            </Text>
            <Text style={[s.logoSub, { color: colors.mutedForeground }]}>
              AI CREATIVE ASSISTANT
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
            Hand us your shot.{"\n"}We'll write the post.
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Upload a photo or video — get a caption, hashtags, and where to
            post it, instantly.
          </Text>
        </View>

        {/* Voice hint */}
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={s.voiceHintRow}
          activeOpacity={0.7}
        >
          <Ionicons name="mic-outline" size={13} color="#818cf8" />
          <Text style={[s.voiceHintText, { color: colors.mutedForeground }]}>
            {settings.voice ? (
              <>
                Writing in your <Text style={{ color: "#818cf8" }}>{settings.voice}</Text> voice
              </>
            ) : (
              <>
                <Text style={{ color: "#818cf8" }}>Set your voice</Text> so captions sound like you
              </>
            )}
          </Text>
        </TouchableOpacity>

        {/* Upload Card */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            YOUR PHOTO(S) OR VIDEO
          </Text>

          {media.length > 0 ? (
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.thumbStrip}
              >
                {media.map((item) => (
                  <View key={item.id} style={s.thumbWrap}>
                    <Image
                      source={{ uri: item.previewUri }}
                      style={[s.thumbImage, { borderColor: colors.border }]}
                      contentFit="cover"
                    />
                    {item.kind === "video" && (
                      <View style={s.videoBadgeSmall}>
                        <Ionicons name="videocam" size={10} color="#fff" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.removeThumbBtn}
                      onPress={() => removeMediaItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {media[0].kind === "photo" && media.length < 10 && (
                  <TouchableOpacity
                    style={[
                      s.addThumbTile,
                      {
                        borderColor: isDark ? "#1e3a5f" : "#c7d2fe",
                        backgroundColor: isDark ? "#060a10" : "#f8f9ff",
                      },
                    ]}
                    onPress={addPhoto}
                    activeOpacity={0.7}
                    disabled={preparing}
                  >
                    {preparing ? (
                      <ActivityIndicator size="small" color="#818cf8" />
                    ) : (
                      <Ionicons name="add" size={22} color="#818cf8" />
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
              <TouchableOpacity onPress={pickInitialMedia} style={s.changeLinkRow}>
                <Ionicons name="swap-horizontal" size={13} color="#818cf8" />
                <Text style={[s.exampleLink, { color: "#818cf8" }]}>
                  Start over with a different file
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                s.dropZone,
                {
                  borderColor: isDark ? "#1e3a5f" : "#c7d2fe",
                  backgroundColor: isDark ? "#060a10" : "#f8f9ff",
                },
              ]}
              onPress={pickInitialMedia}
              activeOpacity={0.7}
              disabled={preparing}
            >
              {preparing ? (
                <>
                  <ActivityIndicator size="small" color="#818cf8" />
                  <Text style={[s.dropZoneText, { color: colors.mutedForeground }]}>
                    Preparing your file...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={26} color="#818cf8" />
                  <Text style={[s.dropZoneText, { color: colors.foreground }]}>
                    Tap to upload a photo or video
                  </Text>
                  <Text style={[s.dropZoneHint, { color: colors.mutedForeground }]}>
                    JPG, PNG, or MP4 — pick more than one to make a carousel
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Personal context */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
            ADD ANYTHING PERSONAL ABOUT THIS MOMENT (OPTIONAL)
          </Text>
          <TextInput
            value={personalContext}
            onChangeText={setPersonalContext}
            placeholder="e.g. this was my son's first march"
            placeholderTextColor={colors.mutedForeground}
            style={[
              s.contextInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: isDark ? "#060a10" : "#f8f9ff",
              },
            ]}
          />
        </View>

        {/* Generate Button */}
        {analyzing ? (
          <View style={[s.genBtn, { backgroundColor: isDark ? "#1a2540" : "#e8eaf5" }]}>
            <ActivityIndicator size="small" color="#818cf8" />
            <Text style={[s.genBtnText, { color: "#818cf8" }]}>
              Taking a look at your{" "}
              {media.length > 1 ? `${media.length} photos` : media[0]?.kind ?? "file"}...
            </Text>
          </View>
        ) : canGenerate ? (
          <TouchableOpacity onPress={analyze} activeOpacity={0.85}>
            <LinearGradient
              colors={["#6366f1", "#a855f7"]}
              style={s.genBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={[s.genBtnText, { color: "#fff" }]}>
                Analyze &amp; Write Post
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[s.genBtn, { backgroundColor: isDark ? "#1a2540" : "#e8eaf5" }]}>
            <Ionicons name="sparkles" size={18} color={isDark ? "#374151" : "#9ca3af"} />
            <Text style={[s.genBtnText, { color: isDark ? "#374151" : "#9ca3af" }]}>
              Analyze &amp; Write Post
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
        {result && media.length > 0 && (
          <View style={s.results}>
            <View style={[s.resultsDivider, { borderBottomColor: colors.border }]}>
              <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
                YOUR AI FRIEND SAYS
              </Text>
            </View>

            {/* What we see */}
            <View
              style={[
                s.resultCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.resultTitle}>
                <Ionicons name="eye-outline" size={15} color="#818cf8" />
                <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                  What We See
                </Text>
              </View>
              <View style={[s.resultBody, { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe", marginTop: 14 }]}>
                <Text
                  style={[
                    s.resultText,
                    { color: isDark ? "#d1d5db" : "#374151", fontStyle: "italic" },
                  ]}
                >
                  {result.summary}
                </Text>
              </View>
            </View>

            {/* Policy warnings */}
            <PolicyWarnings flags={policyFlags} />

            {/* Caption */}
            <View
              style={[
                s.resultCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.resultTitle}>
                <Ionicons name="chatbox-ellipses-outline" size={15} color="#818cf8" />
                <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                  Caption
                </Text>
              </View>
              <View style={[s.resultBody, { borderLeftColor: isDark ? "#1e3a5f" : "#c7d2fe", marginTop: 14, marginBottom: 16 }]}>
                <RemixableField
                  value={editedCaption}
                  onChange={setEditedCaption}
                  onRemix={(instruction) => callRemix(editedCaption, instruction)}
                  placeholder="Your caption..."
                />
              </View>
              <TouchableOpacity
                onPress={() => copyText("caption", editedCaption)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    copiedId === "caption"
                      ? ["#22c55e", "#22c55e"]
                      : ["#6366f1", "#a855f7"]
                  }
                  style={s.copyCaptionBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons
                    name={copiedId === "caption" ? "checkmark" : "copy-outline"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={s.copyCaptionBtnText}>
                    {copiedId === "caption" ? "Copied Caption" : "Copy Caption"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Hashtags */}
            <View
              style={[
                s.resultCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.resultHeader}>
                <View style={s.resultTitle}>
                  <Ionicons name="pricetags-outline" size={15} color="#818cf8" />
                  <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                    Hashtags
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.copyBtn,
                    {
                      backgroundColor: copiedId === "hashtags" ? "#22c55e" : "transparent",
                      borderColor: copiedId === "hashtags" ? "#22c55e" : colors.border,
                    },
                  ]}
                  onPress={() => copyText("hashtags", editedHashtags)}
                >
                  <Text
                    style={[
                      s.copyBtnText,
                      { color: copiedId === "hashtags" ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {copiedId === "hashtags" ? "COPIED" : "COPY"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={editedHashtags}
                onChangeText={setEditedHashtags}
                multiline
                placeholder="#yourtags"
                placeholderTextColor={colors.mutedForeground}
                style={[s.hashtagInput, { color: "#818cf8" }]}
              />
            </View>

            {/* Platforms */}
            <View
              style={[
                s.resultCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.resultTitle}>
                <Ionicons name="share-social-outline" size={15} color="#818cf8" />
                <Text style={[s.resultLabel, { color: isDark ? "#c7d2fe" : "#6366f1" }]}>
                  Where To Post
                </Text>
              </View>
              <Text style={[s.platformHint, { color: colors.mutedForeground }]}>
                Check every platform you're planning to post to — AI PICK marks
                what we think fits best. Tap the wand to optimize your caption
                for any of them.
              </Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                {orderedPlatformIds.map((id) => {
                  const meta = PLATFORMS[id];
                  const suggestion = result.platforms.find((p) => p.id === id);
                  const selected = selectedPlatforms.includes(id);
                  const optimizing = optimizingPlatform === id;
                  return (
                    <View key={id}>
                      <TouchableOpacity
                        style={[
                          s.formatRow,
                          {
                            backgroundColor: selected
                              ? isDark
                                ? "#0f1e35"
                                : "#eef0ff"
                              : "transparent",
                            borderColor: selected ? "#3b5bdb" : colors.border,
                          },
                        ]}
                        onPress={() => togglePlatform(id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={selected ? "checkbox" : "square-outline"}
                          size={19}
                          color={selected ? "#818cf8" : colors.mutedForeground}
                        />
                        <MaterialCommunityIcons
                          name={meta.icon as never}
                          size={18}
                          color="#818cf8"
                        />
                        <View style={s.formatMeta}>
                          <View style={s.formatLabelRow}>
                            <Text style={[s.formatLabel, { color: colors.foreground }]}>
                              {meta.label}
                            </Text>
                            {suggestion && (
                              <View
                                style={[
                                  s.aiPickBadge,
                                  { backgroundColor: isDark ? "#0f1e35" : "#eef0ff" },
                                ]}
                              >
                                <Text style={s.aiPickBadgeText}>AI PICK</Text>
                              </View>
                            )}
                          </View>
                          {suggestion && (
                            <Text style={[s.formatDesc, { color: colors.mutedForeground }]}>
                              {suggestion.reason}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      {selected && (
                        <View style={s.platformActionsRow}>
                          <TouchableOpacity
                            onPress={() => optimizeForPlatform(id)}
                            style={s.optimizeBtn}
                            activeOpacity={0.7}
                            disabled={optimizing}
                          >
                            {optimizing ? (
                              <ActivityIndicator size="small" color="#818cf8" />
                            ) : (
                              <Ionicons name="color-wand-outline" size={13} color="#818cf8" />
                            )}
                            <Text style={[s.openPostBtnText, { color: "#818cf8" }]}>
                              Optimize for {meta.label}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => openAndPost(id)}
                            style={s.openPostBtn}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="open-outline" size={14} color="#818cf8" />
                            <Text style={[s.openPostBtnText, { color: "#818cf8" }]}>
                              Open {meta.label} &amp; Post
                              {settings.handles[id] ? ` (@${settings.handles[id]})` : ""}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Preview */}
            <View style={[s.resultsDivider, { borderBottomColor: colors.border }]}>
              <Text style={[s.cardLabel, { color: colors.mutedForeground }]}>
                POST PREVIEW
              </Text>
            </View>
            <View
              style={[
                s.previewCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.previewHeaderRow}>
                <LinearGradient
                  colors={["#6366f1", "#a855f7"]}
                  style={s.previewAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={[s.previewHandle, { color: colors.foreground }]}>
                  {previewHandle}
                </Text>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={colors.mutedForeground}
                  style={{ marginLeft: "auto" }}
                />
              </View>
              <CarouselPreview uris={media.map((m) => m.previewUri)} />
              <View style={s.previewCaptionArea}>
                <Text style={[s.previewCaptionText, { color: colors.foreground }]}>
                  <Text style={{ fontFamily: "Inter_700Bold" }}>{previewHandle} </Text>
                  {editedCaption}
                </Text>
                <Text style={[s.previewHashtagText, { color: "#818cf8" }]}>
                  {editedHashtags}
                </Text>
              </View>
            </View>
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
    marginBottom: 20,
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
  headline: { marginBottom: 16 },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 8,
    fontFamily: "Inter_700Bold",
  },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  voiceHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  voiceHintText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 14 },
  cardLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 14,
    fontFamily: "Inter_600SemiBold",
  },
  contextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 34,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dropZoneText: {
    fontSize: 13.5,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  dropZoneHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  thumbStrip: { gap: 10, paddingRight: 4 },
  thumbWrap: { position: "relative", width: 76, height: 76 },
  thumbImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
  },
  videoBadgeSmall: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 20,
    padding: 3,
  },
  removeThumbBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addThumbTile: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  changeLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  exampleLink: { fontSize: 11, fontFamily: "Inter_500Medium" },
  formatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  formatMeta: { flex: 1 },
  formatLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  formatLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  aiPickBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  aiPickBadgeText: {
    fontSize: 8,
    letterSpacing: 0.5,
    color: "#818cf8",
    fontFamily: "Inter_600SemiBold",
  },
  formatDesc: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  platformHint: { fontSize: 10.5, fontFamily: "Inter_400Regular", marginTop: -6, lineHeight: 15 },
  platformActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 6,
    marginLeft: 4,
  },
  optimizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openPostBtnText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold" },
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
    marginBottom: 4,
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
  copyCaptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  copyCaptionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  resultBody: { borderLeftWidth: 2, paddingLeft: 14 },
  resultText: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  hashtagInput: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    padding: 0,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewAvatar: { width: 28, height: 28, borderRadius: 14 },
  previewHandle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  previewCaptionArea: { padding: 14, gap: 8 },
  previewCaptionText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  previewHashtagText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
});
