/**
 * Pure rules for the suggestion list order. Used by the Redis queue store,
 * the queue Durable Object (queue-worker/) and the chat bot's copy, so every
 * backend puts songs in the same place.
 */

export type PrioKind = "priority" | "mod_prio" | "none";

/** Where in its group a song goes: first in the group, or last. */
export type GroupEdge = "start" | "end";

/** Move one entry of a list to a new index. */
export function move<T>(list: T[], from: number, to: number): T[] {
  const result = [...list];
  const [item] = result.splice(from, 1);
  result.splice(Math.max(0, to), 0, item);
  return result;
}

/**
 * Merge a submitted order with the live one: ids that left the list are
 * dropped, and ids added since the caller read the list keep their place
 * instead of vanishing.
 */
export function mergeOrder(current: string[], submitted: string[]) {
  const live = new Set(current);
  const order = [...new Set(submitted.map(String))].filter((id) => live.has(id));
  const seen = new Set(order);
  current.forEach((id, index) => {
    if (!seen.has(id)) order.splice(Math.min(index, order.length), 0, id);
  });
  return order;
}

/** Index just after the last entry of `order` that matches, or 0 if none do. */
function afterLast(order: string[], matches: (id: string) => boolean) {
  for (let index = order.length - 1; index >= 0; index--) {
    if (matches(order[index])) return index + 1;
  }
  return 0;
}

/**
 * Put `id` at the start or end of its priority group in the live order.
 *
 * Groups run top to bottom: priority, then mod priority, then everything
 * else. A group's start is just after the last song of the groups above it,
 * and its end is just after its own last song. Positions come from where
 * songs actually sit in the list, not from counting how many priority songs
 * exist, so a song a mod dragged out of place can't shift the slot.
 *
 * `kinds` holds the priority kind of other songs in the list; ids missing
 * from it count as "none". The id itself is inserted if it isn't listed.
 */
export function placeInGroup(
  order: string[],
  kinds: Record<string, PrioKind | undefined>,
  id: string,
  kind: PrioKind,
  edge: GroupEdge
): string[] {
  const rest = order.filter((item) => item !== id);
  const kindOf = (item: string) => kinds[item] ?? "none";
  const above: PrioKind[] = kind === "priority" ? [] : kind === "mod_prio" ? ["priority"] : ["priority", "mod_prio"];
  const upTo: PrioKind[] = [...above, kind];

  let at: number;
  if (edge === "start") {
    at = above.length === 0 ? 0 : afterLast(rest, (item) => above.includes(kindOf(item)));
  } else {
    at = kind === "none" ? rest.length : afterLast(rest, (item) => upTo.includes(kindOf(item)));
  }
  rest.splice(Math.min(at, rest.length), 0, id);
  return rest;
}

/** Order with the given ids removed. */
export function withoutIds(order: string[], ids: string[]) {
  const drop = new Set(ids.map(String));
  return order.filter((item) => !drop.has(item));
}
