"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import type { PgStatus, RequestInfo } from "@/lib/shared/types";
import { youtubeUrl } from "@/lib/shared/youtube";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type Props = {
  request: RequestInfo | null;
  /** The status before this mod opened the checker, restored on cancel. */
  previousStatus: PgStatus;
  onClose: () => void;
};

export function PgCheckerDialog({ request, previousStatus, onClose }: Props) {
  const [rateState, setRateState] = useState<{ videoId?: number; rate: number }>({ rate: 1 });
  const [notesState, setNotesState] = useState<{ videoId?: number; text: string }>({ text: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const video = request?.Video;
  const pgId = video?.PG_Status?.id;

  // Both reset when a different video is opened.
  const rate = rateState.videoId === video?.id ? rateState.rate : 1;
  const setRate = (value: number) => setRateState({ videoId: video?.id, rate: value });
  const notes = notesState.videoId === video?.id ? notesState.text : (video?.notes ?? "");
  const setNotes = (text: string) => setNotesState({ videoId: video?.id, text });

  async function setStatus(status: PgStatus) {
    if (!pgId) return;
    await api("/api/mod/pg-status", { method: "PUT", body: { pgStatusID: pgId, status } });
  }

  async function decide(status: PgStatus) {
    setBusy(status);
    try {
      await setStatus(status);
      toast.success(`Marked ${status === "PG" ? "PG" : "Non PG"}`);
      onClose();
    } catch {
      toast.error("Couldn't update the PG status");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    try {
      await setStatus(previousStatus);
    } catch {
      toast.error("Couldn't reset the PG status");
    }
    onClose();
  }

  async function ban() {
    if (!request || !video) return;
    setBusy("ban");
    try {
      await api("/api/mod/videos/banned", { method: "POST", body: { requestID: request.id, videoID: video.id } });
      toast.success("Video banned and removed from the list");
      onClose();
    } catch {
      toast.error("Couldn't ban the video");
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    if (!video) return;
    setBusy("notes");
    try {
      await api("/api/mod/videos/notes", { method: "POST", body: { videoID: video.id, notes } });
      toast.success("Notes saved");
    } catch {
      toast.error("Couldn't save notes");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => !open && void cancel()}
      title="PG check"
      description={request ? `Suggested by ${request.requested_by}` : undefined}
      wide
      footer={
        <>
          <Button variant="danger" loading={busy === "ban"} onClick={ban} className="mr-auto">
            Ban video
          </Button>
          <Button variant="outline" onClick={() => void cancel()}>
            Cancel
          </Button>
          <Button className="bg-red-600 text-white hover:bg-red-500" loading={busy === "NON_PG"} onClick={() => decide("NON_PG")}>
            Non PG
          </Button>
          <Button variant="teal" loading={busy === "PG"} onClick={() => decide("PG")}>
            PG
          </Button>
        </>
      }
    >
      {video && (
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Copy title"
              onClick={() => {
                void navigator.clipboard.writeText(video.title);
                toast.success("Title copied");
              }}
            >
              <Copy className="size-4" />
            </Button>
            <p className="pt-1.5 font-semibold">{video.title}</p>
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <ReactPlayer
              src={youtubeUrl(video.youtube_id)}
              controls
              playbackRate={rate}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {RATES.map((value) => (
              <button
                key={value}
                onClick={() => setRate(value)}
                className={cn(
                  "h-8 min-w-12 rounded-md px-2 text-sm font-semibold",
                  rate === value ? "bg-neon-blue text-ink-950" : "bg-ink-700 hover:bg-ink-600"
                )}
              >
                {value}x
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="video-notes">Video notes (mods only)</Label>
            <Textarea id="video-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button className="mt-2" size="sm" loading={busy === "notes"} onClick={saveNotes}>
              Save notes
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
