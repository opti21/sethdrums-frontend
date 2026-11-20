"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Pager } from "@/components/ui/pager";
import { EmptyState, Loading, Notice, SectionTitle } from "@/components/ui/misc";
import { api, ApiError, fetcher } from "@/lib/client/api";

type BannedUser = {
  id: number;
  twitch_id: string;
  twitch_username: string;
  reason: string | null;
  banned_by: string;
  banned_time: string;
};

const PAGE = 25;

export function BannedUsers() {
  const { data, error, mutate } = useSWR<BannedUser[]>("/api/mod/users/banned", fetcher);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [byId, setById] = useState(false);
  const [username, setUsername] = useState("");
  const [twitchId, setTwitchId] = useState("");
  const [reason, setReason] = useState("");
  const [banning, setBanning] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((u) => !q || u.twitch_username.toLowerCase().includes(q));
  }, [data, search]);

  if (error) return <Notice tone="error">Couldn&apos;t load banned users.</Notice>;
  if (!data) return <Loading label="Loading banned users..." />;

  const pageCount = Math.ceil(filtered.length / PAGE);
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  async function ban(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || (byId && !twitchId.trim())) {
      toast.error(byId ? "Enter both the Twitch id and username" : "Enter a username");
      return;
    }
    setBanning(true);
    try {
      let target = { twitch_id: twitchId.trim(), twitch_username: username.trim() };
      if (!byId) {
        const res = await api<{ user: { id: string; display_name: string } }>(
          `/api/mod/users/lookup?username=${encodeURIComponent(username.trim())}`
        );
        target = { twitch_id: res.user.id, twitch_username: res.user.display_name };
      }
      const res = await api<{ removedRequests: number }>("/api/mod/users/banned", {
        method: "POST",
        body: { ...target, reason: reason || null },
      });
      toast.success(`Banned ${target.twitch_username}. ${res.removedRequests} suggestion(s) removed.`);
      setUsername("");
      setTwitchId("");
      setReason("");
      void mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't ban user");
    } finally {
      setBanning(false);
    }
  }

  async function unban(user: BannedUser) {
    try {
      await api("/api/mod/users/banned", { method: "DELETE", body: { twitch_id: user.twitch_id } });
      toast.success(`Unbanned ${user.twitch_username}`);
      void mutate();
    } catch {
      toast.error("Couldn't unban user");
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={ban} className="card space-y-4 p-4">
        <SectionTitle
          action={
            <Button type="button" size="sm" variant="ghost" onClick={() => setById((value) => !value)}>
              {byId ? "Look up by username" : "Enter a Twitch id instead"}
            </Button>
          }
        >
          Ban a user
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {byId && (
            <div>
              <Label htmlFor="ban-id">Twitch id</Label>
              <Input id="ban-id" value={twitchId} onChange={(event) => setTwitchId(event.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="ban-name">Twitch username</Label>
            <Input id="ban-name" value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className={byId ? "" : "sm:col-span-2"}>
            <Label htmlFor="ban-why">Reason (optional)</Label>
            <Input id="ban-why" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        </div>
        <Button type="submit" variant="danger" loading={banning}>
          Ban user
        </Button>
      </form>

      <div className="space-y-4">
        <Input
          placeholder="Search banned users"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        {rows.length === 0 ? (
          <EmptyState>No banned users</EmptyState>
        ) : (
          <ul className="space-y-2">
            {rows.map((user) => (
              <li key={user.id} className="card flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{user.twitch_username}</p>
                  <p className="text-xs text-ink-400">
                    Banned by <span className="text-ink-300">{user.banned_by}</span> ·{" "}
                    {dayjs(user.banned_time).format("MMM D, YYYY")}
                    {user.reason && <> · {user.reason}</>}
                  </p>
                </div>
                <Button size="sm" variant="teal" onClick={() => void unban(user)}>
                  Unban
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} pageCount={pageCount} onPage={setPage} total={filtered.length} />
      </div>
    </div>
  );
}
