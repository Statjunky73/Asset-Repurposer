import { useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { overlayTextStyle, type PhotoOverlay } from "@/lib/overlay";

type Props = {
  uri: string;
  overlay?: PhotoOverlay | null;
  width: number;
};

// Renders a photo with its text overlay (if any) positioned/sized exactly the
// way it will be exported. Reused by the thumbnail strip, the Post Preview
// carousel, and (indirectly, via overlayTextStyle) the overlay editor's
// draggable canvas, so what the user sees always matches what they get.
export function OverlaidPhoto({ uri, overlay, width }: Props) {
  const [textSize, setTextSize] = useState({ width: 0, height: 0 });

  return (
    <View style={{ width, aspectRatio: 1, overflow: "hidden" }}>
      <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      {!!overlay?.text && (
        <Text
          onLayout={(e) =>
            setTextSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          }
          numberOfLines={3}
          style={[
            s.overlayText,
            overlayTextStyle(overlay, width),
            {
              left: overlay.xPct * width - textSize.width / 2,
              top: overlay.yPct * width - textSize.height / 2,
              maxWidth: width * 0.9,
            },
          ]}
        >
          {overlay.text}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlayText: {
    position: "absolute",
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 3,
  },
});
