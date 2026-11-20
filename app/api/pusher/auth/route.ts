import { getCurrentUser, isMod } from "@/lib/server/auth";
import { json, route } from "@/lib/server/api";
import { pusher } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

// pusher-js posts socket_id and channel_name as a form. Only mods may join
// the presence channel.
export const POST = route(async (request) => {
  const started = Date.now();
  const user = await getCurrentUser();
  if (!user) {
    return json({ error: "Not signed in" }, 403);
  }
  if (!(await isMod(user.twitchId))) {
    return json({ error: "Not a mod" }, 403);
  }
  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  if (!socketId || !channel) {
    return json({ error: "socket_id and channel_name are required" }, 400);
  }
  const auth = pusher.authorizeChannel(socketId, channel, {
    user_id: `user-${user.twitchId}`,
    user_info: { username: user.username, picture: user.picture },
  });
  const elapsed = Date.now() - started;
  if (elapsed > 2000) {
    console.warn(`[pusher-auth] slow: ${elapsed}ms`);
  }
  return json(auth);
});
