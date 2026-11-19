import Image from "next/image";
import type { ReactNode } from "react";
import { Crown, Sparkles, Swords } from "lucide-react";
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
  position?: number;
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
  prio: "border-neon-gold/50 bg-gradient-to-r from-neon-gold/15 via-ink-850/90 to-ink-850/90 shadow-[0_0_24px_-12px_var(--color-neon-gold)]",
  raffle: "border-neon-pink/50 bg-gradient-to-r from-neon-pink/15 via-ink-850/90 to-ink-850/90",
  mod: "border-neon-teal/50 bg-gradient-to-r from-neon-teal/15 via-ink-850/90 to-ink-850/90",
  regular: "border-white/8 bg-ink-850/80",
};

export function RequestCard({
  request,
  publicView,
  leading,
  actions,
  footer,
  onTitleClick,
  position,
  highlight,
  className,
}: Props) {
  const kind = requestKind(request, publicView);
  const video = request.Video;

  return (
    <article
      className={cn(
        "group relative flex flex-wrap items-stretch gap-3 rounded-xl border p-2.5 pr-3 transition sm:flex-nowrap",
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
        <div className="flex flex-wrap items-center gap-1.5">
          {position !== undefined && (
            <span className="text-xs font-bold text-ink-400 tabular-nums">#{position}</span>
          )}
          {kind === "prio" && (
            <Badge className="bg-neon-gold/20 text-neon-gold">
              <Crown className="size-3" /> Priority
            </Badge>
          )}
          {kind === "raffle" && (
            <Badge className="bg-neon-pink/20 text-neon-pink">
              <Sparkles className="size-3" /> Raffle
            </Badge>
          )}
          {kind === "mod" && (
            <Badge className="bg-neon-teal/20 text-neon-teal">
              <Swords className="size-3" /> Mod priority
            </Badge>
          )}
        </div>
        <a
          href={youtubeUrl(video.youtube_id)}
          target="_blank"
          rel="noreferrer"
          onClick={onTitleClick}
          className="mt-0.5 line-clamp-2 font-semibold text-white hover:underline sm:text-lg"
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
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:flex-col sm:flex-nowrap sm:items-end sm:justify-center">
          {actions}
        </div>
      )}
    </article>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", className)}>
      {children}
    </span>
  );
}
