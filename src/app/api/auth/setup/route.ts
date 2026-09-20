import { timingSafeEqual } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const schema = z.object({
  setupSecret: z.string().min(12),
  householdName: z.string().trim().min(1).max(30),
  displayName: z.string().trim().min(1).max(20),
  pin: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const expected = process.env.SETUP_SECRET ?? "";
    const a = Buffer.from(input.setupSecret);
    const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw Object.assign(new Error("설정 비밀값이 올바르지 않습니다."), { status: 403 });
    }
    const existing = await db().from("households").select("id", { count: "exact", head: true });
    if ((existing.count ?? 0) > 0) throw Object.assign(new Error("이미 초기 설정이 완료되었습니다."), { status: 409 });

    const household = await db().from("households").insert({ name: input.householdName }).select("id").single();
    if (household.error) throw household.error;
    const member = await db().from("members").insert({
      household_id: household.data.id,
      display_name: input.displayName,
      role: "admin",
      pin_hash: await hash(input.pin),
    }).select("id").single();
    if (member.error) throw member.error;
    const baby = await db().from("baby_status").insert({
      household_id: household.data.id,
      updated_by: member.data.id,
    });
    if (baby.error) throw baby.error;
    await createSession(member.data.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
