import { text } from "@/lib/server/api";
import { kickReplace } from "@/lib/server/kick";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const params = new URL(request.url).searchParams;
  const username = params.get("username")?.trim();
  if (!username) {
    return text("Missing username");
  }
  try {
    return text(await kickReplace(username, params.get("sr") ?? ""));
  } catch (error) {
    console.error("[kick] replace failed", error);
    return text(`@${username} Something went wrong, please try again.`);
  }
}

export const GET = handle;
export const POST = handle;
