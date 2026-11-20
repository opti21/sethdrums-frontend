"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session";
import { RequestCard } from "@/components/request-card";
import { StatusBanner } from "@/components/status-banner";
import { SuggestDialog } from "./suggest-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Loading, Notice, SectionTitle } from "@/components/ui/misc";
import { api, fetcher } from "@/lib/client/api";
import type { PublicQueue as PublicQueueData, RequestInfo } from "@/lib/shared/types";

export function PublicQueue() {
  const { user } = useSession();
  const { data, error, mutate } = useSWR<PublicQueueData>("/api/public/queue", fetcher, {
    refreshInterval: 5000,
  });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [toDelete, setToDelete] = useState<RequestInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (error && !data) {
    return <Notice tone="error">Couldn&apos;t load the suggestion list. Retrying...</Notice>;
  }
  if (!data) {
    return <Loading label="Loading the suggestion list..." />;
  }

  const mine = user ? data.order.find((request) => request.requested_by_id === user.twitchId) : undefined;

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api("/api/public/request", { method: "DELETE", body: { requestID: toDelete.id } });
      toast.success("Your suggestion was removed");
      setToDelete(null);
      void mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove it");
    } finally {
      setDeleting(false);
    }
  }

  let cta: React.ReactNode;
  if (!data.is_open) {
    cta = null;
  } else if (!user) {
    cta = (
      <a
        href="/api/auth/login?returnTo=/"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#9146ff] px-4 text-sm font-semibold text-white hover:brightness-110"
      >
        Sign in with Twitch to suggest
      </a>
    );
  } else if (data.is_paused) {
    cta = <p className="text-sm text-ink-300">Suggestions are paused for a moment.</p>;
  } else if (data.is_subOnly) {
    cta = <p className="text-sm text-ink-300">Subs only right now. Suggest in chat with !sr.</p>;
  } else if (mine) {
    cta = <p className="text-sm text-ink-300">Your suggestion is #{data.order.indexOf(mine) + 1} in the list.</p>;
  } else {
    cta = (
      <Button variant="primary" onClick={() => setSuggestOpen(true)}>
        <Plus className="size-4" /> Suggest a song
      </Button>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="space-y-6">
        <StatusBanner flags={data} />

        <div>
          <SectionTitle>Now playing</SectionTitle>
          {data.now_playing ? (
            <RequestCard request={data.now_playing} publicView highlight />
          ) : (
            <EmptyState>Nothing playing right now</EmptyState>
          )}
        </div>

        {data.is_open && (
          <div>
            <SectionTitle action={cta}>
              Up next <span className="ml-1 text-ink-400">({data.order.length})</span>
            </SectionTitle>
            {data.order.length === 0 ? (
              <EmptyState>The list is empty. Be the first!</EmptyState>
            ) : (
              <ol className="space-y-2">
                {data.order.map((request) => (
                  <li key={request.id}>
                    <RequestCard
                      request={request}
                      publicView
                      highlight={request.id === mine?.id}
                      actions={
                        request.id === mine?.id ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remove my suggestion"
                            onClick={() => setToDelete(request)}
                          >
                            <Trash2 className="size-4 text-red-400" />
                          </Button>
                        ) : undefined
                      }
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>

      <aside>
        <SectionTitle
          action={
            <Link href="/previously-played" className="text-sm font-semibold text-neon-pink hover:underline">
              Full history
            </Link>
          }
        >
          Recently played
        </SectionTitle>
        <div className="space-y-2">
          {data.recentlyPlayed.length === 0 ? (
            <EmptyState>Nothing played yet</EmptyState>
          ) : (
            data.recentlyPlayed.map((request) => <RequestCard key={request.id} request={request} publicView />)
          )}
        </div>
      </aside>

      <SuggestDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        taken={data.order.map((request) => request.Video.youtube_id)}
        onAdded={() => void mutate()}
      />
      <Dialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Remove your suggestion?"
        description={toDelete?.Video.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={deleting} onClick={remove}>
              Remove
            </Button>
          </>
        }
      />
    </div>
  );
}
