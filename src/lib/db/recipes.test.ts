import { afterEach, describe, expect, it, vi } from "vitest";
import { seedRecipes } from "../recipes/seed";

vi.mock("server-only", () => ({}));
vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

import { neon } from "@neondatabase/serverless";
import { getPublishedRecipes } from "./recipes";

describe("published recipe repository", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("uses bundled experimental recipes when Neon is not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getPublishedRecipes()).resolves.toEqual(seedRecipes);
    expect(neon).not.toHaveBeenCalled();
  });

  it("reads published documents from Neon and validates each row", async () => {
    const query = vi.fn().mockResolvedValue([
      { document: seedRecipes[0] },
      { document: { ...seedRecipes[1], published: false } },
      { document: { slug: "broken" } },
    ]);
    vi.mocked(neon).mockReturnValue(query as never);
    vi.stubEnv("DATABASE_URL", "postgres://example.invalid/db");

    await expect(getPublishedRecipes()).resolves.toEqual([seedRecipes[0]]);
    expect(neon).toHaveBeenCalledWith("postgres://example.invalid/db");
  });

  it("does not hide a configured database failure behind seed data", async () => {
    const query = vi.fn().mockRejectedValue(new Error("database unavailable"));
    vi.mocked(neon).mockReturnValue(query as never);
    vi.stubEnv("DATABASE_URL", "postgres://example.invalid/db");

    await expect(getPublishedRecipes()).rejects.toThrow("database unavailable");
  });
});
