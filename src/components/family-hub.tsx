"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Users, LogOut, Plus, Mail } from "lucide-react";

type Membership = { id: string; household_id: string; role: string; household: { name: string } };
type Invitation = { id: string; status: string; expires_at: string; household?: { name: string } };
type Account = { profile: { display_name: string } | null; memberships: Membership[]; received: Invitation[] };
async function api(path: string, body?: unknown) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "요청을 처리하지 못했어요.");
  return data;
}
const inviteState = (i: Invitation) => i.status === "pending" && new Date(i.expires_at).getTime() <= Date.now() ? "만료됨" : ({ pending: "대기 중", accepted: "수락됨", declined: "거절됨", revoked: "취소됨" }[i.status] || i.status);

export function FamilyHub({ onSelect, onLogout }: { onSelect: (householdId: string) => Promise<void>; onLogout: () => Promise<void> }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [link, setLink] = useState("");
  const [sent, setSent] = useState<Invitation[]>([]);
  const [sentGroup, setSentGroup] = useState("");
  const load = useCallback(async () => { setAccount(await api("/api/account")); }, []);
  useEffect(() => {
    setToken(sessionStorage.getItem("ppanjjak_invite") || "");
    load().catch(e => setError(e.message));
  }, [load]);
  async function run(fn: () => Promise<void>) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했어요."); }
    finally { setBusy(false); }
  }
  function form(event: FormEvent<HTMLFormElement>, fn: (data: FormData) => Promise<void>) {
    event.preventDefault(); const element = event.currentTarget; const data = new FormData(element);
    void run(async () => { await fn(data); element.reset(); await load(); });
  }
  async function sentList(id: string) {
    const result = await api(`/api/invitations?householdId=${id}`); setSent(result.invitations); setSentGroup(id);
  }
  return <main className="family-hub">
    <header className="hub-heading"><div><p className="eyebrow">빤짝 온오프</p><h1>우리 가족 공간</h1></div><button className="icon-btn" aria-label="로그아웃" disabled={busy} onClick={() => run(onLogout)}><LogOut size={20}/></button></header>
    {error && <div className="form-error" role="alert">{error} <button className="mini-action" onClick={() => run(load)} disabled={busy}>다시 확인</button></div>}
    {!account ? <p role="status">가족 정보를 불러오는 중…</p> : !account.profile ?
      <section className="section"><h2>가입을 마무리해 주세요</h2><p>가족에게 보여줄 이름을 입력해 주세요.</p><form className="stack-form" onSubmit={e => form(e, async d => { await api("/api/account", { displayName: d.get("name") }); })}>
        <label>이름<input name="name" autoComplete="nickname" required maxLength={20} placeholder="예: 지은"/></label><button className="primary" disabled={busy}>회원가입 완료</button>
      </form></section> : <>
      <p>{account.profile.display_name}님, 함께할 가족을 선택해 주세요.</p>
      {token && <section className="section"><h2>초대 링크를 받았어요</h2><p>초대함에 등록한 뒤 가족 이름을 확인하고 수락할 수 있어요.</p><div className="hub-actions"><button className="primary" disabled={busy} onClick={() => run(async () => {
        await api("/api/invitations", { action: "claim", token }); sessionStorage.removeItem("ppanjjak_invite"); setToken(""); await load();
      })}>초대함에 추가</button><button className="mini-action" disabled={busy} onClick={() => { sessionStorage.removeItem("ppanjjak_invite"); setToken(""); }}>닫기</button></div></section>}
      <section className="section"><h2><Users size={21}/> 내 가족 그룹</h2>
        {!account.memberships.length && <p>아직 참여한 가족이 없어요. 새로 만들거나 받은 초대를 수락해 주세요.</p>}
        <div className="hub-list">{account.memberships.map(m => <article className="hub-row" key={m.id}><div><strong>{m.household.name}</strong><p>{m.role === "admin" ? "관리자" : "가족"}</p></div><div className="hub-actions">
          <button className="primary" disabled={busy} onClick={() => run(() => onSelect(m.household_id))}>들어가기</button>
          {m.role === "admin" && <><button className="mini-action" disabled={busy} onClick={() => run(async () => {
            const r = await api("/api/invitations", { action: "create", householdId: m.household_id });
            setLink(`${location.origin}/#invite=${r.token}`); await sentList(m.household_id);
          })}>초대 링크 만들기</button><button className="mini-action" disabled={busy} onClick={() => run(() => sentList(m.household_id))}>보낸 초대</button></>}
        </div></article>)}</div>
      </section>
      {link && <section className="section"><h2>가족에게 링크를 전달해 주세요</h2><p>한 사람만 사용할 수 있고 7일 후 만료됩니다.</p><label>초대 링크<input readOnly value={link} onFocus={e => e.currentTarget.select()}/></label><button className="mini-action" onClick={() => run(async () => { await navigator.clipboard.writeText(link); })}>링크 복사</button></section>}
      {sentGroup && <section className="section"><h2>보낸 초대 · {account.memberships.find(m => m.household_id === sentGroup)?.household.name}</h2>{!sent.length && <p>보낸 초대가 없어요.</p>}{sent.map(i => <div className="hub-row" key={i.id}><span>{inviteState(i)} · {new Date(i.expires_at).toLocaleDateString("ko-KR")}까지</span>{inviteState(i) === "대기 중" && <button className="mini-action" disabled={busy} onClick={() => run(async () => { await api("/api/invitations", { action: "revoke", invitationId: i.id }); setLink(""); await sentList(sentGroup); })}>초대 취소</button>}</div>)}</section>}
      <section className="section"><h2><Mail size={21}/> 받은 초대</h2>{!account.received.length && <p>받은 초대가 없어요. 가족이 보낸 초대 링크를 열어 주세요.</p>}{account.received.map(i => <article className="hub-row" key={i.id}><div><strong>{i.household?.name}</strong><p>{inviteState(i)}</p></div>{inviteState(i) === "대기 중" && <div className="hub-actions">{[true, false].map(accept => <button className={accept ? "primary" : "mini-action"} key={String(accept)} disabled={busy} onClick={() => run(async () => { await api("/api/invitations", { action: "respond", invitationId: i.id, accept }); await load(); })}>{accept ? "수락" : "거절"}</button>)}</div>}</article>)}</section>
      <section className="section"><h2><Plus size={21}/> 새 가족 만들기</h2><form className="stack-form" onSubmit={e => form(e, async d => { await api("/api/families", { action: "create", name: d.get("name") }); })}><label>가족 이름<input name="name" required maxLength={30} placeholder="예: 빤짝이네 가족"/></label><button className="primary" disabled={busy}>가족 그룹 만들기</button></form></section>
    </>}
  </main>;
}
