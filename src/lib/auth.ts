import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { SessionMember } from "@/lib/types";

const COOKIE_NAME = "ppanjjak_session";
const SESSION_DAYS = 30;

function tokenHash(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET이 설정되지 않았습니다.");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function hashIp(ip: string) {
  return tokenHash(`ip:${ip}`);
}

export async function createSession(memberId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const result = await db().from("sessions").insert({
    member_id: memberId,
    token_hash: tokenHash(token),
    expires_at: expiresAt.toISOString(),
  });
  if (result.error) throw new Error(result.error.message);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await db().from("sessions").delete().eq("token_hash", tokenHash(token));
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionMember | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const { data, error } = await db()
    .from("sessions")
    .select("id, expires_at, member:members(id, household_id, display_name, role, active)")
    .eq("token_hash", tokenHash(token))
    .maybeSingle();
  if (error || !data || new Date(data.expires_at) <= new Date()) return null;
  const raw = Array.isArray(data.member) ? data.member[0] : data.member;
  if (!raw || !raw.active) return null;
  void db().from("sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return {
    id: raw.id,
    householdId: raw.household_id,
    displayName: raw.display_name,
    role: raw.role,
  };
}

export async function requireSession(admin = false) {
  const member = await getSession();
  if (!member) throw Object.assign(new Error("로그인이 필요합니다."), { status: 401 });
  if (admin && member.role !== "admin") {
    throw Object.assign(new Error("부모 관리자만 사용할 수 있습니다."), { status: 403 });
  }
  return member;
}
