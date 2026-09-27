"use client";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoginScreen } from "@/components/login-screen";
import { FamilyHub } from "@/components/family-hub";
import type { AppState } from "@/lib/types";
import { demoState } from "@/lib/demo";
import { DemoLoginScreen } from "@/components/demo-login-screen";

export default function HomePage() {
  const [state, setState] = useState<AppState | null>(null);
  const [screen, setScreen] = useState<"loading" | "demo" | "login" | "families" | "app" | "error">("loading");
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setScreen("loading"); setError("");
    try {
      const params = new URLSearchParams(location.hash.slice(1));
      const token = params.get("invite");
      if (token && /^[a-f0-9]{48}$/.test(token)) { sessionStorage.setItem("ppanjjak_invite", token); history.replaceState(null, "", location.pathname + location.search); }
      if (new URLSearchParams(location.search).has("auth_error")) {
        setError("카카오 로그인이 취소되었거나 완료되지 않았어요. 다시 시도해 주세요."); history.replaceState(null, "", location.pathname);
      }
      let isDemo = process.env.NEXT_PUBLIC_DEMO_ONLY === "true";
      if (!isDemo) {
        const configResponse = await fetch("/api/config", { cache: "no-store" });
        if (!configResponse.ok) throw new Error("서버 설정을 확인하지 못했어요.");
        const config = await configResponse.json();
        if (!config.configured) throw new Error("Supabase 환경변수 설정을 완료해 주세요.");
      }
      setDemo(isDemo);
      if (isDemo) { setScreen("demo"); return; }
      const response = await fetch("/api/account", { cache: "no-store" });
      if (response.status === 401) { setScreen("login"); return; }
      if (!response.ok) { const body = await response.json(); throw new Error(body.error); }
      setScreen("families");
    } catch (e) { setError(e instanceof Error ? e.message : "연결하지 못했어요."); setScreen("error"); }
  }, []);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_ONLY !== "true" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    void load();
  }, [load]);
  async function select(householdId: string) {
    const r = await fetch("/api/families", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "select", householdId }) });
    if (!r.ok) throw new Error((await r.json()).error);
    const result = await fetch("/api/state", { cache: "no-store", headers: { "x-household-id": householdId } });
    if (!result.ok) throw new Error((await result.json()).error);
    setState(await result.json()); setScreen("app");
  }
  async function logout() {
    if (!demo) { const r = await fetch("/api/auth/logout", { method: "POST" }); if (!r.ok) throw new Error("로그아웃하지 못했어요. 다시 시도해 주세요."); }
    setState(null); setScreen(demo ? "demo" : "login");
  }
  if (screen === "loading") return <main className="splash"><Sparkles/><LoaderCircle className="spin"/><p>빤짝 온오프를 준비하는 중…</p></main>;
  if (screen === "error") return <main className="login-page"><section className="login-card"><p className="form-error" role="alert">{error}</p><button className="primary wide" onClick={load}>다시 시도</button></section></main>;
  if (screen === "demo") return <DemoLoginScreen onLogin={name => { const next = structuredClone(demoState); next.me.displayName = name; next.members[0].displayName = name; setState(next); setScreen("app"); }}/>;
  if (screen === "login") return <>{error && <p className="form-error" role="alert">{error}</p>}<LoginScreen/></>;
  if (screen === "families") return <FamilyHub onSelect={select} onLogout={logout}/>;
  return state && <AppShell key={state.me.householdId} initial={state} demo={demo} onLogout={logout} onFamilies={() => { setState(null); setScreen("families"); }}/>;
}
