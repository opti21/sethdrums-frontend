import Image from "next/image";
import type { ReactNode } from "react";
import type { RequestInfo } from "@/lib/shared/types";
import { formatDuration, youtubeUrl } from "@/lib/shared/youtube";
import { cn } from "@/lib/client/cn";

type Props = {
  request: RequestInfo;
  /** Hide mod-only details such as mod priority and notes. */
  publicView?: boolean;
  /** Rendered on the left, e.g. a drag handle. */
  leading?: ReactNode;
  /** Buttons on the right. */
  actions?: ReactNode;
  /** Extra lines under the title, e.g. mod notes. */
  footer?: ReactNode;
  /** Called when the title link is clicked (Seth view marks it playing). */
  onTitleClick?: () => void;
  highlight?: boolean;
  className?: string;
};

export function requestKind(request: RequestInfo, publicView?: boolean) {
  if (request.mod_prio && !publicView) return "mod" as const;
  if (request.raffle_prio) return "raffle" as const;
  if (request.priority) return "prio" as const;
  return "regular" as const;
}

const accents = {
  // Color alone tells the kind apart, so it's a bit stronger than a hint.
  prio: "border-neon-gold/70 bg-gradient-to-r from-neon-gold/25 via-neon-gold/[0.07] to-ink-850/90 shadow-[0_0_24px_-12px_var(--color-neon-gold)]",
  raffle: "border-neon-pink/70 bg-gradient-to-r from-neon-pink/25 via-neon-pink/[0.07] to-ink-850/90",
  mod: "border-neon-teal/70 bg-gradient-to-r from-neon-teal/25 via-neon-teal/[0.07] to-ink-850/90",
  regular: "border-white/8 bg-ink-850/80",
};

export function RequestCard({
  request,
  publicView,
  leading,
  actions,
  footer,
  onTitleClick,
  highlight,
  className,
}: Props) {
  const kind = requestKind(request, publicView);
  const video = request.Video;

  return (
    <article
      className={cn(
        "group relative flex flex-wrap items-stretch gap-3 rounded-xl border p-3 transition sm:flex-nowrap sm:gap-4 sm:p-4",
        accents[kind],
        highlight && "ring-2 ring-neon-pink/60",
        className
      )}
    >
      {leading}
      <a
        href={youtubeUrl(video.youtube_id)}
        target="_blank"
        rel="noreferrer"
        onClick={onTitleClick}
        className="relative block w-24 shrink-0 self-center overflow-hidden rounded-lg sm:w-36"
        tabIndex={-1}
      >
        <Image
          src={video.thumbnail}
          alt=""
          width={320}
          height={180}
          className="aspect-video w-full object-cover transition group-hover:scale-105"
          unoptimized
        />
        <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold tabular-nums">
          {formatDuration(video.duration)}
        </span>
      </a>
      <div className="min-w-0 flex-1 self-center">
        <a
          href={youtubeUrl(video.youtube_id)}
          target="_blank"
          rel="noreferrer"
          onClick={onTitleClick}
          title={video.title}
          className="line-clamp-2 font-semibold text-white hover:underline sm:line-clamp-1 sm:text-lg"
        >
          {video.title}
        </a>
        <p className="mt-0.5 truncate text-sm text-ink-300">
          <span className="text-ink-400">Suggested by </span>
          <span className="font-semibold text-ink-100">{request.requested_by}</span>
          {video.channel && <span className="hidden text-ink-400 sm:inline"> · {video.channel}</span>}
        </p>
        {footer}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:min-w-44 sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-center">
          {actions}
        </div>
      )}
    </article>
  );
}
