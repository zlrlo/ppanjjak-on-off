export type Role = "admin" | "member";

export interface SessionMember {
  id: string;
  householdId: string;
  displayName: string;
  role: Role;
}

export interface MemberSummary {
  id: string;
  displayName: string;
  role: Role;
  hourlyRateWon: number;
  active: boolean;
}

export interface ShiftSummary {
  id: string;
  memberId: string;
  startedAt: string;
  endedAt: string | null;
  hourlyRateWon: number;
}

export interface PayrollRow {
  memberId: string;
  displayName: string;
  totalMinutes: number;
  amountWon: number;
  shiftCount: number;
  status: "unpaid" | "paid";
  paidAt: string | null;
}

export interface AppState {
  me: SessionMember;
  householdName: string;
  members: MemberSummary[];
  openShifts: ShiftSummary[];
  recentShifts: ShiftSummary[];
  baby: {
    isSleeping: boolean;
    sleepChangedAt: string;
    lastFedAt: string | null;
    updatedByName: string | null;
  };
  payroll: PayrollRow[];
  month: string;
}
