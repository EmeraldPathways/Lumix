import { z } from "zod";

/** Original Panasonic Lumix DC-G9, not the DC-G9M2 / G9 II. */
export const G9_CAMERA_MODEL = "DC-G9" as const;

export const G9_PHOTO_STYLES = [
  "Standard",
  "Vivid",
  "Natural",
  "Monochrome",
  "L.Monochrome",
  "L.Monochrome D",
  "Scenery",
  "Portrait",
  "Cinelike D",
  "Cinelike V",
] as const;

export type G9PhotoStyle = (typeof G9_PHOTO_STYLES)[number];
export type G9FirmwareVersion = string;
export type G9MonochromeFilter = "Off" | "Yellow" | "Orange" | "Red" | "Green";
export type G9GrainEffect = "Off" | "Low" | "Standard" | "High";
export const G9_HIGHLIGHT_SHADOW_PRESETS = [
  "Standard",
  "Raise the contrast",
  "Lower the contrast",
  "Brighten dark areas",
] as const;
export type G9HighlightShadowPreset = (typeof G9_HIGHLIGHT_SHADOW_PRESETS)[number];

export const G9_WHITE_BALANCE_MODES = [
  "AWB",
  "AWBc",
  "AWBw",
  "Daylight",
  "Cloudy",
  "Shade",
  "Incandescent",
  "Flash",
  "White Set 1",
  "White Set 2",
  "White Set 3",
  "White Set 4",
  "Color Temperature",
] as const;

export type G9WhiteBalanceMode = (typeof G9_WHITE_BALANCE_MODES)[number];

const numericSetting = z.number().int().min(-5).max(5);

export const G9RecipeSettingsSchema = z
  .object({
    cameraModel: z.literal(G9_CAMERA_MODEL),
    photoStyle: z.enum(G9_PHOTO_STYLES),
    contrast: numericSetting,
    sharpness: numericSetting,
    noiseReduction: numericSetting,
    saturation: numericSetting.optional(),
    colorTone: numericSetting.optional(),
    filterEffect: z.enum(["Off", "Yellow", "Orange", "Red", "Green"]).optional(),
    grainEffect: z.enum(["Off", "Low", "Standard", "High"]).optional(),
    highlightShadow: z.enum(G9_HIGHLIGHT_SHADOW_PRESETS).optional(),
    whiteBalance: z.object({
      mode: z.enum(G9_WHITE_BALANCE_MODES),
      kelvin: z.number().int().min(2500).max(10000).multipleOf(100).optional(),
    }).strict(),
    suggestedExposureCompensation: z.number().min(-5).max(5).multipleOf(1 / 3).optional(),
  })
  .strict();

export type G9RecipeSettings = z.infer<typeof G9RecipeSettingsSchema>;

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
};

export type ControlDefinition = {
  id: string;
  label: string;
  kind: "range" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  minimumFirmware?: string;
  unit?: string;
};

const monochromeStyles: readonly G9PhotoStyle[] = [
  "Monochrome",
  "L.Monochrome",
  "L.Monochrome D",
];

const allStylesBeforeFirmware11 = G9_PHOTO_STYLES.filter(
  (style) => style !== "L.Monochrome D",
);

const control = (id: string, label: string): ControlDefinition => ({
  id,
  label,
  kind: "range",
  min: -5,
  max: 5,
  step: 1,
});

/** Compare dotted Panasonic firmware numbers without relying on lexicographic order. */
export function firmwareAtLeast(version: string, minimum: string): boolean {
  const parse = (value: string) => {
    const parts = value.trim().replace(/^v/i, "").split(".");
    if (!parts.length || parts.some((part) => !/^\d+$/.test(part))) return null;
    return parts.map(Number);
  };

  const currentParts = parse(version);
  const minimumParts = parse(minimum);
  if (!currentParts || !minimumParts) return false;

  const length = Math.max(currentParts.length, minimumParts.length);
  for (let index = 0; index < length; index += 1) {
    const current = currentParts[index] ?? 0;
    const required = minimumParts[index] ?? 0;
    if (current !== required) return current > required;
  }
  return true;
}

export function getSupportedPhotoStyles(firmwareVersion: G9FirmwareVersion): G9PhotoStyle[] {
  if (!firmwareAtLeast(firmwareVersion, "1.1")) return [...allStylesBeforeFirmware11];
  return [...G9_PHOTO_STYLES];
}

export function getPhotoStyleControls(
  style: string,
  firmwareVersion: G9FirmwareVersion,
): ControlDefinition[] {
  if (!getSupportedPhotoStyles(firmwareVersion).includes(style as G9PhotoStyle)) return [];

  const controls = [
    control("contrast", "Contrast"),
    control("sharpness", "Sharpness"),
    control("noiseReduction", "Noise Reduction"),
  ];

  if (monochromeStyles.includes(style as G9PhotoStyle)) {
    if (style !== "L.Monochrome D") {
      controls.push(control("colorTone", "Color Tone"));
      controls.push({
        id: "filterEffect",
        label: "Filter Effect",
        kind: "select",
        options: ["Off", "Yellow", "Orange", "Red", "Green"],
      });
    }
    if (firmwareAtLeast(firmwareVersion, "1.1")) {
      controls.push({
        id: "grainEffect",
        label: "Grain Effect",
        kind: "select",
        options: ["Off", "Low", "Standard", "High"],
        minimumFirmware: "1.1",
      });
    }
  } else {
    controls.push(control("saturation", "Saturation"));
  }

  return controls;
}

export function getWhiteBalanceModes(firmwareVersion: G9FirmwareVersion): G9WhiteBalanceMode[] {
  return G9_WHITE_BALANCE_MODES.filter(
    (mode) => mode !== "AWBw" || firmwareAtLeast(firmwareVersion, "2.0"),
  );
}

export function validateG9Recipe(
  recipe: unknown,
  firmwareVersion: G9FirmwareVersion,
): ValidationResult {
  const parsed = G9RecipeSettingsSchema.safeParse(recipe);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    };
  }

  const settings = parsed.data;
  const errors: ValidationIssue[] = [];
  const addIssue = (path: string, code: string, message: string) => {
    errors.push({ path, code, message });
  };
  const isMonochrome = monochromeStyles.includes(settings.photoStyle);

  if (settings.photoStyle === "L.Monochrome D" && !firmwareAtLeast(firmwareVersion, "1.1")) {
    addIssue("photoStyle", "firmware", "L.Monochrome D requires DC-G9 firmware 1.1 or later.");
  }

  if (settings.saturation !== undefined && isMonochrome) {
    addIssue("saturation", "incompatible", "Saturation is not available for this monochrome Photo Style.");
  }
  if ((settings.colorTone !== undefined || settings.filterEffect !== undefined) && !["Monochrome", "L.Monochrome"].includes(settings.photoStyle)) {
    addIssue("colorTone", "incompatible", "Color Tone and Filter Effect are available only with Monochrome or L.Monochrome.");
  }
  if (settings.grainEffect !== undefined) {
    if (!isMonochrome) {
      addIssue("grainEffect", "incompatible", "Grain Effect is available only with a monochrome Photo Style.");
    }
    if (!firmwareAtLeast(firmwareVersion, "1.1")) {
      addIssue("grainEffect", "firmware", "Grain Effect requires DC-G9 firmware 1.1 or later.");
    }
  }

  if (settings.whiteBalance.mode === "AWBw" && !firmwareAtLeast(firmwareVersion, "2.0")) {
    addIssue("whiteBalance.mode", "firmware", "AWBw requires DC-G9 firmware 2.0 or later.");
  }

  if (settings.whiteBalance.mode === "Color Temperature" && settings.whiteBalance.kelvin === undefined) {
    addIssue("whiteBalance.kelvin", "required", "Enter a colour temperature from 2500 K to 10000 K in 100 K steps.");
  } else if (settings.whiteBalance.mode !== "Color Temperature" && settings.whiteBalance.kelvin !== undefined) {
    addIssue("whiteBalance.kelvin", "incompatible", "Kelvin is set through Color Temperature white balance mode.");
  }

  return { valid: errors.length === 0, errors };
}
