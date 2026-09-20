"use client";

import { FormEvent, useEffect, useState } from "react";
import { Baby, ChevronRight, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";

type PublicMember = { id: string; displayName: string };

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [selected, setSelected] = useState("");
  const [pin, setPin] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [householdName, setHouseholdName] = useState("우리 가족");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/members", { cache: "no-store" }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setNeedsSetup(body.needsSetup);
      setMembers(body.members);
      setHouseholdName(body.householdName || "우리 가족");
      setSelected(body.members[0]?.id || "");
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: selected, pin }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      onLogin();
    } catch (e) { setError(e instanceof Error ? e.message : "로그인하지 못했어요."); }
    finally { setSubmitting(false); }
  }

  async function setup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      onLogin();
    } catch (e) { setError(e instanceof Error ? e.message : "설정하지 못했어요."); }
    finally { setSubmitting(false); }
  }

  return <main className="login-page">
    <section className="login-card">
      <div className="brand-mark"><Sparkles size={27}/></div>
      <p className="eyebrow">WELCOME HOME</p>
      <h1>{needsSetup ? "빤짝 온오프를 시작해요" : `${householdName}에 오셨네요`}</h1>
      <p className="login-copy">함께 돌본 시간과 빤짝이의 지금을<br/>가족 모두가 따뜻하게 나눠요.</p>
      {loading ? <div className="center-loader"><LoaderCircle className="spin"/> 불러오는 중</div> : needsSetup ?
        <form className="stack-form" onSubmit={setup}>
          <label>가족 이름<input name="householdName" placeholder="예: 우리 가족" required maxLength={30}/></label>
          <label>첫 부모 이름<input name="displayName" placeholder="예: 엄마" required maxLength={20}/></label>
          <label>나의 6자리 PIN<input name="pin" type="password" inputMode="numeric" pattern="\d{6}" placeholder="••••••" required/></label>
          <label>설정 비밀값<input name="setupSecret" type="password" placeholder="환경 변수 SETUP_SECRET" required minLength={12}/></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary wide" disabled={submitting}>{submitting ? <LoaderCircle className="spin"/> : <Baby/>} 가족 공간 만들기</button>
        </form> :
        <form className="stack-form" onSubmit={login}>
          <label>누구세요?<select value={selected} onChange={(e) => setSelected(e.target.value)} required>{members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>
          <label>나의 PIN<div className="input-icon"><LockKeyhole size={18}/><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} type="password" inputMode="numeric" placeholder="6자리 숫자" required pattern="\d{6}"/></div></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary wide" disabled={submitting || pin.length !== 6}>{submitting ? <LoaderCircle className="spin"/> : <>들어가기 <ChevronRight/></>}</button>
        </form>}
      <p className="login-foot">가족만을 위한 안전한 공간이에요</p>
    </section>
  </main>;
}
