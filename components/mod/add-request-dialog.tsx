"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { api } from "@/lib/client/api";
import { parseYouTubeId } from "@/lib/shared/youtube";

export function AddRequestDialog({
  open,
  onOpenChange,
  taken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taken: string[];
}) {
  const [link, setLink] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const id = parseYouTubeId(link);
  const linkError = !id ? "Paste a YouTube link" : taken.includes(id) ? "Already in the list" : null;
  const nameError = requestedBy.trim() ? null : "Who suggested it?";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (linkError || nameError) return;
    setLoading(true);
    try {
      await api("/api/mod/request", { method: "POST", body: { ytLink: link, requestedBy } });
      toast.success("Suggestion added");
      setLink("");
      setRequestedBy("");
      setTouched(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add it");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add a suggestion" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <Label htmlFor="mod-yt">YouTube link</Label>
            <Input id="mod-yt" autoFocus value={link} onChange={(event) => setLink(event.target.value)} />
            <FieldError>{touched ? linkError : null}</FieldError>
          </div>
          <div>
            <Label htmlFor="mod-by">Suggested by</Label>
            <Input id="mod-by" value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
            <FieldError>{touched ? nameError : null}</FieldError>
          </div>
        </div>
        {id && <YouTubeEmbed id={id} />}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={loading}>
            Add to list
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
