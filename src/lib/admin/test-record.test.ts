import { describe, expect, it } from "vitest";
import { hasControlledEvidencePair, RecipeTestRecordSchema } from "./test-record";

const validTest = {
  cameraModel: "DC-G9",
  firmwareVersion: "2.7",
  lens: "Lumix G 25mm F1.7",
  lightingConditions: "Open shade beside a north-facing window.",
  whiteBalance: "Daylight, centred fine adjustment",
  exposureDetails: "Aperture priority, ISO 200, +1/3 EV",
  findings: "The restrained contrast holds highlight detail and skin remains natural in this matched scene.",
  evidence: {
    controlJpegUrl: "https://images.example.test/control.jpg",
    resultJpegUrl: "https://images.example.test/result.jpg",
    sameScenePair: true,
    photographer: "A. Photographer",
  },
  verificationStatus: "camera-verified",
  testedAt: "2026-10-28T12:00:00.000Z",
};

describe("physical G9 camera test records", () => {
  it("accepts an original-G9 same-scene evidence pair", () => {
    expect(RecipeTestRecordSchema.safeParse(validTest).success).toBe(true);
  });

  it("rejects G9 II evidence for this catalogue", () => {
    expect(RecipeTestRecordSchema.safeParse({ ...validTest, cameraModel: "DC-G9M2" }).success).toBe(false);
  });

  it("rejects a camera-verified badge without a controlled same-scene pair", () => {
    const invalid = { ...validTest, evidence: { ...validTest.evidence, sameScenePair: false } };
    expect(RecipeTestRecordSchema.safeParse(invalid).success).toBe(false);
  });

  it("only accepts control and result URLs uploaded with the same controlled-pair ID", () => {
    const images = [
      { imageUrl: validTest.evidence.controlJpegUrl, imageType: "control", authenticityType: "controlled-pair", metadata: { pairId: "pair-7" } },
      { imageUrl: validTest.evidence.resultJpegUrl, imageType: "experimental-result", authenticityType: "controlled-pair", metadata: { pairId: "pair-7" } },
    ] as const;
    expect(hasControlledEvidencePair(images, validTest.evidence)).toBe(true);
    expect(hasControlledEvidencePair(images.map((item, index) => index === 1 ? { ...item, metadata: { pairId: "pair-8" } } : item), validTest.evidence)).toBe(false);
  });
});
