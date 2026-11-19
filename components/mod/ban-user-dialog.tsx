"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { api } from "@/lib/client/api";

export type BanTarget = { twitch_id: string; twitch_username: string };

export function BanUserDialog({ target, onClose }: { target: BanTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function ban() {
    if (!target) return;
    setLoading(true);
    try {
      const res = await api<{ removedRequests: number }>("/api/mod/users/banned", {
        method: "POST",
        body: { ...target, reason: reason || null },
      });
      toast.success(`${target.twitch_username} banned. ${res.removedRequests} suggestion(s) removed.`);
      setReason("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't ban user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && onClose()}
      title="Ban from suggesting?"
      description={target ? `${target.twitch_username} won't be able to suggest songs, and their open suggestions are removed.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={ban}>
            Ban user
          </Button>
        </>
      }
    >
      <Label htmlFor="ban-reason">Reason (optional)</Label>
      <Textarea id="ban-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
    </Dialog>
  );
}
