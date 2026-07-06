import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRemix: (instruction: string) => Promise<string>;
  textStyle?: StyleProp<TextStyle>;
  placeholder?: string;
  remixLabel?: string;
  hideInput?: boolean;
};

export function RemixableField({
  value,
  onChange,
  onRemix,
  textStyle,
  placeholder,
  remixLabel = "Remix",
  hideInput = false,
}: Props) {
  const colors = useColors();
  const isDark = colors.background === "#080c14";
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [showPrompt, setShowPrompt] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [remixing, setRemixing] = useState(false);
  const [error, setError] = useState("");

  const submitRemix = async () => {
    if (!instruction.trim() || remixing) return;
    setRemixing(true);
    setError("");
    try {
      const result = await onRemix(instruction.trim());
      onChange(result);
      setShowPrompt(false);
      setInstruction("");
    } catch {
      setError("Couldn't remix that. Try again.");
    } finally {
      setRemixing(false);
    }
  };

  return (
    <View>
      {!hideInput && (
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
          style={[
            s.input,
            { color: isDark ? "#d1d5db" : "#374151", height: height ? Math.max(height, 22) : undefined },
            textStyle,
          ]}
        />
      )}

      {showPrompt ? (
        <View style={s.remixRow}>
          <TextInput
            value={instruction}
            onChangeText={setInstruction}
            placeholder="e.g. make it funnier, add my dog"
            placeholderTextColor={colors.mutedForeground}
            editable={!remixing}
            onSubmitEditing={submitRemix}
            style={[
              s.remixInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: isDark ? "#060a10" : "#f8f9ff",
              },
            ]}
          />
          {remixing ? (
            <ActivityIndicator size="small" color="#818cf8" style={{ marginLeft: 8 }} />
          ) : (
            <>
              <TouchableOpacity onPress={submitRemix} style={s.remixIconBtn}>
                <Ionicons name="arrow-forward-circle" size={22} color="#818cf8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowPrompt(false);
                  setInstruction("");
                  setError("");
                }}
                style={s.remixIconBtn}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <TouchableOpacity onPress={() => setShowPrompt(true)} style={s.remixTrigger} activeOpacity={0.7}>
          <Ionicons name="color-wand-outline" size={12} color="#818cf8" />
          <Text style={[s.remixTriggerText, { color: "#818cf8" }]}>{remixLabel}</Text>
        </TouchableOpacity>
      )}

      {!!error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  input: {
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  remixTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  remixTriggerText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  remixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  remixInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
  },
  remixIconBtn: { padding: 2 },
  errorText: {
    color: "#fca5a5",
    fontSize: 11,
    marginTop: 6,
    fontFamily: "Inter_400Regular",
  },
});
