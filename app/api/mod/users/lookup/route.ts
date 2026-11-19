import { requireMod } from "@/lib/server/auth";
import { json, route } from "@/lib/server/api";
import { helix } from "@/lib/server/twitch";

export const dynamic = "force-dynamic";

type HelixUsers = { data: { id: string; login: string; display_name: string }[] };

export const GET = route(async (request) => {
  await requireMod();
  const username = new URL(request.url).searchParams.get("username")?.trim();
  if (!username) {
    return json({ success: false, error: "Missing username parameter" }, 400);
  }
  const { data } = await helix<HelixUsers>(`/users?login=${encodeURIComponent(username)}`);
  const user = data[0];
  if (!user) {
    return json({ success: false, error: "User not found on Twitch" }, 404);
  }
  return json({
    success: true,
    user: { id: user.id, login: user.login, display_name: user.display_name },
  });
});
