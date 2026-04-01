import type { PixelCrop } from 'react-image-crop';

export interface ImageDimensions {
  displayWidth: number;
  displayHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface EraseRect {
  id: string;
  x: number; // percentage of container width (0-100)
  y: number; // percentage of container height (0-100)
  width: number; // percentage of container width (0-100)
  height: number; // percentage of container height (0-100)
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    // createImageBitmap handles EXIF orientation; we replicate with CSS but for
    // canvas we need the natural dimensions, so use img.naturalWidth/Height.
    img.src = src;
  });
}

export function cropImage(
  image: HTMLImageElement,
  crop: PixelCrop,
  dims?: ImageDimensions
): HTMLCanvasElement {
  // Scale display-pixel crop coords to natural-pixel coords if dimensions provided.
  // react-image-crop emits PixelCrop in display-pixel space; drawImage needs
  // source coords in natural-pixel space.
  const scaleX = dims ? dims.naturalWidth / dims.displayWidth : 1;
  const scaleY = dims ? dims.naturalHeight / dims.displayHeight : 1;

  const sx = crop.x * scaleX;
  const sy = crop.y * scaleY;
  const sw = crop.width * scaleX;
  const sh = crop.height * scaleY;

  const outW = Math.max(1, Math.round(sw));
  const outH = Math.max(1, Math.round(sh));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

  return canvas;
}

/**
 * Erases (white-fills) the given percentage-based rectangles on the canvas.
 *
 * The rects are in percentage coordinates relative to the displayed image
 * container. We map them to pixel coordinates on the canvas using the canvas
 * dimensions as the reference, because the canvas represents the (possibly
 * cropped) image at its natural pixel dimensions.
 */
export function eraseAreas(
  canvas: HTMLCanvasElement,
  areas: EraseRect[]
): void {
  if (areas.length === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#ffffff';

  for (const area of areas) {
    const x = (area.x / 100) * canvas.width;
    const y = (area.y / 100) * canvas.height;
    const w = (area.width / 100) * canvas.width;
    const h = (area.height / 100) * canvas.height;
    ctx.fillRect(x, y, w, h);
  }
}

export function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType = 'image/jpeg'
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        resolve(new File([blob], filename, { type: mimeType }));
      },
      mimeType,
      0.92
    );
  });
}

/**
 * Transforms erase rects from full-image percentage space into crop-region
 * percentage space. Rects entirely outside the crop region are dropped;
 * rects partially overlapping are clipped.
 */
export function remapEraseToCropRegion(
  rects: EraseRect[],
  crop: PixelCrop,
  dims: ImageDimensions
): EraseRect[] {
  const cropXPct = (crop.x / dims.displayWidth) * 100;
  const cropYPct = (crop.y / dims.displayHeight) * 100;
  const cropWPct = (crop.width / dims.displayWidth) * 100;
  const cropHPct = (crop.height / dims.displayHeight) * 100;

  if (cropWPct <= 0 || cropHPct <= 0) return [];

  return rects
    .map((rect) => {
      const left = Math.max(rect.x, cropXPct);
      const top = Math.max(rect.y, cropYPct);
      const right = Math.min(rect.x + rect.width, cropXPct + cropWPct);
      const bottom = Math.min(rect.y + rect.height, cropYPct + cropHPct);

      const clippedW = right - left;
      const clippedH = bottom - top;

      if (clippedW <= 0 || clippedH <= 0) return null;

      return {
        ...rect,
        x: ((left - cropXPct) / cropWPct) * 100,
        y: ((top - cropYPct) / cropHPct) * 100,
        width: (clippedW / cropWPct) * 100,
        height: (clippedH / cropHPct) * 100,
      };
    })
    .filter((r): r is EraseRect => r !== null);
}

/**
 * Full pipeline: load image → optional crop → optional erase → File.
 * Returns a new File ready to send to the API.
 */
export async function processImage(
  file: File,
  preview: string,
  completedCrop: PixelCrop | null,
  eraseRects: EraseRect[],
  imageDims?: ImageDimensions
): Promise<File> {
  const image = await loadImage(preview);

  let canvas: HTMLCanvasElement;
  const hasCrop =
    completedCrop && completedCrop.width > 0 && completedCrop.height > 0;

  if (hasCrop) {
    canvas = cropImage(image, completedCrop, imageDims);
  } else {
    // No crop — draw the full image onto a canvas
    canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(image, 0, 0);
  }

  // When crop is active, remap erase rects from full-image space to crop-region space
  const effectiveEraseRects =
    hasCrop && imageDims
      ? remapEraseToCropRegion(eraseRects, completedCrop, imageDims)
      : eraseRects;

  eraseAreas(canvas, effectiveEraseRects);

  // Preserve original file extension/type where possible
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvasToFile(canvas, file.name, mimeType);
}
