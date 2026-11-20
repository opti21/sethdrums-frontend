import { Notice } from "@/components/ui/misc";
import { getSession } from "@/lib/server/session";
import type { Role } from "@/components/session";

/** Server-side check before rendering a mod-only page. */
export async function Gate({ need, path, children }: { need: Role; path: string; children: React.ReactNode }) {
  const { user, role } = await getSession();
  if (!user) {
    return (
      <Notice tone="info" className="mx-auto max-w-lg text-center">
        <p className="mb-3">Sign in with Twitch to see this page.</p>
        <a
          href={`/api/auth/login?returnTo=${encodeURIComponent(path)}`}
          className="inline-flex h-9 items-center rounded-lg bg-[#9146ff] px-4 font-semibold text-white"
        >
          Sign in with Twitch
        </a>
      </Notice>
    );
  }
  const allowed = need === "viewer" || role === "seth" || (need === "mod" && role === "mod");
  if (!allowed) {
    return (
      <Notice tone="error" className="mx-auto max-w-lg text-center">
        Only {need === "seth" ? "Seth" : "mods"} can see this page.
      </Notice>
    );
  }
  return <>{children}</>;
}
