import { OVERLAY_REFERENCE_WIDTH, type PhotoOverlay } from "./overlay";

type ExportParams = {
  uri: string;
  overlay: PhotoOverlay | null;
  captureRef?: unknown;
};

type ExportResult = { success: boolean; message: string };

export async function exportOverlaidPhoto({ uri, overlay }: ExportParams): Promise<ExportResult> {
  try {
    const size = OVERLAY_REFERENCE_WIDTH;
    const img = await loadImage(uri);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    drawCover(ctx, img, size, size);
    if (overlay?.text) {
      drawOverlayText(ctx, overlay, size);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("Failed to export image");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "imagine-photo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: "Downloaded" };
  } catch {
    return { success: false, message: "Couldn't save the photo. Try again." };
  }
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = uri;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawOverlayText(ctx: CanvasRenderingContext2D, overlay: PhotoOverlay, size: number) {
  const fontSize = overlay.fontSize;
  ctx.font = `700 ${fontSize}px Inter, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x = overlay.xPct * size;
  const y = overlay.yPct * size;
  const maxWidth = size * 0.9;
  const lines = wrapText(ctx, overlay.text, maxWidth, 3);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  if (overlay.backgroundEnabled) {
    const paddingH = 14;
    const paddingV = 8;
    const textWidths = lines.map((l) => ctx.measureText(l).width);
    const boxWidth = Math.max(...textWidths) + paddingH * 2;
    const boxHeight = totalHeight + paddingV * 2;
    ctx.fillStyle = overlay.backgroundColor;
    roundRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 10);
    ctx.fill();
  }

  ctx.fillStyle = overlay.color;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
