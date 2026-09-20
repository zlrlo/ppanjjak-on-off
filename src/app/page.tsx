"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoginScreen } from "@/components/login-screen";
import type { AppState } from "@/lib/types";
import { demoState } from "@/lib/demo";
import { DemoLoginScreen } from "@/components/demo-login-screen";

export default function HomePage() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [demo, setDemo] = useState(false);
  const [demoNeedsLogin, setDemoNeedsLogin] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await fetch("/api/config", { cache: "no-store" }).then((r) => r.json());
      if (!config.configured) {
        setDemo(true); setLoggedOut(false);
        const savedUserId = window.sessionStorage.getItem("ppanjjak_demo_user_id");
        if (savedUserId) {
          const next = structuredClone(demoState);
          next.me.displayName = savedUserId;
          next.members[0].displayName = savedUserId;
          setState(next); setDemoNeedsLogin(false);
        } else {
          setState(null); setDemoNeedsLogin(true);
        }
        return;
      }
      const response = await fetch("/api/state", { cache: "no-store" }); if (!response.ok) throw new Error();
      setState(await response.json()); setDemo(false); setLoggedOut(false);
    }
    catch { setState(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <main className="splash"><div className="brand-mark"><Sparkles/></div><LoaderCircle className="spin"/><p>빤짝 온오프를 준비하는 중…</p></main>;
  if (demo && demoNeedsLogin) return <DemoLoginScreen onLogin={(userId) => {
    window.sessionStorage.setItem("ppanjjak_demo_user_id", userId);
    const next = structuredClone(demoState);
    next.me.displayName = userId;
    next.members[0].displayName = userId;
    setState(next); setDemoNeedsLogin(false); setLoggedOut(false);
  }}/>;
  if (!state || loggedOut) return <LoginScreen onLogin={load}/>;
  return <AppShell initial={state} demo={demo} onLogout={() => {
    if (demo) { window.sessionStorage.removeItem("ppanjjak_demo_user_id"); setDemoNeedsLogin(true); }
    else setLoggedOut(true);
    setState(null);
  }}/>;
}
