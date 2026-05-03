// Extracts frame thumbnails from a spritesheet using the Canvas API

export interface ExtractedFrame {
  index: number;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function extractFrames(
  imageUrl: string,
  frameWidth: number,
  frameHeight: number,
  margin = 0,
  spacing = 0,
): Promise<ExtractedFrame[]> {
  const img = await loadImage(imageUrl);
  const cols = Math.floor((img.width - margin) / (frameWidth + spacing));
  const rows = Math.floor((img.height - margin) / (frameHeight + spacing));

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  const frames: ExtractedFrame[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = margin + col * (frameWidth + spacing);
      const sy = margin + row * (frameHeight + spacing);

      ctx.clearRect(0, 0, frameWidth, frameHeight);
      ctx.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

      frames.push({
        index: row * cols + col,
        dataUrl: canvas.toDataURL('image/png'),
        x: sx, y: sy,
        width: frameWidth, height: frameHeight,
      });
    }
  }

  return frames;
}

export async function generateThumbnail(
  imageUrl: string,
  maxSize = 80,
): Promise<string> {
  const img = await loadImage(imageUrl);
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL('image/png');
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
