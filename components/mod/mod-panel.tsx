"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Ban, Plus, RotateCcw, SkipForward, UserX } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session";
import { RequestCard } from "@/components/request-card";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverClose } from "@/components/ui/popover";
import { EmptyState, Loading, Notice, SectionTitle } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import type { PgStatus, RequestInfo } from "@/lib/shared/types";
import { useModQueue } from "./use-mod-queue";
import { ModNotes, ModRequestRow, type RowActions } from "./mod-request-row";
import { PgPill } from "./pg";
import { PgCheckerDialog } from "./pg-checker-dialog";
import { AddRequestDialog } from "./add-request-dialog";

export function ModPanel({ view }: { view: "mod" | "seth" }) {
  const { user } = useSession();
  const me = user?.username ?? "";
  const { queue, setQueue, error, refresh, modsOnline, lockedBy, lockedByOther, connected, draggingRef, markLocalChange } =
    useModQueue(me);

  const [pgTarget, setPgTarget] = useState<{ request: RequestInfo; previous: PgStatus } | null>(null);
  const [pgConfirm, setPgConfirm] = useState<RequestInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RequestInfo | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!queue) {
    return error ? <Notice tone="error">{error}</Notice> : <Loading label="Loading the suggestion list..." />;
  }

  async function run(label: string, action: () => Promise<unknown>, success?: string) {
    setBusy(label);
    try {
      await action();
      if (success) toast.success(success);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Shows the priority change right away, using the same placement rule as
   * the server, then saves it. A failed save puts the list back.
   */
  async function changePrio(request: RequestInfo, kind: "priority" | "mod_prio", on: boolean) {
    if (!queue) return;
    const previous = queue;
    // Same placement as the server: see lib/server/prio.ts.
    const rest = previous.order.filter((r) => r.id !== request.id);
    const at = rest.filter((r) => (kind === "priority" && on ? r.priority : r.priority || r.mod_prio)).length;
    const updated: RequestInfo =
      kind === "priority"
        ? on
          ? { ...request, priority: true, mod_prio: false }
          : { ...request, priority: false, mod_prio: false, raffle_prio: false }
        : on
          ? { ...request, mod_prio: true, priority: false }
          : { ...request, mod_prio: false };
    markLocalChange();
    setQueue({ ...previous, order: [...rest.slice(0, at), updated, ...rest.slice(at)] });
    try {
      await api(
        `/api/mod/request/${kind === "priority" ? "make-prio" : "make-mod-prio"}?requestID=${request.id}&newStatus=${on}`,
        { method: "POST" }
      );
      toast.success(on ? (kind === "priority" ? "Marked priority" : "Marked mod priority") : "Priority removed");
    } catch (err) {
      markLocalChange();
      setQueue(previous);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
    void refresh();
  }

  /** Shows the song as now playing right away, then saves it. */
  async function playNow(request: RequestInfo) {
    if (!queue) return;
    const previous = queue;
    markLocalChange();
    setQueue({ ...previous, now_playing: request, order: previous.order.filter((r) => r.id !== request.id) });
    try {
      await api("/api/mod/queue/now-playing", { method: "POST", body: { requestID: request.id } });
    } catch (err) {
      markLocalChange();
      setQueue(previous);
      toast.error(err instanceof Error ? err.message : "Couldn't play that song");
    }
    void refresh();
  }

  /** Puts the now playing song back in the list right away, using the server's placement rule. */
  async function returnToList(request: RequestInfo) {
    if (!queue) return;
    const previous = queue;
    const at = request.priority
      ? 0
      : previous.order.filter((r) => r.priority || (!request.mod_prio && r.mod_prio)).length;
    const order = [...previous.order];
    order.splice(Math.min(at, order.length), 0, request);
    markLocalChange();
    setQueue({ ...previous, now_playing: null, order });
    try {
      await api("/api/mod/request/return-to-queue", { method: "POST", body: { requestID: request.id } });
      toast.success("Returned to the list");
    } catch (err) {
      markLocalChange();
      setQueue(previous);
      toast.error(err instanceof Error ? err.message : "Couldn't return it to the list");
    }
    void refresh();
  }

  async function openPg(request: RequestInfo) {
    const pg = request.Video.PG_Status;
    if (!pg) return;
    if (pg.status === "BEING_CHECKED" && pg.checker && pg.checker !== me) {
      setPgConfirm(request);
      return;
    }
    startPg(request);
  }

  function startPg(request: RequestInfo) {
    const pg = request.Video.PG_Status;
    if (!pg) return;
    setPgTarget({ request, previous: pg.status === "BEING_CHECKED" ? "NOT_CHECKED" : pg.status });
    void api("/api/mod/pg-status", { method: "PUT", body: { pgStatusID: pg.id, status: "BEING_CHECKED" } }).catch(
      () => toast.error("Couldn't mark it as being checked")
    );
  }

  const actions: RowActions = {
    onPg: openPg,
    onPrio: (request, kind, on) => void changePrio(request, kind, on),
    onDelete: setDeleteTarget,
    onPlay: (request) => void playNow(request),
  };

  async function onDragStart() {
    draggingRef.current = true;
    markLocalChange();
    void api("/api/mod/trigger", { method: "POST", body: { eventName: "lock-queue" } }).catch(() => {});
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (queue && over && active.id !== over.id) {
      const from = queue.order.findIndex((r) => String(r.id) === active.id);
      const to = queue.order.findIndex((r) => String(r.id) === over.id);
      const order = arrayMove(queue.order, from, to);
      markLocalChange();
      setQueue({ ...queue, order });
      // Still treated as dragging until the save lands, so no fetch of the
      // old order can flash back in.
      try {
        await api("/api/mod/queue", { method: "POST", body: { order: order.map((r) => String(r.id)) } });
        toast.success("Order saved");
      } catch {
        toast.error("Couldn't save the new order");
      }
    }
    draggingRef.current = false;
    void api("/api/mod/trigger", { method: "POST", body: { eventName: "unlock-queue" } }).catch(() => {});
    void refresh();
  }

  const notChecked = queue.order.filter((r) => (r.Video.PG_Status?.status ?? "NOT_CHECKED") === "NOT_CHECKED").length;
  const nowPlaying = queue.now_playing;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <section className="min-w-0 space-y-6">
        <StatusBanner flags={queue} />

        {error && <Notice tone="warn">{error}</Notice>}

        <div>
          <SectionTitle>Now playing</SectionTitle>
          {nowPlaying ? (
            <RequestCard
              request={nowPlaying}
              highlight
              footer={<ModNotes request={nowPlaying} />}
              actions={
                <>
                  {view === "mod" ? (
                    <PgPill status={nowPlaying.Video.PG_Status?.status} onClick={() => void openPg(nowPlaying)} />
                  ) : (
                    <PgPill status={nowPlaying.Video.PG_Status?.status} />
                  )}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busy === "played"}
                      onClick={() =>
                        void run("played", () => api("/api/mod/queue/now-playing", { method: "DELETE" }), "Marked played")
                      }
                    >
                      <SkipForward className="size-4" /> Played
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Return to list"
                      onClick={() => void returnToList(nowPlaying)}
                    >
                      <RotateCcw className="size-4" /> Return
                    </Button>
                  </div>
                </>
              }
            />
          ) : (
            <EmptyState>Nothing playing{view === "seth" ? ". Click a title below to play it." : ""}</EmptyState>
          )}
        </div>

        <div>
          <SectionTitle
            status={
              <>
                {lockedBy && (
                  <span className="inline-flex h-7 items-center rounded-full border border-neon-gold/40 bg-neon-gold/10 px-2.5 text-xs font-semibold text-amber-100">
                    {lockedBy === me ? "You're" : `${lockedBy} is`} reordering
                  </span>
                )}
                {view === "mod" && notChecked > 0 && (
                  <button
                    type="button"
                    title="Jump to the first one"
                    className="inline-flex h-7 items-center rounded-full border border-neon-gold/40 bg-neon-gold/10 px-2.5 text-xs font-semibold text-amber-100 transition hover:brightness-125"
                    onClick={() => {
                      const first = queue.order.find(
                        (r) => (r.Video.PG_Status?.status ?? "NOT_CHECKED") === "NOT_CHECKED"
                      );
                      const row = first && document.getElementById(`request-${first.id}`);
                      if (!row) return;
                      row.scrollIntoView({ behavior: "smooth", block: "center" });
                      row.animate(
                        [{ boxShadow: "0 0 0 2px rgb(255 61 154 / 0.9)" }, { boxShadow: "0 0 0 2px transparent" }],
                        { duration: 1600, easing: "ease-out" }
                      );
                    }}
                  >
                    {notChecked} need{notChecked === 1 ? "s" : ""} a PG check
                  </button>
                )}
              </>
            }
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" /> Add
                </Button>
                {view === "mod" && (
                  <>
                    <Popover
                      trigger={
                        <Button size="sm" variant="outline" className="text-red-300">
                          Clear non-prio
                        </Button>
                      }
                    >
                      <p className="mb-3">Remove every suggestion that isn&apos;t priority or mod priority?</p>
                      <PopoverClose asChild>
                        <Button
                          variant="danger"
                          className="w-full justify-center"
                          loading={busy === "clear"}
                          onClick={() =>
                            void run("clear", () => api("/api/mod/queue/clearQueue", { method: "POST" }), "Non-prio suggestions cleared")
                          }
                        >
                          Clear non-prio
                        </Button>
                      </PopoverClose>
                    </Popover>
                    <Link href="/mod/banned-videos" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white">
                      <Ban className="size-4" /> Videos
                    </Link>
                    <Link href="/mod/banned-users" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white">
                      <UserX className="size-4" /> Users
                    </Link>
                  </>
                )}
              </div>
            }
          >
            Up next <span className="ml-1 text-ink-400">({queue.order.length})</span>
          </SectionTitle>

          {queue.order.length === 0 ? (
            <EmptyState>No suggestions in the list</EmptyState>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={() => {
                draggingRef.current = false;
                void api("/api/mod/trigger", { method: "POST", body: { eventName: "unlock-queue" } }).catch(() => {});
                void refresh();
              }}
            >
              <SortableContext items={queue.order.map((r) => String(r.id))} strategy={verticalListSortingStrategy}>
                <ol className="space-y-2">
                  {queue.order.map((request, index) => (
                    <ModRequestRow
                      key={request.id}
                      request={request}
                      position={index + 1}
                      view={view}
                      dragDisabled={lockedByOther}
                      actions={actions}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>

      <aside className="space-y-3">
        <SectionTitle>Mods online</SectionTitle>
        <p className="flex items-center gap-2 text-xs text-ink-400">
          <span className={connected ? "size-2 rounded-full bg-neon-teal" : "size-2 rounded-full bg-ink-600"} />
          {connected ? "Live updates on" : "Live updates off, refreshing every 20s"}
        </p>
        <ul className="space-y-2">
          {modsOnline.map((mod) => (
            <li key={mod.id} className="flex items-center gap-2">
              {mod.picture ? (
                <Image src={mod.picture} alt="" width={28} height={28} className="size-7 rounded-full" unoptimized />
              ) : (
                <span className="size-7 rounded-full bg-ink-700" />
              )}
              <span className="truncate text-sm font-medium">{mod.username}</span>
            </li>
          ))}
        </ul>
      </aside>

      <AddRequestDialog open={addOpen} onOpenChange={setAddOpen} taken={queue.order.map((r) => r.Video.youtube_id)} />
      <PgCheckerDialog
        request={pgTarget?.request ?? null}
        previousStatus={pgTarget?.previous ?? "NOT_CHECKED"}
        onClose={() => {
          setPgTarget(null);
          void refresh();
        }}
      />
      <Dialog
        open={Boolean(pgConfirm)}
        onOpenChange={(open) => !open && setPgConfirm(null)}
        title="Someone's already checking this"
        description={`${pgConfirm?.Video.PG_Status?.checker ?? "Another mod"} is checking it right now. Check it anyway?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPgConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pgConfirm) startPg(pgConfirm);
                setPgConfirm(null);
              }}
            >
              Check anyway
            </Button>
          </>
        }
      />
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this suggestion?"
        description={deleteTarget ? `${deleteTarget.Video.title} from ${deleteTarget.requested_by}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy === "delete"}
              onClick={() =>
                deleteTarget &&
                void run(
                  "delete",
                  async () => {
                    await api("/api/mod/request", { method: "DELETE", body: { requestID: deleteTarget.id } });
                    setDeleteTarget(null);
                  },
                  "Suggestion deleted"
                )
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
