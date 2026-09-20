import { addMonths } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export interface PayShift {
  member_id: string;
  started_at: string;
  ended_at: string | null;
  hourly_rate_snapshot_won: number;
}

export function monthBounds(month: string, timeZone = "Asia/Seoul") {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("올바르지 않은 월입니다.");
  const startLocal = new Date(`${month}-01T00:00:00`);
  const nextLocal = addMonths(startLocal, 1);
  return {
    start: fromZonedTime(startLocal, timeZone),
    end: fromZonedTime(nextLocal, timeZone),
  };
}

export function calculatePayroll(
  shifts: PayShift[],
  month: string,
  now = new Date(),
  timeZone = "Asia/Seoul",
) {
  const bounds = monthBounds(month, timeZone);
  const result = new Map<string, { totalMinutes: number; rawWon: number; shiftIds: Set<string> }>();
  for (const shift of shifts as Array<PayShift & { id?: string }>) {
    const start = new Date(Math.max(new Date(shift.started_at).getTime(), bounds.start.getTime()));
    const shiftEnd = shift.ended_at ? new Date(shift.ended_at) : now;
    const end = new Date(Math.min(shiftEnd.getTime(), bounds.end.getTime()));
    if (end <= start) continue;
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60_000);
    const row = result.get(shift.member_id) ?? { totalMinutes: 0, rawWon: 0, shiftIds: new Set<string>() };
    row.totalMinutes += minutes;
    row.rawWon += (minutes * shift.hourly_rate_snapshot_won) / 60;
    if (shift.id) row.shiftIds.add(shift.id);
    result.set(shift.member_id, row);
  }
  return new Map([...result].map(([id, row]) => [id, {
    totalMinutes: row.totalMinutes,
    amountWon: Math.round(row.rawWon),
    shiftCount: row.shiftIds.size,
  }]));
}
