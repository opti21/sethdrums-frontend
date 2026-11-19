import type { QueueFlags } from "@/lib/shared/types";
import { cn } from "@/lib/client/cn";

export function queueStatus(flags: QueueFlags) {
  if (flags.is_paused) return { label: "Paused", tone: "paused" as const };
  if (!flags.is_open) return { label: "Closed", tone: "closed" as const };
  if (flags.is_subOnly) return { label: "Open to subs only", tone: "subs" as const };
  return { label: "Open to everyone", tone: "open" as const };
}

export function StatusBanner({ flags }: { flags: QueueFlags }) {
  const { label, tone } = queueStatus(flags);
  const styles = {
    open: "from-neon-teal/25 to-neon-teal/5 border-neon-teal/40 text-teal-50",
    subs: "from-neon-purple/30 to-neon-purple/5 border-neon-purple/40 text-purple-50",
    paused: "from-neon-gold/25 to-neon-gold/5 border-neon-gold/40 text-amber-50",
    closed: "from-red-500/25 to-red-500/5 border-red-500/40 text-red-50",
  };
  const dot = {
    open: "bg-neon-teal",
    subs: "bg-neon-purple",
    paused: "bg-neon-gold",
    closed: "bg-red-500",
  };
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-gradient-to-r px-4 py-3", styles[tone])}>
      <span className="relative flex size-3">
        {tone !== "closed" && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", dot[tone])} />
        )}
        <span className={cn("relative inline-flex size-3 rounded-full", dot[tone])} />
      </span>
      <p className="font-semibold">Suggestion list is {label.toLowerCase()}</p>
    </div>
  );
}
