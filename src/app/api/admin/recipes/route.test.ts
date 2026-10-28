import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedRecipes } from "@/lib/recipes/seed";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/admin/access", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db/admin", () => ({ createAdminRecipe: mocks.create, listAdminRecipes: mocks.list }));

import { POST } from "./route";

describe("admin recipe API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ actor: { userId: "admin-1", email: "admin@example.com" } });
    mocks.create.mockImplementation(async (recipe) => recipe);
  });

  it("rejects an unauthenticated write before reaching the repository", async () => {
    mocks.authorize.mockResolvedValue({ response: Response.json({ error: "Sign in" }, { status: 401 }) });
    const response = await POST(new Request("http://localhost/api/admin/recipes", { method: "POST", body: JSON.stringify({ recipe: seedRecipes[0] }) }));
    expect(response.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects unsupported original-G9 values before persistence", async () => {
    const recipe = { ...seedRecipes[0], settings: { ...seedRecipes[0].settings, contrast: 9 } };
    const response = await POST(new Request("http://localhost/api/admin/recipes", { method: "POST", body: JSON.stringify({ recipe }) }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a validated recipe for an authorized administrator", async () => {
    const response = await POST(new Request("http://localhost/api/admin/recipes", { method: "POST", body: JSON.stringify({ recipe: seedRecipes[0] }) }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(seedRecipes[0], { userId: "admin-1", email: "admin@example.com" });
  });
});
