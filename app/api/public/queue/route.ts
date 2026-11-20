import { json, route } from "@/lib/server/api";
import { getPublicQueue } from "@/lib/server/queue-view";

export const dynamic = "force-dynamic";

export const GET = route(async () => json(await getPublicQueue()));
