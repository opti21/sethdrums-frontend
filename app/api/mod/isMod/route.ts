import { getCurrentUser, isMod, SETH_TWITCH_ID } from "@/lib/server/auth";
import { route, text } from "@/lib/server/api";

export const dynamic = "force-dynamic";

// 200 = mod, 201 = Seth, 403 = not a mod, 401 = signed out.
export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) {
    return text("Not signed in", 401);
  }
  if (!(await isMod(user.twitchId))) {
    return text("Not a mod", 403);
  }
  if (user.twitchId === SETH_TWITCH_ID) {
    return text("Has a huge forehead", 201);
  }
  return text("Is a mod", 200);
});
