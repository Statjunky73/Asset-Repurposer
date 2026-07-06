import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type PolicyFlag = {
  category: string;
  platform: string;
  platformLabel: string;
  ruleTitle: string;
  ruleText: string;
  severity: "heads-up" | "likely-violation";
  source: "image" | "text";
};

const CATEGORY_LABELS: Record<string, string> = {
  nudity_sexual_content: "nudity and sexual content",
  graphic_violence: "graphic violence",
  hate_speech: "hate speech",
  copyrighted_material: "copyrighted material",
  age_restricted_substances: "age-restricted content",
  dangerous_activities: "dangerous activities",
  harassment_bullying: "harassment and bullying",
};

export function PolicyWarnings({ flags }: { flags: PolicyFlag[] }) {
  const colors = useColors();
  const isDark = colors.background === "#080c14";

  if (flags.length === 0) return null;

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: isDark ? "#241a06" : "#fffbeb",
          borderColor: isDark ? "#78350f" : "#fde68a",
        },
      ]}
    >
      <View style={s.header}>
        <Ionicons name="alert-circle" size={16} color="#f59e0b" />
        <Text style={[s.headerText, { color: isDark ? "#fcd34d" : "#92400e" }]}>Heads up!</Text>
      </View>

      {flags.map((flag, i) => {
        const subject = flag.source === "image" ? "This image" : "This caption";
        const categoryLabel = CATEGORY_LABELS[flag.category] ?? flag.category;
        return (
          <View
            key={`${flag.platform}-${flag.category}-${i}`}
            style={[s.flagRow, i > 0 && { borderTopColor: isDark ? "#78350f" : "#fde68a", borderTopWidth: 1 }]}
          >
            <Text style={[s.flagText, { color: isDark ? "#fde68a" : "#78350f" }]}>
              {subject} may not sit well with {flag.platformLabel}&rsquo;s guideline on {categoryLabel}.
            </Text>
            <Text style={[s.ruleTitle, { color: isDark ? "#fcd34d" : "#92400e" }]}>{flag.ruleTitle}</Text>
            <Text style={[s.ruleText, { color: isDark ? "#fde68a" : "#78350f" }]}>&ldquo;{flag.ruleText}&rdquo;</Text>
          </View>
        );
      })}

      <Text style={[s.footer, { color: isDark ? "#fde68a" : "#78350f" }]}>
        You can edit your content or choose a different platform — totally your call.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  flagRow: {
    paddingVertical: 8,
    gap: 4,
  },
  flagText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  ruleTitle: {
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  ruleText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  footer: {
    fontSize: 11.5,
    marginTop: 10,
    fontFamily: "Inter_500Medium",
  },
});
