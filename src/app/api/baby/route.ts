import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sleep"), sleeping: z.boolean() }),
  z.object({ action: z.literal("feed") }),
]);

export async function POST(request: Request) {
  try {
    const me = await requireSession();
    const input = schema.parse(await request.json());
    const now = new Date().toISOString();
    const values = input.action === "sleep"
      ? { is_sleeping: input.sleeping, sleep_changed_at: now, updated_at: now, updated_by: me.id }
      : { last_fed_at: now, updated_at: now, updated_by: me.id };
    const result = await db().from("baby_status").update(values).eq("household_id", me.householdId);
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
