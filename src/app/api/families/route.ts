import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, selectFamily } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(1).max(30) }),
  z.object({ action: z.literal("select"), householdId: z.string().uuid() }),
]);
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    if (input.action === "create") {
      const result = await db().rpc("create_family", { p_user: user.id, p_name: input.name });
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    const result = await db().from("members").select("id").eq("auth_user_id", user.id).eq("household_id", input.householdId).eq("active", true).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw Object.assign(new Error("참여한 가족 그룹만 선택할 수 있습니다."), { status: 403 });
    await selectFamily(input.householdId);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
