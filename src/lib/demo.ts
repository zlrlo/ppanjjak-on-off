import type { AppState } from "@/lib/types";

const now = Date.now();

export const demoState: AppState = {
  me: { id: "demo-mom", householdId: "demo-home", displayName: "엄마", role: "admin" },
  householdName: "우리 가족",
  members: [
    { id: "demo-mom", displayName: "엄마", role: "admin", hourlyRateWon: 0, active: true },
    { id: "demo-dad", displayName: "아빠", role: "admin", hourlyRateWon: 0, active: true },
    { id: "demo-grandma", displayName: "할머니", role: "member", hourlyRateWon: 15000, active: true },
  ],
  openShifts: [
    { id: "demo-open-1", memberId: "demo-grandma", startedAt: new Date(now - 72 * 60_000).toISOString(), endedAt: null, hourlyRateWon: 15000 },
  ],
  recentShifts: [
    { id: "demo-shift-1", memberId: "demo-grandma", startedAt: new Date(now - 2 * 86_400_000 - 4 * 3_600_000).toISOString(), endedAt: new Date(now - 2 * 86_400_000).toISOString(), hourlyRateWon: 15000 },
    { id: "demo-shift-2", memberId: "demo-dad", startedAt: new Date(now - 3 * 86_400_000 - 2 * 3_600_000).toISOString(), endedAt: new Date(now - 3 * 86_400_000).toISOString(), hourlyRateWon: 0 },
  ],
  baby: {
    isSleeping: true,
    sleepChangedAt: new Date(now - 38 * 60_000).toISOString(),
    lastFedAt: new Date(now - 94 * 60_000).toISOString(),
    updatedByName: "할머니",
  },
  payroll: [
    { memberId: "demo-mom", displayName: "엄마", totalMinutes: 480, amountWon: 0, shiftCount: 3, status: "unpaid", paidAt: null },
    { memberId: "demo-dad", displayName: "아빠", totalMinutes: 630, amountWon: 0, shiftCount: 4, status: "unpaid", paidAt: null },
    { memberId: "demo-grandma", displayName: "할머니", totalMinutes: 1140, amountWon: 285000, shiftCount: 6, status: "unpaid", paidAt: null },
  ],
  month: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" })
    .format(new Date()).replace("/", "-"),
};
