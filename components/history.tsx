"use client";

import useSWR from "swr";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import { RequestCard } from "@/components/request-card";
import { Pager } from "@/components/ui/pager";
import { EmptyState, Loading, Notice } from "@/components/ui/misc";
import { fetcher } from "@/lib/client/api";
import type { RequestInfo } from "@/lib/shared/types";

const PAGE = 25;

function offsetFor(date: string) {
  // Minutes to add to UTC midnight to reach local midnight on that day.
  return new Date(`${date}T00:00:00`).getTimezoneOffset();
}

export function History() {
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Chicago";
  const [date, setDate] = useState("");
  const [page, setPage] = useState(0);
  const { data: days } = useSWR<string[]>(`/api/public/previously-played?datesOnly=true&tz=${encodeURIComponent(tz)}`, fetcher);

  const params = new URLSearchParams({ skip: String(page * PAGE), take: String(PAGE) });
  if (date) {
    params.set("date", date);
    params.set("offset", String(offsetFor(date)));
  }
  const { data, error } = useSWR<{ data: RequestInfo[]; total: number }>(
    `/api/public/previously-played?${params}`,
    fetcher
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="day" className="text-sm text-ink-300">
          Stream day
        </label>
        <select
          id="day"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setPage(0);
          }}
          className="h-10 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-sm"
        >
          <option value="">All streams</option>
          {(days ?? []).map((day) => (
            <option key={day} value={day}>
              {dayjs(day).format("ddd, MMM D, YYYY")}
            </option>
          ))}
        </select>
      </div>

      {error && <Notice tone="error">Couldn&apos;t load the history.</Notice>}
      {!data && !error && <Loading label="Loading previously played..." />}
      {data && data.data.length === 0 && <EmptyState>Nothing played on that day</EmptyState>}
      {data && data.data.length > 0 && (
        <ul className="space-y-2">
          {data.data.map((request) => (
            <li key={request.id}>
              <RequestCard
                request={request}
                publicView
                footer={
                  <p className="mt-1 text-xs text-ink-400">
                    Played {request.played_at ? dayjs(request.played_at).format("MMM D, YYYY h:mm A") : ""}
                  </p>
                }
                actions={
                  request.vod_link ? (
                    <a
                      href={request.vod_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 px-3 text-xs font-semibold hover:bg-white/5"
                    >
                      VOD <ExternalLink className="size-3" />
                    </a>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={page} pageCount={Math.ceil(data.total / PAGE)} onPage={setPage} total={data.total} />}
    </div>
  );
}
