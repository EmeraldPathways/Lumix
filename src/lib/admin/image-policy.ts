import { z } from "zod";

export const MAX_EDITORIAL_IMAGE_BYTES = 3 * 1024 * 1024;
export const APPROVED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const RecipeImageMetadataSchema = z.object({
  recipeSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  imageType: z.enum(["hero", "camera-jpeg", "control", "experimental-result"]),
  authenticityType: z.enum(["illustrative", "g9-capture", "controlled-pair"]),
  photographer: z.string().trim().min(2).max(120),
  licence: z.string().trim().min(2).max(240),
  confirmPublicAsset: z.literal(true),
  firmwareVersion: z.string().trim().max(20).optional().default(""),
  lens: z.string().trim().max(120).optional().default(""),
  whiteBalance: z.string().trim().max(120).optional().default(""),
  exposureDetails: z.string().trim().max(240).optional().default(""),
  lightingConditions: z.string().trim().max(240).optional().default(""),
  pairId: z.string().trim().max(80).optional().default(""),
}).strict().superRefine((metadata, context) => {
  const pairImage = metadata.imageType === "control" || metadata.imageType === "experimental-result";
  if (pairImage && (metadata.authenticityType !== "controlled-pair" || !metadata.pairId)) {
    context.addIssue({ code: "custom", path: ["pairId"], message: "Control and result photographs need a shared controlled-pair ID and authenticity label." });
  }
  if (metadata.imageType === "camera-jpeg" && metadata.authenticityType !== "g9-capture") {
    context.addIssue({ code: "custom", path: ["authenticityType"], message: "A camera JPEG must be labelled as an original G9 capture." });
  }
  if (metadata.authenticityType === "controlled-pair" && !pairImage) {
    context.addIssue({ code: "custom", path: ["imageType"], message: "Controlled-pair authenticity is only for control and experimental-result images." });
  }
});

export type RecipeImageMetadataInput = z.infer<typeof RecipeImageMetadataSchema>;

export function detectApprovedImageType(bytes: Uint8Array): (typeof APPROVED_IMAGE_TYPES)[number] | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return undefined;
}
