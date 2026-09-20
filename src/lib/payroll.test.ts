import { describe, expect, it } from "vitest";
import { calculatePayroll, monthBounds } from "./payroll";

describe("calculatePayroll", () => {
  it("실제 분을 합산하고 월 합계에서 원 단위로 반올림한다", () => {
    const result = calculatePayroll([{ member_id: "a", started_at: "2026-09-01T00:00:00Z", ended_at: "2026-09-01T01:01:59Z", hourly_rate_snapshot_won: 10_000 }], "2026-09");
    expect(result.get("a")).toEqual({ totalMinutes: 61, amountWon: 10167, shiftCount: 0 });
  });

  it("한국 시간의 월 경계에 걸친 근무를 나누어 계산한다", () => {
    const shift = { member_id: "a", started_at: "2026-09-30T14:30:00Z", ended_at: "2026-09-30T15:30:00Z", hourly_rate_snapshot_won: 12_000 };
    expect(calculatePayroll([shift], "2026-09").get("a")?.totalMinutes).toBe(30);
    expect(calculatePayroll([shift], "2026-10").get("a")?.totalMinutes).toBe(30);
  });

  it("퇴근하지 않은 근무는 현재 시각까지만 계산한다", () => {
    const result = calculatePayroll([{ member_id: "a", started_at: "2026-09-20T00:00:00Z", ended_at: null, hourly_rate_snapshot_won: 9_000 }], "2026-09", new Date("2026-09-20T02:00:00Z"));
    expect(result.get("a")?.totalMinutes).toBe(120);
  });
});

describe("monthBounds", () => {
  it("서울 자정 기준 UTC 범위를 만든다", () => {
    const value = monthBounds("2026-09");
    expect(value.start.toISOString()).toBe("2026-08-31T15:00:00.000Z");
    expect(value.end.toISOString()).toBe("2026-09-30T15:00:00.000Z");
  });
});
