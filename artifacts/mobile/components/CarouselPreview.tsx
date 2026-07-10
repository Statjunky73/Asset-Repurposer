import { useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from "react-native";
import { OverlaidPhoto } from "@/components/OverlaidPhoto";
import type { PhotoOverlay } from "@/lib/overlay";

type CarouselItem = { uri: string; overlay?: PhotoOverlay | null };

export function CarouselPreview({ items }: { items: CarouselItem[] }) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(index, items.length - 1)));
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={s.root}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          style={{ width, aspectRatio: 1 }}
        >
          {items.map((item, i) => (
            <OverlaidPhoto key={i} uri={item.uri} overlay={item.overlay} width={width} />
          ))}
        </ScrollView>
      )}
      {items.length > 1 && (
        <View style={s.dotsRow} pointerEvents="none">
          {items.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.5)" },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { width: "100%", aspectRatio: 1 },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
