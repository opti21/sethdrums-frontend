import { requireMod } from "@/lib/server/auth";
import { json, route } from "@/lib/server/api";
import { setPrio } from "@/lib/server/prio";

export const dynamic = "force-dynamic";

// Query: ?requestID=123&newStatus=true|false
export const POST = route(async (request) => {
  await requireMod();
  const params = new URL(request.url).searchParams;
  const id = Number(params.get("requestID"));
  const newStatus = params.get("newStatus");
  if (!Number.isInteger(id) || (newStatus !== "true" && newStatus !== "false")) {
    return json({ success: false, error: "requestID and newStatus are required" }, 422);
  }
  const done = await setPrio(id, "mod_prio", newStatus === "true");
  if (!done) {
    return json({ success: false, error: "Someone else is already moving this request" }, 409);
  }
  return json({ success: true });
});
