"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Popover } from "@/components/ui/popover";
import { Pager } from "@/components/ui/pager";
import { EmptyState, Loading, Notice } from "@/components/ui/misc";
import { api, fetcher } from "@/lib/client/api";
import { youtubeUrl } from "@/lib/shared/youtube";

type BannedVideo = {
  id: number;
  youtube_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  notes: string;
  banned_by: string | null;
  banned_time: string | null;
};

const PAGE = 25;

export function BannedVideos() {
  const { data, error, mutate } = useSWR<BannedVideo[]>("/api/mod/videos/banned", fetcher);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((v) => !q || v.title.toLowerCase().includes(q) || v.channel.toLowerCase().includes(q));
  }, [data, search]);

  if (error) return <Notice tone="error">Couldn&apos;t load banned videos.</Notice>;
  if (!data) return <Loading label="Loading banned videos..." />;

  const pageCount = Math.ceil(filtered.length / PAGE);
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  async function unban(video: BannedVideo) {
    try {
      await api("/api/mod/videos/banned", { method: "DELETE", body: { videoID: video.id } });
      toast.success("Video unbanned");
      void mutate();
    } catch {
      toast.error("Couldn't unban the video");
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by title or channel"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        className="max-w-sm"
      />
      {rows.length === 0 ? (
        <EmptyState>No banned videos</EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.map((video) => (
            <li key={video.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <a href={youtubeUrl(video.youtube_id)} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {video.title}
                </a>
                <p className="text-xs text-ink-400">
                  {video.channel}
                  {video.banned_by && (
                    <>
                      {" "}· banned by <span className="text-ink-300">{video.banned_by}</span>
                    </>
                  )}
                  {video.banned_time && <> · {dayjs(video.banned_time).format("MMM D, YYYY")}</>}
                </p>
              </div>
              {video.notes && (
                <Popover trigger={<Button size="sm" variant="ghost">Notes</Button>}>
                  <p className="whitespace-pre-wrap">{video.notes}</p>
                </Popover>
              )}
              <Button size="sm" variant="teal" onClick={() => void unban(video)}>
                Unban
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageCount={pageCount} onPage={setPage} total={filtered.length} />
    </div>
  );
}
