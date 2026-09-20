"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function DemoLoginScreen({
  onLogin,
}: {
  onLogin: (userId: string) => void;
}) {
  const [userId, setUserId] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = userId.trim();
    if (trimmed) onLogin(trimmed);
  }

  return (
    <main className="welcome-page">
      <section className="welcome-visual" aria-label="빤짝온오프 소개">
        <div className="welcome-orbit orbit-one" />
        <div className="welcome-orbit orbit-two" />
        <div className="welcome-star star-one">✦</div>
        <div className="welcome-star star-two">✦</div>
        <p className="welcome-kicker"> 우리 가족 돌봄 출퇴근 시스템</p>
        <h1>
          빤짝 <span>온오프</span>
        </h1>
        <p>
          함께한 시간부터 빤짝이의 오늘까지
          <br />
          가족의 따뜻한 돌봄을 한곳에 기록해요.
        </p>
      </section>

      <section className="welcome-login">
        <div className="login-role">
          <ShieldCheck />
          <span>로그인</span>
        </div>
        <h2>반가워요!</h2>
        <p>
          아이디를 입력하고
          <br />
          우리 가족의 돌봄 출퇴근을 관리해보세요.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="user-id">아이디</label>
          <input
            id="user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            maxLength={30}
            autoComplete="username"
            autoFocus
            placeholder="아이디를 입력해주세요"
          />
          <button className="welcome-submit" disabled={!userId.trim()}>
            로그인 <ArrowRight size={19} />
          </button>
        </form>
        <span className="demo-note">
          지금은 아이디만 입력하는 UI 체험 버전이에요
        </span>
      </section>
    </main>
  );
}
