import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { getModQueue } from "@/lib/server/queue-view";
import { setOrder } from "@/lib/server/queue";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireMod();
  return json(await getModQueue());
});

// Body: { order: string[] } (request ids in their new order).
export const POST = route(async (request) => {
  await requireMod();
  const body = await readJson<{ order?: unknown; updatedOrder?: unknown }>(request);
  const raw = Array.isArray(body.order) ? body.order : body.updatedOrder;
  if (!Array.isArray(raw)) {
    return json({ success: false, error: "order must be an array" }, 422);
  }
  const order = raw.map((item) =>
    typeof item === "object" && item && "id" in item ? String((item as { id: unknown }).id) : String(item)
  );
  await setOrder(order);
  return json({ success: true });
});
