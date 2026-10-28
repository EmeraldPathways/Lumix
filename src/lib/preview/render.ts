import type { G9RecipeSettings } from "../camera/g9";

type PreviewSettings = G9RecipeSettings;
const monochromeStyles = ["Monochrome", "L.Monochrome", "L.Monochrome D"];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function whiteBalanceGains(settings: PreviewSettings): [number, number, number] {
  const whiteBalance = settings.whiteBalance;
  const presets: Record<string, number> = { AWB: 5600, AWBc: 5200, AWBw: 6000, Daylight: 5500, Cloudy: 6500, Shade: 7500, Incandescent: 3000, Flash: 5600 };
  const kelvin = whiteBalance.mode === "Color Temperature" ? whiteBalance.kelvin ?? 5600 : presets[whiteBalance.mode] ?? 5600;
  const warmth = clamp((kelvin - 5600) / 4400, -1, 1);
  return [1 + Math.max(0, warmth) * 0.14, 1 + Math.abs(warmth) * 0.018, 1 + Math.max(0, -warmth) * 0.16];
}

function monochromeLuminance(red: number, green: number, blue: number, effect: PreviewSettings["filterEffect"]): number {
  const weights: Record<string, [number, number, number]> = {
    Off: [0.2126, 0.7152, 0.0722],
    Yellow: [0.34, 0.54, 0.12],
    Orange: [0.46, 0.47, 0.07],
    Red: [0.62, 0.32, 0.06],
    Green: [0.18, 0.72, 0.1],
  };
  const [r, g, b] = weights[effect ?? "Off"];
  return red * r + green * g + blue * b;
}

function grainNoise(index: number, seed: number): number {
  const raw = Math.sin((index + 1) * 127.1 + seed * 311.7) * 43758.5453;
  return (raw - Math.floor(raw)) * 2 - 1;
}

/**
 * Browser-preview-only pixel treatment. It deliberately approximates visible
 * colour/tonal direction and is not Panasonic's internal JPEG pipeline.
 */
export function transformG9PreviewPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  settings: PreviewSettings,
  exposureEV = settings.suggestedExposureCompensation ?? 0,
  seed = 0,
): Uint8ClampedArray {
  if (source.length !== width * height * 4) throw new Error("Pixel buffer length does not match the supplied dimensions.");

  const output = new Uint8ClampedArray(source.length);
  const monochrome = monochromeStyles.includes(settings.photoStyle);
  const gains = whiteBalanceGains(settings);
  const exposure = 2 ** exposureEV;
  const presetContrast = settings.highlightShadow === "Raise the contrast" ? 0.1 : settings.highlightShadow === "Lower the contrast" ? -0.1 : 0;
  const contrast = clamp(1 + settings.contrast * 0.055 + presetContrast, 0.5, 1.8);
  const saturation = monochrome ? 0 : clamp(1 + (settings.saturation ?? 0) * 0.09, 0, 1.8);
  const grainAmount = monochrome ? ({ Off: 0, Low: 4, Standard: 8, High: 13 } as const)[settings.grainEffect ?? "Off"] : 0;
  const tone = (settings.colorTone ?? 0) / 5;

  for (let offset = 0; offset < source.length; offset += 4) {
    let red = source[offset] * gains[0] * exposure;
    let green = source[offset + 1] * gains[1] * exposure;
    let blue = source[offset + 2] * gains[2] * exposure;

    red = ((red / 255 - 0.5) * contrast + 0.5) * 255;
    green = ((green / 255 - 0.5) * contrast + 0.5) * 255;
    blue = ((blue / 255 - 0.5) * contrast + 0.5) * 255;

    if (settings.highlightShadow === "Brighten dark areas") {
      red += ((255 - red) ** 2 / 255) * 0.13;
      green += ((255 - green) ** 2 / 255) * 0.13;
      blue += ((255 - blue) ** 2 / 255) * 0.13;
    }

    if (monochrome) {
      const luminance = monochromeLuminance(red, green, blue, settings.filterEffect);
      red = luminance + Math.max(0, -tone) * 10;
      green = luminance + Math.max(0, -tone) * 7;
      blue = luminance + Math.max(0, tone) * 15;
      const noise = grainNoise(offset / 4, seed) * grainAmount;
      red += noise;
      green += noise;
      blue += noise;
    } else {
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      red = luminance + (red - luminance) * saturation;
      green = luminance + (green - luminance) * saturation;
      blue = luminance + (blue - luminance) * saturation;
    }

    output[offset] = clamp(red, 0, 255);
    output[offset + 1] = clamp(green, 0, 255);
    output[offset + 2] = clamp(blue, 0, 255);
    output[offset + 3] = source[offset + 3];
  }

  return output;
}

function imageDimensions(source: CanvasImageSource): { width: number; height: number } {
  const sized = source as unknown as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number };
  return {
    width: sized.naturalWidth || sized.videoWidth || sized.width || 0,
    height: sized.naturalHeight || sized.videoHeight || sized.height || 0,
  };
}

/** Draws a downscaled source into a canvas and applies the illustrative pixel transform locally. */
export function renderG9PreviewCanvas(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  settings: PreviewSettings,
  exposureEV = settings.suggestedExposureCompensation ?? 0,
  maximumEdge = 1280,
): void {
  const dimensions = imageDimensions(image);
  if (!dimensions.width || !dimensions.height) throw new Error("The preview image is not ready.");
  const scale = Math.min(1, maximumEdge / Math.max(dimensions.width, dimensions.height));
  const width = Math.max(1, Math.round(dimensions.width * scale));
  const height = Math.max(1, Math.round(dimensions.height * scale));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas rendering is not available in this browser.");
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  imageData.data.set(transformG9PreviewPixels(imageData.data, width, height, settings, exposureEV));
  context.putImageData(imageData, 0, 0);
}
