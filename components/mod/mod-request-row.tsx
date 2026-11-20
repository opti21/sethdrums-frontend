"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crown, GripVertical, Swords, Trash2 } from "lucide-react";
import { RequestCard } from "@/components/request-card";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { PgPill } from "./pg";
import { cn } from "@/lib/client/cn";
import type { RequestInfo } from "@/lib/shared/types";

export type RowActions = {
  onPg: (request: RequestInfo) => void;
  onPrio: (
    request: RequestInfo,
    kind: "priority" | "mod_prio",
    on: boolean,
  ) => void;
  onDelete: (request: RequestInfo) => void;
  onPlay: (request: RequestInfo) => void;
};

export function ModNotes({ request }: { request: RequestInfo }) {
  const notes = request.Video.notes ?? "";
  if (!notes) return null;
  return (
    <div className="mt-2 max-w-xl rounded-md border-l-2 border-neon-gold/60 bg-white/[0.03] px-2.5 py-1 text-xs text-ink-300">
      {notes && (
        <p className="truncate">
          <span className="mr-1 text-[0.7rem] font-bold tracking-wider text-neon-gold/80 uppercase">
            Note
          </span>
          {notes}
          {notes.length > 80 && (
            <Popover
              trigger={
                <button className="ml-1 font-semibold text-neon-pink hover:underline">
                  more
                </button>
              }
            >
              <p className="whitespace-pre-wrap">{notes}</p>
            </Popover>
          )}
        </p>
      )}
    </div>
  );
}

/** Who checked (or is checking) the video. Sits under the buttons, away from "Suggested by". */
function CheckedBy({ request }: { request: RequestInfo }) {
  const pg = request.Video.PG_Status;
  const show = Boolean(pg?.checker) && pg?.status !== "NOT_CHECKED";
  // Always takes the same space, so every card is the same height.
  return (
    <p
      className={cn("basis-full text-right text-xs text-ink-300 sm:basis-auto", !show && "invisible")}
      aria-hidden={!show}
    >
      {pg?.status === "BEING_CHECKED" ? "Being checked by" : "Checked by"}
      <span className="block truncate font-semibold text-ink-100 sm:max-w-44" title={pg?.checker ?? undefined}>
        {show ? pg?.checker : "-"}
      </span>
    </p>
  );
}

export function ModRequestRow({
  request,
  view,
  dragDisabled,
  actions,
}: {
  request: RequestInfo;
  view: "mod" | "seth";
  dragDisabled: boolean;
  actions: RowActions;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
        <PgPill
          status={request.Video.PG_Status?.status}
          onClick={() => actions.onPg(request)}
        />
        <div className="flex gap-2">
          <Button
            size="iconLg"
            variant={prio ? "gold" : "outline"}
            aria-label={prio ? "Remove priority" : "Make priority"}
            title={prio ? "Remove priority" : "Make priority"}
            onClick={() => actions.onPrio(request, "priority", !prio)}
          >
            <Crown className={cn("size-5", !prio && "text-neon-gold")} />
          </Button>
          <Button
            size="iconLg"
            variant={modPrio ? "teal" : "outline"}
            aria-label={modPrio ? "Remove mod priority" : "Make mod priority"}
            title={modPrio ? "Remove mod priority" : "Make mod priority"}
            onClick={() => actions.onPrio(request, "mod_prio", !modPrio)}
          >
            <Swords className={cn("size-5", !modPrio && "text-neon-teal")} />
          </Button>
          <Button
            size="iconLg"
            variant="outline"
            aria-label="Delete suggestion"
            title="Delete"
            onClick={() => actions.onDelete(request)}
          >
            <Trash2 className="size-5 text-red-400" />
          </Button>
        </div>
        <CheckedBy request={request} />
      </>
    ) : (
      <>
        <PgPill status={request.Video.PG_Status?.status} />
        <CheckedBy request={request} />
      </>
    );

  return (
    <li
      ref={setNodeRef}
      id={`request-${request.id}`}
      style={style}
      className={cn("scroll-mt-24", isDragging && "relative z-10 opacity-80")}
    >
      <RequestCard
        request={request}
        leading={handle}
        actions={buttons}
        footer={<ModNotes request={request} />}
        onTitleClick={
          view === "seth" ? () => actions.onPlay(request) : undefined
        }
      />
    </li>
  );
}
