import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { calculatePayroll, monthBounds } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const me = await requireSession();
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || formatInTimeZone(new Date(), "Asia/Seoul", "yyyy-MM");
    const { start, end } = monthBounds(month);
    const supabase = db();
    const [household, members, openShifts, recentShifts, baby, monthShifts, settlements] = await Promise.all([
      supabase.from("households").select("name").eq("id", me.householdId).single(),
      supabase.from("members").select("id, display_name, role, hourly_rate_won, active").eq("household_id", me.householdId).order("created_at"),
      supabase.from("shifts").select("id, member_id, started_at, ended_at, hourly_rate_snapshot_won").eq("household_id", me.householdId).is("ended_at", null),
      supabase.from("shifts").select("id, member_id, started_at, ended_at, hourly_rate_snapshot_won").eq("household_id", me.householdId).not("ended_at", "is", null).order("started_at", { ascending: false }).limit(30),
      supabase.from("baby_status").select("is_sleeping, sleep_changed_at, last_fed_at, updated_by").eq("household_id", me.householdId).single(),
      supabase.from("shifts").select("id, member_id, started_at, ended_at, hourly_rate_snapshot_won").eq("household_id", me.householdId).lt("started_at", end.toISOString()).or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`),
      supabase.from("settlements").select("member_id, status, paid_at").eq("household_id", me.householdId).eq("year_month", month),
    ]);
    for (const result of [household, members, openShifts, recentShifts, baby, monthShifts, settlements]) {
      if (result.error) throw result.error;
    }
    const pay = calculatePayroll(monthShifts.data!, month);
    const settlementMap = new Map(settlements.data!.map((s) => [s.member_id, s]));
    const memberRows = members.data!.map((m) => ({
      id: m.id, displayName: m.display_name, role: m.role,
      hourlyRateWon: m.hourly_rate_won, active: m.active,
    }));
    const nameMap = new Map(memberRows.map((m) => [m.id, m.displayName]));
    const shiftMap = (s: typeof openShifts.data extends (infer U)[] | null ? U : never) => ({
      id: s.id, memberId: s.member_id, startedAt: s.started_at,
      endedAt: s.ended_at, hourlyRateWon: s.hourly_rate_snapshot_won,
    });
    return NextResponse.json({
      me,
      householdName: household.data!.name,
      members: memberRows,
      openShifts: openShifts.data!.map(shiftMap),
      recentShifts: recentShifts.data!.map(shiftMap),
      baby: {
        isSleeping: baby.data!.is_sleeping,
        sleepChangedAt: baby.data!.sleep_changed_at,
        lastFedAt: baby.data!.last_fed_at,
        updatedByName: baby.data!.updated_by ? nameMap.get(baby.data!.updated_by) ?? null : null,
      },
      payroll: memberRows.filter((m) => m.active || pay.has(m.id)).map((m) => {
        const row = pay.get(m.id) ?? { totalMinutes: 0, amountWon: 0, shiftCount: 0 };
        const settlement = settlementMap.get(m.id);
        return { memberId: m.id, displayName: m.displayName, ...row,
          status: settlement?.status ?? "unpaid", paidAt: settlement?.paid_at ?? null };
      }),
      month,
    });
  } catch (error) {
    return apiError(error);
  }
}
