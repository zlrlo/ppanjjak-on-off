"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Coffee,
  Coins,
  Home,
  LoaderCircle,
  LogOut,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import type { AppState, ShiftSummary } from "@/lib/types";

type Tab = "home" | "pay" | "admin";

function duration(start: string, end: string | null, now: number) {
  const mins = Math.max(
    0,
    Math.floor(
      ((end ? new Date(end).getTime() : now) - new Date(start).getTime()) /
        60_000,
    ),
  );
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

function won(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
function localInput(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function AppShell({
  initial,
  onLogout,
  demo = false,
}: {
  initial: AppState;
  onLogout: () => void;
  demo?: boolean;
}) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>("home");
  const [month, setMonth] = useState(initial.month);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(
    async (targetMonth = month) => {
      if (demo) return;
      const response = await fetch(`/api/state?month=${targetMonth}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setState(body);
    },
    [month, demo],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = window.setInterval(
      () => refresh().catch(() => undefined),
      15_000,
    );
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  async function act(key: string, url: string, body: unknown) {
    setBusy(key);
    setMessage("");
    try {
      if (demo) {
        const payload = body as Record<string, unknown>;
        const stamp = new Date().toISOString();
        setState((current) => {
          if (url === "/api/shifts") {
            if (payload.action === "clockIn")
              return {
                ...current,
                openShifts: [
                  ...current.openShifts,
                  {
                    id: `demo-${Date.now()}`,
                    memberId: current.me.id,
                    startedAt: stamp,
                    endedAt: null,
                    hourlyRateWon:
                      current.members.find((m) => m.id === current.me.id)
                        ?.hourlyRateWon ?? 0,
                  },
                ],
              };
            return {
              ...current,
              openShifts: current.openShifts.filter(
                (s) => s.memberId !== current.me.id,
              ),
            };
          }
          if (url === "/api/baby" && payload.action === "sleep")
            return {
              ...current,
              baby: {
                ...current.baby,
                isSleeping: Boolean(payload.sleeping),
                sleepChangedAt: stamp,
                updatedByName: current.me.displayName,
              },
            };
          if (url === "/api/baby" && payload.action === "feed")
            return {
              ...current,
              baby: {
                ...current.baby,
                lastFedAt: stamp,
                updatedByName: current.me.displayName,
              },
            };
          if (url === "/api/admin/settlements")
            return {
              ...current,
              payroll: current.payroll.map((row) =>
                row.memberId === payload.memberId
                  ? {
                      ...row,
                      status: payload.action === "pay" ? "paid" : "unpaid",
                      paidAt: payload.action === "pay" ? stamp : null,
                    }
                  : row,
              ),
            };
          return current;
        });
        return;
      }
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy("");
    }
  }

  const myShift = state.openShifts.find((s) => s.memberId === state.me.id);
  const names = useMemo(
    () => new Map(state.members.map((m) => [m.id, m.displayName])),
    [state.members],
  );

  return (
    <div className="app-wrap">
      <header className="topbar">
        <div>
          <p className="eyebrow">{state.householdName}</p>
          <h1>안녕, {state.me.displayName}!</h1>
        </div>
        <div className="top-actions">
          {demo && <span className="demo-pill">UI 데모</span>}
          <button
            className="icon-btn"
            aria-label="로그아웃"
            onClick={async () => {
              if (!demo) await fetch("/api/auth/logout", { method: "POST" });
              onLogout();
            }}
          >
            <LogOut />
          </button>
        </div>
      </header>
      <main className="content">
        {demo && (
          <div className="demo-banner">
            ✨ 지금은 샘플 데이터로 보는 데모예요. 변경 내용은 새로고침하면
            초기화돼요.
          </div>
        )}
        {message && (
          <div className="toast">
            {message}
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}
        {tab === "home" && (
          <>
            <section className={`hero-card ${myShift ? "working" : ""}`}>
              <div className="hero-copy">
                <span className="status-dot" />
                <p>{myShift ? "지금 함께 돌보는 중" : "오늘도 반가워요"}</p>
                <h2>
                  {myShift
                    ? duration(myShift.startedAt, null, now)
                    : "도착하면 출근을 눌러주세요"}
                </h2>
              </div>
              <button
                className={myShift ? "clock-button out" : "clock-button"}
                disabled={Boolean(busy)}
                onClick={() =>
                  act("shift", "/api/shifts", {
                    action: myShift ? "clockOut" : "clockIn",
                  })
                }
              >
                {busy === "shift" ? (
                  <LoaderCircle className="spin" />
                ) : myShift ? (
                  <>
                    <Coffee /> 퇴근하기
                  </>
                ) : (
                  <>
                    <Clock3 /> 출근하기
                  </>
                )}
              </button>
            </section>

            <section className="section care-section">
              <div className="section-title">
                <div>
                  <p className="eyebrow">현재 근무</p>
                  <h2>지금 돌봄 중</h2>
                </div>
                <span className="count-pill">{state.openShifts.length}명</span>
              </div>
              {state.openShifts.length ? (
                <div className="caregivers">
                  {state.openShifts.map((shift) => (
                    <div className="caregiver" key={shift.id}>
                      <div className="avatar">
                        {names.get(shift.memberId)?.slice(0, 1)}
                      </div>
                      <div>
                        <strong>{names.get(shift.memberId)}</strong>
                        <span>
                          {duration(shift.startedAt, null, now)}째 함께
                        </span>
                      </div>
                      <span className="online" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Users />
                  <p>아직 출근한 가족이 없어요</p>
                </div>
              )}
            </section>

            <LiveEarnings shifts={state.openShifts} names={names} now={now} />
          </>
        )}

        {tab === "pay" && (
          <Payroll
            state={state}
            month={month}
            busy={busy}
            onMonth={async (value) => {
              setMonth(value);
              setBusy("month");
              try {
                await refresh(value);
              } finally {
                setBusy("");
              }
            }}
            onSettle={(memberId, action) =>
              act(`settle-${memberId}`, "/api/admin/settlements", {
                memberId,
                month,
                action,
              })
            }
          />
        )}
        {tab === "admin" && state.me.role === "admin" && (
          <Admin
            state={state}
            busy={busy}
            refresh={refresh}
            setBusy={setBusy}
            setMessage={setMessage}
            demo={demo}
          />
        )}
      </main>
      <nav className="bottom-nav">
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          <Home />홈
        </button>
        <button
          className={tab === "pay" ? "active" : ""}
          onClick={() => setTab("pay")}
        >
          <WalletCards />
          급여
        </button>
        {state.me.role === "admin" && (
          <button
            className={tab === "admin" ? "active" : ""}
            onClick={() => setTab("admin")}
          >
            <Settings />
            관리
          </button>
        )}
      </nav>
    </div>
  );
}

function LiveEarnings({
  shifts,
  names,
  now,
}: {
  shifts: ShiftSummary[];
  names: Map<string, string>;
  now: number;
}) {
  const rows = shifts.map((shift) => {
    const seconds = Math.max(
      0,
      (now - new Date(shift.startedAt).getTime()) / 1000,
    );
    return {
      ...shift,
      amount: (seconds * shift.hourlyRateWon) / 3600,
    };
  });
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="section earning-section">
      <div className="section-title">
        <div>
          <p className="eyebrow live-label">
            <span /> LIVE
          </p>
          <h2>실시간으로 쌓이는 급여</h2>
        </div>
        <span className="section-doodle" aria-hidden="true">
          <img src="/pay-pig.jpeg" alt="" />
        </span>
      </div>
      {rows.length ? (
        <>
          <div className="earning-total">
            <p>현재 누적 급여</p>
            <strong>{won(Math.floor(total))}</strong>
          </div>
          <div className="earning-list">
            {rows.map((row) => (
              <div className="earning-row" key={row.id}>
                <div className="avatar small">
                  {names.get(row.memberId)?.slice(0, 1)}
                </div>
                <div>
                  <strong>{names.get(row.memberId)}</strong>
                  <span>시급 {won(row.hourlyRateWon)}</span>
                </div>
                <b>{won(Math.floor(row.amount))}</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty earning-empty">
          <Coins />
          <p>출근하면 급여가 실시간으로 쌓여요</p>
        </div>
      )}
    </section>
  );
}

function Payroll({
  state,
  month,
  busy,
  onMonth,
  onSettle,
}: {
  state: AppState;
  month: string;
  busy: string;
  onMonth: (m: string) => void;
  onSettle: (id: string, action: "pay" | "reopen") => void;
}) {
  const total = state.payroll.reduce((sum, row) => sum + row.amountWon, 0);
  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONTHLY PAY</p>
          <h2>우리 가족 급여</h2>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => onMonth(e.target.value)}
        />
      </div>
      <div className="pay-total">
        <p>이번 달 총 예상 급여</p>
        <strong>{won(total)}</strong>
        <span>
          {state.payroll
            .reduce((s, r) => s + r.totalMinutes, 0)
            .toLocaleString()}
          분의 돌봄
        </span>
      </div>
      <div className="pay-list">
        {state.payroll.map((row) => (
          <article className="pay-row" key={row.memberId}>
            <div className="avatar small">{row.displayName.slice(0, 1)}</div>
            <div className="pay-person">
              <strong>{row.displayName}</strong>
              <span>
                {Math.floor(row.totalMinutes / 60)}시간 {row.totalMinutes % 60}
                분 · {row.shiftCount}회
              </span>
            </div>
            <div className="pay-value">
              <strong>{won(row.amountWon)}</strong>
              <span className={row.status === "paid" ? "paid" : "unpaid"}>
                {row.status === "paid" ? "지급 완료" : "미지급"}
              </span>
            </div>
            {state.me.role === "admin" && (
              <button
                className="mini-action"
                disabled={Boolean(busy)}
                onClick={() =>
                  onSettle(
                    row.memberId,
                    row.status === "paid" ? "reopen" : "pay",
                  )
                }
              >
                {busy === `settle-${row.memberId}`
                  ? "…"
                  : row.status === "paid"
                    ? "다시 열기"
                    : "지급 처리"}
              </button>
            )}
          </article>
        ))}
      </div>
      <p className="fine-print">
        근무 시간은 실제 분 단위로 계산되며, 급여는 월 합계에서 원 단위로
        반올림됩니다.
      </p>
    </section>
  );
}

function Admin({
  state,
  busy,
  refresh,
  setBusy,
  setMessage,
  demo,
}: {
  state: AppState;
  busy: string;
  refresh: () => Promise<void>;
  setBusy: (v: string) => void;
  setMessage: (v: string) => void;
  demo: boolean;
}) {
  const [editing, setEditing] = useState<ShiftSummary | null>(null);
  async function submit(
    url: string,
    method: string,
    payload: unknown,
    key: string,
  ) {
    if (demo) {
      setMessage("UI 데모에서는 가족·근무 편집 내용이 저장되지 않아요.");
      return;
    }
    setBusy(key);
    setMessage("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FAMILY ADMIN</p>
          <h2>가족 관리</h2>
        </div>
      </div>
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          submit(
            "/api/admin/members",
            "POST",
            {
              displayName: d.get("name"),
              pin: d.get("pin"),
              role: d.get("role"),
              hourlyRateWon: Number(d.get("rate")),
            },
            "member",
          ).then(() => e.currentTarget.reset());
        }}
      >
        <h3>새 가족 초대</h3>
        <div className="form-grid">
          <label>
            이름
            <input
              name="name"
              required
              maxLength={20}
              placeholder="예: 할머니"
            />
          </label>
          <label>
            6자리 PIN
            <input
              name="pin"
              required
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              placeholder="••••••"
            />
          </label>
          <label>
            시급
            <input
              name="rate"
              required
              type="number"
              min="0"
              step="100"
              placeholder="12000"
            />
          </label>
          <label>
            권한
            <select name="role">
              <option value="member">가족</option>
              <option value="admin">부모 관리자</option>
            </select>
          </label>
        </div>
        <button className="primary" disabled={Boolean(busy)}>
          가족 추가하기
        </button>
      </form>
      <div className="admin-block">
        <h3>구성원</h3>
        {state.members.map((m) => (
          <div
            className={`member-admin ${!m.active ? "inactive" : ""}`}
            key={m.id}
          >
            <div className="avatar small">{m.displayName.slice(0, 1)}</div>
            <div>
              <strong>{m.displayName}</strong>
              <span>
                {m.role === "admin" ? "부모 관리자" : "가족"} · 시급{" "}
                {won(m.hourlyRateWon)}
              </span>
            </div>
            <button
              onClick={() => {
                const rate = window.prompt(
                  `${m.displayName}님의 새 시급`,
                  String(m.hourlyRateWon),
                );
                if (rate !== null)
                  submit(
                    "/api/admin/members",
                    "PATCH",
                    { memberId: m.id, hourlyRateWon: Number(rate) },
                    `edit-${m.id}`,
                  );
              }}
            >
              시급 변경
            </button>
            <button
              onClick={() => {
                const pin = window.prompt("새 6자리 PIN");
                if (pin)
                  submit(
                    "/api/admin/members",
                    "PATCH",
                    { memberId: m.id, pin },
                    `edit-${m.id}`,
                  );
              }}
            >
              PIN 재설정
            </button>
          </div>
        ))}
      </div>
      <div className="admin-block">
        <h3>최근 근무 수정</h3>
        {state.recentShifts.slice(0, 12).map((s) => (
          <div className="shift-admin" key={s.id}>
            <div>
              <strong>
                {state.members.find((m) => m.id === s.memberId)?.displayName}
              </strong>
              <span>
                {new Date(s.startedAt).toLocaleString("ko-KR")} ·{" "}
                {duration(s.startedAt, s.endedAt, Date.now())}
              </span>
            </div>
            <button onClick={() => setEditing(s)}>수정</button>
          </div>
        ))}
      </div>
      {editing && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
          <form
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              submit(
                "/api/shifts",
                "PATCH",
                {
                  shiftId: editing.id,
                  startedAt: new Date(String(d.get("start"))).toISOString(),
                  endedAt: d.get("end")
                    ? new Date(String(d.get("end"))).toISOString()
                    : null,
                  reason: d.get("reason"),
                },
                "edit-shift",
              ).then(() => setEditing(null));
            }}
          >
            <h3>근무 기록 수정</h3>
            <label>
              출근
              <input
                type="datetime-local"
                name="start"
                defaultValue={localInput(editing.startedAt)}
                required
              />
            </label>
            <label>
              퇴근
              <input
                type="datetime-local"
                name="end"
                defaultValue={
                  editing.endedAt ? localInput(editing.endedAt) : ""
                }
              />
            </label>
            <label>
              수정 사유
              <textarea
                name="reason"
                required
                minLength={2}
                placeholder="수정 이유를 남겨주세요"
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setEditing(null)}>
                취소
              </button>
              <button className="primary" disabled={busy === "edit-shift"}>
                저장
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
