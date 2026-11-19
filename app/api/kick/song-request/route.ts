import { text } from "@/lib/server/api";
import { kickSongRequest } from "@/lib/server/kick";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const params = new URL(request.url).searchParams;
  const username = params.get("username")?.trim();
  if (!username) {
    return text("Missing username");
  }
  try {
    return text(await kickSongRequest(username, params.get("sr") ?? ""));
  } catch (error) {
    console.error("[kick] song-request failed", error);
    return text(`@${username} Something went wrong, please try again.`);
  }
}

export const GET = handle;
export const POST = handle;
