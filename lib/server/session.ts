import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { getCurrentUser, isMod, SETH_TWITCH_ID } from "./auth";
import type { Session } from "@/components/session";

/** Who is looking at the page. Never throws: a broken session just means signed out. */
export const getSession = cache(async (): Promise<Session> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { user: null, role: "viewer" };
    }
    const mod = await isMod(user.twitchId);
    return {
      user,
      role: mod ? (user.twitchId === SETH_TWITCH_ID ? "seth" : "mod") : "viewer",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[session] could not load session", error);
    return { user: null, role: "viewer" };
  }
});
