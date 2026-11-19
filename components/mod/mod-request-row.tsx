"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crown, GripVertical, Swords, Trash2, UserX } from "lucide-react";
import { RequestCard } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { PgPill } from "./pg";
import { cn } from "@/lib/client/cn";
import type { RequestInfo } from "@/lib/shared/types";

export type RowActions = {
  onPg: (request: RequestInfo) => void;
  onPrio: (request: RequestInfo, kind: "priority" | "mod_prio", on: boolean) => void;
  onDelete: (request: RequestInfo) => void;
  onBanUser: (request: RequestInfo) => void;
  onPlay: (request: RequestInfo) => void;
};

export function ModNotes({ request }: { request: RequestInfo }) {
  const notes = request.Video.notes ?? "";
  const pg = request.Video.PG_Status;
  if (!notes && !pg?.checker) return null;
  return (
    <div className="mt-1 space-y-0.5 text-xs text-ink-300">
      {notes && (
        <p className="line-clamp-2">
          <span className="font-semibold text-neon-gold">Notes:</span> {notes}
          {notes.length > 80 && (
            <Popover trigger={<button className="ml-1 font-semibold text-neon-pink hover:underline">more</button>}>
              <p className="whitespace-pre-wrap">{notes}</p>
            </Popover>
          )}
        </p>
      )}
      {pg?.checker && (
        <p>
          {pg.status === "BEING_CHECKED" ? "Being checked" : "Checked"} by{" "}
          <span className="font-semibold text-ink-100">{pg.checker}</span>
        </p>
      )}
    </div>
  );
}

export function ModRequestRow({
  request,
  position,
  view,
  dragDisabled,
  actions,
}: {
  request: RequestInfo;
  position: number;
  view: "mod" | "seth";
  dragDisabled: boolean;
  actions: RowActions;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(request.id),
    disabled: dragDisabled || view === "seth",
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handle =
    view === "mod" ? (
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        disabled={dragDisabled}
        className="-ml-1 flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-ink-400 hover:text-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
      >
        <GripVertical className="size-5" />
      </button>
    ) : undefined;

  const prio = request.priority;
  const modPrio = Boolean(request.mod_prio);

  const buttons =
    view === "mod" ? (
      <>
        <PgPill status={request.Video.PG_Status?.status} onClick={() => actions.onPg(request)} />
        <div className="flex gap-1">
          {!modPrio && (
            <Button
              size="icon"
              variant={prio ? "gold" : "outline"}
              aria-label={prio ? "Remove priority" : "Make priority"}
              title={prio ? "Remove priority" : "Make priority"}
              onClick={() => actions.onPrio(request, "priority", !prio)}
            >
              <Crown className={cn("size-4", !prio && "text-neon-gold")} />
            </Button>
          )}
          {!prio && (
            <Button
              size="icon"
              variant={modPrio ? "teal" : "outline"}
              aria-label={modPrio ? "Remove mod priority" : "Make mod priority"}
              title={modPrio ? "Remove mod priority" : "Make mod priority"}
              onClick={() => actions.onPrio(request, "mod_prio", !modPrio)}
            >
              <Swords className={cn("size-4", !modPrio && "text-neon-teal")} />
            </Button>
          )}
          <Button size="icon" variant="outline" aria-label="Delete suggestion" title="Delete" onClick={() => actions.onDelete(request)}>
            <Trash2 className="size-4 text-red-400" />
          </Button>
          {request.requested_by_id && (
            <Button size="icon" variant="outline" aria-label="Ban user" title="Ban user from suggesting" onClick={() => actions.onBanUser(request)}>
              <UserX className="size-4 text-red-400" />
            </Button>
          )}
        </div>
      </>
    ) : (
      <PgPill status={request.Video.PG_Status?.status} />
    );

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "relative z-10 opacity-80")}>
      <RequestCard
        request={request}
        position={position}
        leading={handle}
        actions={buttons}
        footer={<ModNotes request={request} />}
        onTitleClick={view === "seth" ? () => actions.onPlay(request) : undefined}
      />
    </li>
  );
}
