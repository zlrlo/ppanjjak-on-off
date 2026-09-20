import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { calculatePayroll, monthBounds } from "@/lib/payroll";

const schema = z.object({
  memberId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  action: z.enum(["pay", "reopen"]),
});

export async function POST(request: Request) {
  try {
    const me = await requireSession(true);
    const input = schema.parse(await request.json());
    const supabase = db();
    if (input.action === "reopen") {
      const result = await supabase.from("settlements").update({ status: "unpaid", paid_at: null, paid_by: null,
        paid_minutes: null, paid_amount_won: null }).eq("household_id", me.householdId)
        .eq("member_id", input.memberId).eq("year_month", input.month);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }
    const bounds = monthBounds(input.month);
    const shifts = await supabase.from("shifts").select("id, member_id, started_at, ended_at, hourly_rate_snapshot_won")
      .eq("household_id", me.householdId).eq("member_id", input.memberId)
      .lt("started_at", bounds.end.toISOString()).or(`ended_at.is.null,ended_at.gt.${bounds.start.toISOString()}`);
    if (shifts.error) throw shifts.error;
    if (shifts.data.some((shift) => shift.ended_at === null)) {
      throw Object.assign(new Error("진행 중인 근무가 있어 정산할 수 없습니다."), { status: 409 });
    }
    const row = calculatePayroll(shifts.data, input.month).get(input.memberId) ?? { totalMinutes: 0, amountWon: 0 };
    const result = await supabase.from("settlements").upsert({
      household_id: me.householdId, member_id: input.memberId, year_month: input.month,
      status: "paid", paid_minutes: row.totalMinutes, paid_amount_won: row.amountWon,
      paid_at: new Date().toISOString(), paid_by: me.id,
    }, { onConflict: "household_id,member_id,year_month" });
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
