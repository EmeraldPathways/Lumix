import { describe, expect, it } from "vitest";
import { formatSigned } from "./format";

describe("formatSigned", () => {
  it("keeps integer camera controls intact", () => {
    expect(formatSigned(-2)).toBe("-2");
    expect(formatSigned(2)).toBe("+2");
    expect(formatSigned(0)).toBe("0");
  });

  it("rounds fractional exposure suggestions for display", () => {
    expect(formatSigned(1 / 3)).toBe("+0.3");
    expect(formatSigned(-1 / 3)).toBe("-0.3");
  });
});
