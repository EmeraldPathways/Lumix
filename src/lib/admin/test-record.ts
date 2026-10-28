import { z } from "zod";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "Evidence URLs must use HTTPS.");

export const RecipeTestRecordSchema = z.object({
  cameraModel: z.literal("DC-G9"),
  firmwareVersion: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/),
  lens: z.string().trim().min(2).max(120),
  lightingConditions: z.string().trim().min(10).max(300),
  whiteBalance: z.string().trim().min(2).max(160),
  exposureDetails: z.string().trim().min(2).max(200),
  findings: z.string().trim().min(20).max(1000),
  evidence: z.object({
    controlJpegUrl: httpsUrl,
    resultJpegUrl: httpsUrl,
    sameScenePair: z.literal(true),
    photographer: z.string().trim().min(2).max(120),
  }).strict(),
  verificationStatus: z.enum(["community-tested", "camera-verified", "rejected"]),
  testedAt: z.string().datetime(),
}).strict();

export type RecipeTestRecord = z.infer<typeof RecipeTestRecordSchema>;

type UploadedEvidenceImage = {
  imageUrl: string;
  imageType: string;
  authenticityType: string;
  metadata: unknown;
};

export function hasControlledEvidencePair(images: ReadonlyArray<UploadedEvidenceImage>, evidence: Pick<RecipeTestRecord["evidence"], "controlJpegUrl" | "resultJpegUrl">): boolean {
  const control = images.find((image) => image.imageUrl === evidence.controlJpegUrl && image.imageType === "control");
  const result = images.find((image) => image.imageUrl === evidence.resultJpegUrl && image.imageType === "experimental-result");
  if (!control || !result || control.authenticityType !== "controlled-pair" || result.authenticityType !== "controlled-pair") return false;
  const controlPairId = readPairId(control.metadata);
  const resultPairId = readPairId(result.metadata);
  return Boolean(controlPairId && resultPairId && controlPairId === resultPairId);
}

function readPairId(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null || !("pairId" in metadata)) return undefined;
  const pairId = metadata.pairId;
  return typeof pairId === "string" && pairId.trim() ? pairId.trim() : undefined;
}
