import { NextResponse } from "next/server";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { monthBounds } from "@/lib/payroll";

const postSchema = z.object({ action: z.enum(["clockIn", "clockOut"]) });
const patchSchema = z.object({
  shiftId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  reason: z.string().trim().min(2).max(200),
});

export async function POST(request: Request) {
  try {
    const me = await requireSession();
    const { action } = postSchema.parse(await request.json());
    const supabase = db();
    const open = await supabase.from("shifts").select("id").eq("member_id", me.id).is("ended_at", null).maybeSingle();
    if (open.error) throw open.error;
    if (action === "clockIn") {
      if (open.data) throw Object.assign(new Error("이미 출근 중입니다."), { status: 409 });
      const thisMonth = formatInTimeZone(new Date(), "Asia/Seoul", "yyyy-MM");
      const paid = await supabase.from("settlements").select("id").eq("household_id", me.householdId)
        .eq("member_id", me.id).eq("year_month", thisMonth).eq("status", "paid").maybeSingle();
      if (paid.error) throw paid.error;
      if (paid.data) throw Object.assign(new Error("이번 달 정산이 완료되었습니다. 부모 관리자에게 정산 재개를 요청해 주세요."), { status: 409 });
      const member = await supabase.from("members").select("hourly_rate_won").eq("id", me.id).single();
      if (member.error) throw member.error;
      const result = await supabase.from("shifts").insert({
        household_id: me.householdId,
        member_id: me.id,
        started_at: new Date().toISOString(),
        hourly_rate_snapshot_won: member.data.hourly_rate_won,
      });
      if (result.error) throw result.error;
    } else {
      if (!open.data) throw Object.assign(new Error("출근 중인 기록이 없습니다."), { status: 409 });
      const result = await supabase.from("shifts").update({ ended_at: new Date().toISOString() }).eq("id", open.data.id).is("ended_at", null);
      if (result.error) throw result.error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const me = await requireSession(true);
    const input = patchSchema.parse(await request.json());
    if (input.endedAt && new Date(input.endedAt) < new Date(input.startedAt)) {
      throw Object.assign(new Error("퇴근은 출근보다 빠를 수 없습니다."), { status: 400 });
    }
    const supabase = db();
    const before = await supabase.from("shifts").select("*").eq("id", input.shiftId).eq("household_id", me.householdId).single();
    if (before.error) throw before.error;
    const locked = await supabase.from("settlements").select("year_month").eq("household_id", me.householdId)
      .eq("member_id", before.data.member_id).eq("status", "paid");
    if (locked.error) throw locked.error;
    const oldStart = new Date(before.data.started_at);
    const oldEnd = new Date(before.data.ended_at ?? Date.now());
    const newStart = new Date(input.startedAt);
    const newEnd = new Date(input.endedAt ?? Date.now());
    const touchesLockedMonth = locked.data.some(({ year_month }) => {
      const bounds = monthBounds(year_month);
      return (oldStart < bounds.end && oldEnd > bounds.start) || (newStart < bounds.end && newEnd > bounds.start);
    });
    if (touchesLockedMonth) throw Object.assign(new Error("지급 완료된 월과 겹칩니다. 정산을 다시 연 뒤 수정해 주세요."), { status: 409 });
    const after = { started_at: input.startedAt, ended_at: input.endedAt };
    const update = await supabase.from("shifts").update(after).eq("id", input.shiftId);
    if (update.error) throw update.error;
    await supabase.from("audit_logs").insert({ household_id: me.householdId, actor_id: me.id,
      action: "shift.updated", target_type: "shift", target_id: input.shiftId,
      reason: input.reason, before_value: before.data, after_value: { ...before.data, ...after } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
