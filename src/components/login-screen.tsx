"use client";
import { useState } from "react";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { browserAuth } from "@/lib/supabase/client";

export function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    setBusy(true); setError("");
    try {
      const { error } = await browserAuth().auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    } catch { setError("카카오 로그인에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."); setBusy(false); }
  }
  return <main className="welcome-page">
    <section className="welcome-visual" aria-label="빤짝온오프 소개">
      <img className="welcome-background" src="/welcome-family-circle.png" alt="손을 맞잡고 원을 만든 가족 손그림" />
      <p className="welcome-kicker">우리 가족 돌봄 출퇴근 시스템</p>
      <h1>빤짝 <span>온오프</span></h1>
      <p>함께한 시간부터 빤짝이의 오늘까지<br/>가족의 따뜻한 돌봄을 한곳에 기록해요.</p>
    </section>
    <section className="welcome-login">
      <p className="login-role">우리 가족의 작은 기록</p>
      <h2>반가워요!</h2>
      <p>카카오로 간편하게 시작해요.<br/>처음 오셨다면 로그인 후 가입 정보를 입력해 주세요.</p>
      <button className="welcome-submit kakao-submit wide" onClick={login} disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={20}/> : <MessageCircle size={20}/>} 카카오로 시작하기
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="login-foot">가입 후 가족을 만들거나 받은 초대에 참여할 수 있어요.</p>
    </section>
  </main>;
}
