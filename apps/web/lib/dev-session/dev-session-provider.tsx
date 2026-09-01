"use client";

import type { Role } from "@orbix/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { MOCK_USERS, type MockUser } from "./mock-users";

const STORAGE_KEY = "orbix:dev-session-role";
const DEFAULT_ROLE: Role = "OWNER";

interface DevSessionContextValue {
  user: MockUser;
  setRole: (role: Role) => void;
}

const DevSessionContext = createContext<DevSessionContextValue | null>(null);

export function DevSessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(DEFAULT_ROLE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (stored && stored in MOCK_USERS) {
      setRoleState(stored);
    }
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<DevSessionContextValue>(
    () => ({ user: MOCK_USERS[role], setRole }),
    [role],
  );

  return <DevSessionContext.Provider value={value}>{children}</DevSessionContext.Provider>;
}

export function useDevSession(): DevSessionContextValue {
  const ctx = useContext(DevSessionContext);
  if (!ctx) {
    throw new Error("useDevSession precisa estar dentro de <DevSessionProvider>");
  }
  return ctx;
}
