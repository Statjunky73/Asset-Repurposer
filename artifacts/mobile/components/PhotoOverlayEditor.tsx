import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { exportOverlaidPhoto } from "@/lib/exportOverlay";
import {
  OVERLAY_COLOR_SWATCHES,
  OVERLAY_FONT_SIZE_STEPS,
  createDefaultOverlay,
  overlayTextStyle,
  type PhotoOverlay,
} from "@/lib/overlay";

type MediaItemLike = {
  id: string;
  previewUri: string;
  overlay?: PhotoOverlay | null;
};

type Props = {
  item: MediaItemLike | null;
  onSave: (overlay: PhotoOverlay | null) => void;
  onClose: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function PhotoOverlayEditor({ item, onSave, onClose }: Props) {
  const colors = useColors();
  const isDark = colors.background === "#080c14";

  const [draft, setDraft] = useState<PhotoOverlay>(() => item?.overlay ?? createDefaultOverlay(""));
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [textSize, setTextSize] = useState({ width: 0, height: 0 });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const canvasRef = useRef<View>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setDraft(item?.overlay ?? createDefaultOverlay(""));
    setSaveState("idle");
  }, [item?.id]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      dragStart.current = { x: draft.xPct, y: draft.yPct };
    })
    .onUpdate((e) => {
      if (!canvasWidth) return;
      setDraft((prev) => ({
        ...prev,
        xPct: clamp(dragStart.current.x + e.translationX / canvasWidth, 0.05, 0.95),
        yPct: clamp(dragStart.current.y + e.translationY / canvasWidth, 0.05, 0.95),
      }));
    });

  if (!item) return null;

  const commitAndClose = (overlay: PhotoOverlay | null) => {
    onSave(overlay);
    onClose();
  };

  const handleSave = async () => {
    setSaveState("saving");
    const result = await exportOverlaidPhoto({
      uri: item.previewUri,
      overlay: draft.text.trim() ? draft : null,
      captureRef: canvasRef,
    });
    setSaveState(result.success ? "done" : "error");
  };

  const swatchStep = OVERLAY_FONT_SIZE_STEPS.findIndex((s) => s === draft.fontSize);
  const currentStep = swatchStep === -1 ? 2 : swatchStep;

  return (
    <Modal visible animationType="slide" onRequestClose={() => commitAndClose(draft.text.trim() ? draft : null)}>
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Edit Photo Text</Text>
          <TouchableOpacity
            onPress={() => commitAndClose(draft.text.trim() ? draft : null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View
          ref={canvasRef}
          onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
          style={s.canvas}
        >
          <Image source={{ uri: item.previewUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          {!!draft.text && canvasWidth > 0 && (
            <GestureDetector gesture={panGesture}>
              <Text
                onLayout={(e) =>
                  setTextSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
                }
                numberOfLines={3}
                style={[
                  s.dragText,
                  overlayTextStyle(draft, canvasWidth),
                  {
                    left: draft.xPct * canvasWidth - textSize.width / 2,
                    top: draft.yPct * canvasWidth - textSize.height / 2,
                    maxWidth: canvasWidth * 0.9,
                  },
                ]}
              >
                {draft.text}
              </Text>
            </GestureDetector>
          )}
        </View>
        {!!draft.text && (
          <Text style={[s.dragHint, { color: colors.mutedForeground }]}>Drag the text to reposition it</Text>
        )}

        <TextInput
          value={draft.text}
          onChangeText={(text) => setDraft((prev) => ({ ...prev, text }))}
          placeholder="Add text for this photo..."
          placeholderTextColor={colors.mutedForeground}
          maxLength={80}
          style={[
            s.textInput,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: isDark ? "#060a10" : "#f8f9ff",
            },
          ]}
        />

        <View style={s.styleRow}>
          <Text style={[s.styleLabel, { color: colors.mutedForeground }]}>COLOR</Text>
          <View style={s.swatchRow}>
            {OVERLAY_COLOR_SWATCHES.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setDraft((prev) => ({ ...prev, color }))}
                style={[
                  s.swatch,
                  {
                    backgroundColor: color,
                    borderColor: draft.color === color ? "#818cf8" : colors.border,
                    borderWidth: draft.color === color ? 2 : 1,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={s.styleRow}>
          <Text style={[s.styleLabel, { color: colors.mutedForeground }]}>SIZE</Text>
          <View style={s.sizeStepper}>
            <TouchableOpacity
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  fontSize: OVERLAY_FONT_SIZE_STEPS[Math.max(0, currentStep - 1)],
                }))
              }
              style={[s.stepperBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="remove" size={16} color="#818cf8" />
            </TouchableOpacity>
            <Text style={[s.stepperValue, { color: colors.foreground }]}>{currentStep + 1}</Text>
            <TouchableOpacity
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  fontSize: OVERLAY_FONT_SIZE_STEPS[Math.min(OVERLAY_FONT_SIZE_STEPS.length - 1, currentStep + 1)],
                }))
              }
              style={[s.stepperBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="add" size={16} color="#818cf8" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={s.bgToggleRow}
          onPress={() => setDraft((prev) => ({ ...prev, backgroundEnabled: !prev.backgroundEnabled }))}
          activeOpacity={0.7}
        >
          <Ionicons
            name={draft.backgroundEnabled ? "checkbox" : "square-outline"}
            size={18}
            color={draft.backgroundEnabled ? "#818cf8" : colors.mutedForeground}
          />
          <Text style={[s.bgToggleText, { color: colors.foreground }]}>Background pill behind text</Text>
        </TouchableOpacity>

        <View style={s.actionsRow}>
          {(!!item.overlay || !!draft.text) && (
            <TouchableOpacity
              onPress={() => commitAndClose(null)}
              style={[s.removeBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
              <Text style={[s.removeBtnText, { color: colors.mutedForeground }]}>Remove overlay</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!draft.text.trim() || saveState === "saving"}
            style={[
              s.saveBtn,
              {
                backgroundColor: !draft.text.trim() ? (isDark ? "#1a2540" : "#e8eaf5") : "#6366f1",
              },
            ]}
            activeOpacity={0.85}
          >
            {saveState === "saving" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={saveState === "done" ? "checkmark" : "download-outline"}
                size={16}
                color={!draft.text.trim() ? colors.mutedForeground : "#fff"}
              />
            )}
            <Text
              style={[
                s.saveBtnText,
                { color: !draft.text.trim() ? colors.mutedForeground : "#fff" },
              ]}
            >
              {saveState === "done" ? "Saved" : saveState === "error" ? "Try again" : "Save Photo"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  canvas: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  dragText: {
    position: "absolute",
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 3,
  },
  dragHint: { fontSize: 11, textAlign: "center", marginTop: 8, fontFamily: "Inter_400Regular" },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    marginTop: 14,
    fontFamily: "Inter_400Regular",
  },
  styleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  styleLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  swatchRow: { flexDirection: "row", gap: 8 },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  sizeStepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 14, textAlign: "center" },
  bgToggleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  bgToggleText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 20,
    gap: 12,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  removeBtnText: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 13,
  },
  saveBtnText: { fontSize: 13.5, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
