import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
const schema = z.object({ memberId: z.string().uuid(), hourlyRateWon: z.number().int().min(0).max(1_000_000) }).strict();
export async function PATCH(request: Request) {
  try {
    const me = await requireSession(true);
    const input = schema.parse(await request.json());
    const r = await db().from("members").update({ hourly_rate_won: input.hourlyRateWon }).eq("id", input.memberId).eq("household_id", me.householdId).select("id").maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw Object.assign(new Error("구성원을 찾을 수 없습니다."), { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
