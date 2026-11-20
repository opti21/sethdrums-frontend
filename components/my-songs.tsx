"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Crosshair, Pause, Play, SkipBack, SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState, Loading, Notice } from "@/components/ui/misc";
import { api, fetcher } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { youtubeUrl } from "@/lib/shared/youtube";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type SavedSong = { id: number; youtube_id: string; title: string; thumbnail: string };

export function MySongs() {
  const { data, error, mutate } = useSWR<SavedSong[]>("/api/public/saved-songs", fetcher, {
    revalidateOnFocus: false,
  });
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("sortByRecent");
    return stored === null ? true : Boolean(JSON.parse(stored));
  });
  const currentRef = useRef<HTMLLIElement | null>(null);
  const skippedInARow = useRef(0);

  // Saved songs come back oldest first.
  const sorted = useMemo(() => (newestFirst ? [...(data ?? [])].reverse() : [...(data ?? [])]), [data, newestFirst]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? sorted.filter((song) => song.title.toLowerCase().includes(q)) : sorted;
  }, [sorted, search]);
  // Falls back to the first song when nothing is picked or the pick was removed.
  const current = sorted.find((song) => song.id === currentId) ?? sorted[0] ?? null;
  const activeId = current?.id ?? null;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  function step(delta: 1 | -1) {
    if (sorted.length === 0) return;
    const index = sorted.findIndex((song) => song.id === activeId);
    const next = (index + delta + sorted.length) % sorted.length;
    setCurrentId(sorted[next].id);
  }

  function skipUnavailable() {
    if (!current) return;
    skippedInARow.current += 1;
    toast.warning(`${current.title} is unavailable and was skipped`);
    if (skippedInARow.current >= sorted.length) {
      skippedInARow.current = 0;
      setPlaying(false);
      return;
    }
    step(1);
  }

  async function remove(song: SavedSong) {
    try {
      await api("/api/public/saved-songs", { method: "DELETE", body: { video_id: song.id } });
      if (song.id === activeId) step(1);
      toast.success("Removed from your saved songs");
      void mutate();
    } catch {
      toast.error("Couldn't remove it");
    }
  }

  if (error) return <Notice tone="error">Couldn&apos;t load your saved songs.</Notice>;
  if (!data) return <Loading label="Loading your saved songs..." />;
  if (data.length === 0) {
    return <EmptyState>No saved songs yet. Type !save in chat while a song is playing to keep it here.</EmptyState>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-3">
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
          {current && (
            <ReactPlayer
              key={current.id}
              src={youtubeUrl(current.youtube_id)}
              playing={playing}
              controls
              style={{ width: "100%", height: "100%" }}
              onPlay={() => {
                skippedInARow.current = 0;
                setPlaying(true);
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => (autoplay ? step(1) : setPlaying(false))}
              onError={skipUnavailable}
            />
          )}
        </div>
        <p className="truncate text-center font-semibold">{current?.title}</p>
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" aria-label="Previous" onClick={() => step(-1)}>
            <SkipBack className="size-4" />
          </Button>
          <Button size="icon" variant="primary" className="size-12 justify-center rounded-full" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button size="icon" variant="outline" aria-label="Next" onClick={() => step(1)}>
            <SkipForward className="size-4" />
          </Button>
        </div>
        <label className="flex items-center justify-center gap-2 text-sm text-ink-300">
          <input type="checkbox" checked={autoplay} onChange={() => setAutoplay((a) => !a)} className="size-4 accent-neon-pink" />
          Autoplay next song
        </label>
      </div>

      <div className="space-y-3">
        <Input placeholder="Search your songs" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 justify-center"
            onClick={() => (search ? setSearch("") : currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }))}
          >
            <Crosshair className="size-4" /> Current song
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 justify-center"
            onClick={() =>
              setNewestFirst((value) => {
                localStorage.setItem("sortByRecent", JSON.stringify(!value));
                return !value;
              })
            }
          >
            <ArrowDownUp className="size-4" /> {newestFirst ? "Newest first" : "Oldest first"}
          </Button>
        </div>
        <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
          {visible.map((song) => {
            const selected = song.id === activeId;
            return (
              <li
                key={song.id}
                ref={selected ? currentRef : undefined}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition",
                  selected ? "border-neon-pink/60 bg-neon-pink/10" : "border-white/5 bg-ink-850/70 hover:bg-ink-800"
                )}
                onClick={() => {
                  setCurrentId(song.id);
                  setPlaying(true);
                }}
              >
                <span className={cn("min-w-0 flex-1 truncate text-sm", selected && "font-semibold text-white")}>{song.title}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove from saved songs"
                  onClick={(event) => {
                    event.stopPropagation();
                    void remove(song);
                  }}
                >
                  <Trash2 className="size-4 text-red-400" />
                </Button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="py-6 text-center text-sm text-ink-400">No songs match</li>}
        </ul>
      </div>
    </div>
  );
}
