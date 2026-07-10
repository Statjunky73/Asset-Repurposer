export type PhotoOverlay = {
  text: string;
  xPct: number; // 0-1, horizontal center, relative to image width
  yPct: number; // 0-1, vertical center, relative to image height
  fontSize: number; // px at OVERLAY_REFERENCE_WIDTH; scaled proportionally at render/export time
  color: string;
  backgroundEnabled: boolean;
  backgroundColor: string;
};

// Overlay geometry (position, font size) is authored against this reference
// width, then scaled to whatever size the photo is actually rendered/exported at.
export const OVERLAY_REFERENCE_WIDTH = 1080;

export const OVERLAY_COLOR_SWATCHES = [
  "#ffffff",
  "#000000",
  "#fbbf24",
  "#f87171",
  "#818cf8",
  "#34d399",
];

export const OVERLAY_FONT_SIZE_STEPS = [40, 52, 64, 80, 100, 120];

export function createDefaultOverlay(text: string): PhotoOverlay {
  return {
    text,
    xPct: 0.5,
    yPct: 0.82,
    fontSize: 64,
    color: "#ffffff",
    backgroundEnabled: true,
    backgroundColor: "rgba(0,0,0,0.55)",
  };
}

// Shared by OverlaidPhoto (static render) and PhotoOverlayEditor (draggable
// render) so the two never visually drift apart.
export function overlayTextStyle(overlay: PhotoOverlay, width: number) {
  const scale = width / OVERLAY_REFERENCE_WIDTH;
  return {
    fontSize: overlay.fontSize * scale,
    color: overlay.color,
    backgroundColor: overlay.backgroundEnabled ? overlay.backgroundColor : "transparent",
    paddingHorizontal: overlay.backgroundEnabled ? 14 * scale : 0,
    paddingVertical: overlay.backgroundEnabled ? 8 * scale : 0,
    borderRadius: overlay.backgroundEnabled ? 10 * scale : 0,
  };
}
