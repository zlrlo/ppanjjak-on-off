// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), getCookie: vi.fn(), getHeader: vi.fn(), single: vi.fn(), eq: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ authClient: async () => ({ auth: { getUser: mock.user } }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mock.getCookie }), headers: async () => ({ get: mock.getHeader }) }));
vi.mock("@/lib/db", () => ({ db: () => ({ from: mock.from }) }));
import { requireSession } from "./auth";
describe("verified family authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.user.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
    mock.getCookie.mockReturnValue({ value: "cookie-family" });
    const query = { select: () => query, eq: mock.eq, maybeSingle: mock.single };
    mock.from.mockReturnValue(query); mock.eq.mockReturnValue(query);
    mock.single.mockResolvedValue({ data: { id: "member", household_id: "cookie-family", display_name: "Family", role: "member", active: true }, error: null });
  });
  it("rejects unverified authentication before accessing database", async () => {
    mock.user.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    await expect(requireSession()).rejects.toMatchObject({ status: 401 });
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("binds membership to verified user and screen's family, not a different tab's cookie", async () => {
    mock.getHeader.mockReturnValue("screen-family");
    await requireSession();
    expect(mock.eq).toHaveBeenCalledWith("auth_user_id", "verified-user");
    expect(mock.eq).toHaveBeenCalledWith("household_id", "screen-family");
  });
  it("rejects users outside the selected family", async () => {
    mock.single.mockResolvedValue({ data: null, error: null });
    await expect(requireSession()).rejects.toMatchObject({ status: 403 });
  });
  it("rejects inactive membership", async () => {
    mock.single.mockResolvedValue({ data: { active: false, role: "admin" }, error: null });
    await expect(requireSession()).rejects.toMatchObject({ status: 403 });
  });
  it("rejects ordinary members on admin routes", async () => {
    await expect(requireSession(true)).rejects.toMatchObject({ status: 403 });
  });
  it("requires a group selection", async () => {
    mock.getCookie.mockReturnValue(undefined);
    await expect(requireSession()).rejects.toMatchObject({ status: 409 });
  });
});
