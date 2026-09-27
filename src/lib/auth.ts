import "server-only";
import { cookies, headers } from "next/headers";
import { authClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { SessionMember } from "@/lib/types";

export const FAMILY_COOKIE = "ppanjjak_family";
export async function requireUser() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw Object.assign(new Error("카카오 로그인이 필요합니다."), { status: 401 });
  return data.user;
}
export async function selectFamily(id: string) {
  (await cookies()).set(FAMILY_COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
export async function requireSession(admin = false): Promise<SessionMember> {
  const user = await requireUser();
  const householdId = (await headers()).get("x-household-id") || (await cookies()).get(FAMILY_COOKIE)?.value;
  if (!householdId) throw Object.assign(new Error("가족 그룹을 선택해 주세요."), { status: 409 });
  const { data, error } = await db().from("members")
    .select("id, household_id, display_name, role, active")
    .eq("auth_user_id", user.id).eq("household_id", householdId).maybeSingle();
  if (error) throw error;
  if (!data?.active || (admin && data.role !== "admin")) throw Object.assign(new Error("이 가족 그룹에 접근할 권한이 없습니다."), { status: 403 });
  return { id: data.id, householdId: data.household_id, displayName: data.display_name, role: data.role };
}
export async function destroySession() {
  const client = await authClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw error;
  const store = await cookies();
  store.delete(FAMILY_COOKIE);
  store.delete("ppanjjak_session");
}
