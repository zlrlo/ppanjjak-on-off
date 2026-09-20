import { verify } from "@node-rs/argon2";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashIp } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const schema = z.object({ memberId: z.string().uuid(), pin: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const ipHash = hashIp(ip);
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const attempts = await db().from("login_attempts")
      .select("succeeded").eq("member_id", input.memberId).eq("ip_hash", ipHash)
      .gte("attempted_at", since).eq("succeeded", false);
    if (attempts.error) throw attempts.error;
    if (attempts.data.length >= 5) {
      throw Object.assign(new Error("로그인 시도가 많습니다. 15분 뒤 다시 시도해 주세요."), { status: 429 });
    }
    const member = await db().from("members")
      .select("id, pin_hash, active").eq("id", input.memberId).maybeSingle();
    if (member.error) throw member.error;
    const valid = Boolean(member.data?.active && await verify(member.data.pin_hash, input.pin));
    await db().from("login_attempts").insert({
      member_id: input.memberId,
      ip_hash: ipHash,
      succeeded: valid,
    });
    if (!valid) throw Object.assign(new Error("PIN이 올바르지 않습니다."), { status: 401 });
    await createSession(member.data!.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
