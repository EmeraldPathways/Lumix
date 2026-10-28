import { describe, expect, it } from "vitest";
import { detectApprovedImageType, RecipeImageMetadataSchema } from "./image-policy";

describe("administrator image upload policy", () => {
  it("recognizes a JPEG signature without relying on the filename", () => {
    expect(detectApprovedImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("recognizes PNG and WebP signatures", () => {
    expect(detectApprovedImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectApprovedImageType(new TextEncoder().encode("RIFF0000WEBP"))).toBe("image/webp");
  });

  it("rejects unsupported and truncated content", () => {
    expect(detectApprovedImageType(new TextEncoder().encode("not an image"))).toBeUndefined();
    expect(detectApprovedImageType(new Uint8Array([0xff, 0xd8]))).toBeUndefined();
  });

  it("requires control and result photographs to be marked as a paired G9 comparison", () => {
    const metadata = { recipeSlug: "test-look", imageType: "control", authenticityType: "g9-capture", photographer: "A. Photographer", licence: "CC BY 4.0", confirmPublicAsset: true as const };
    expect(RecipeImageMetadataSchema.safeParse(metadata).success).toBe(false);
    expect(RecipeImageMetadataSchema.safeParse({ ...metadata, authenticityType: "controlled-pair", pairId: "pair-01" }).success).toBe(true);
    expect(RecipeImageMetadataSchema.safeParse({ ...metadata, authenticityType: "controlled-pair", pairId: "pair-01", confirmPublicAsset: false }).success).toBe(false);
  });
});
