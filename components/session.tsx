"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Role = "viewer" | "mod" | "seth";

export type Session = {
  user: { twitchId: string; username: string; picture?: string } | null;
  role: Role;
};

const SessionContext = createContext<Session>({ user: null, role: "viewer" });

export function SessionProvider({ value, children }: { value: Session; children: ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
