"use client";

import type { CurrentUser } from "@orbix/types";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";

import { fetchCurrentUser } from "./fetch-current-user";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: CurrentUser | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);

  const applySession = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    const currentUser = await fetchCurrentUser(session.access_token);
    if (!currentUser) {
      // Sessão válida no Supabase, mas sem usuário vinculado no Orbix Pulse
      // (users.auth_id) — trata como não autenticado em vez de deixar preso em loading.
      await supabase.auth.signOut();
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    setUser(currentUser);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    // onAuthStateChange dispara imediatamente com a sessão atual (INITIAL_SESSION),
    // então não precisa de uma chamada getSession() separada.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession precisa estar dentro de <SessionProvider>");
  }
  return ctx;
}
