"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { api } from "@/lib/client/api";
import { parseYouTubeId } from "@/lib/shared/youtube";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YouTube ids already in the list. */
  taken: string[];
  onAdded: () => void;
};

export function SuggestDialog({ open, onOpenChange, taken, onAdded }: Props) {
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const id = parseYouTubeId(link);
  const error = !link.trim()
    ? "Paste a YouTube link"
    : !id
      ? "That doesn't look like a YouTube link"
      : taken.includes(id)
        ? "That song is already in the list"
        : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (error) return;
    setSubmitting(true);
    try {
      await api("/api/public/request", { method: "POST", body: { ytLink: link } });
      toast.success("Suggestion added!");
      setLink("");
      setTouched(false);
      onOpenChange(false);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add your suggestion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Suggest a song" description="One suggestion per person at a time. Keep it PG." wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="yt-link">YouTube link</Label>
          <Input
            id="yt-link"
            autoFocus
            value={link}
            onChange={(event) => setLink(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <FieldError>{touched ? error : null}</FieldError>
        </div>
        {id && <YouTubeEmbed id={id} />}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={submitting}>
            Submit suggestion
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
