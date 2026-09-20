import { hash } from "@node-rs/argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const createSchema = z.object({
  displayName: z.string().trim().min(1).max(20),
  pin: z.string().regex(/^\d{6}$/),
  role: z.enum(["admin", "member"]),
  hourlyRateWon: z.number().int().min(0).max(1_000_000),
});
const updateSchema = z.object({
  memberId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(20).optional(),
  pin: z.string().regex(/^\d{6}$/).optional(),
  role: z.enum(["admin", "member"]).optional(),
  hourlyRateWon: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const me = await requireSession(true);
    const input = createSchema.parse(await request.json());
    const result = await db().from("members").insert({
      household_id: me.householdId, display_name: input.displayName,
      pin_hash: await hash(input.pin), role: input.role, hourly_rate_won: input.hourlyRateWon,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const me = await requireSession(true);
    const input = updateSchema.parse(await request.json());
    const values: Record<string, unknown> = {};
    if (input.displayName !== undefined) values.display_name = input.displayName;
    if (input.pin !== undefined) values.pin_hash = await hash(input.pin);
    if (input.role !== undefined) values.role = input.role;
    if (input.hourlyRateWon !== undefined) values.hourly_rate_won = input.hourlyRateWon;
    if (input.active !== undefined) values.active = input.active;
    const result = await db().from("members").update(values).eq("id", input.memberId).eq("household_id", me.householdId);
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
