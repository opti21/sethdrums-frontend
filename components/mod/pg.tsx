"use client";

import { cn } from "@/lib/client/cn";
import type { PgStatus } from "@/lib/shared/types";

const look: Record<PgStatus, { label: string; className: string }> = {
  NOT_CHECKED: { label: "PG: not checked", className: "from-sky-400 to-blue-600 text-white" },
  BEING_CHECKED: { label: "Being checked", className: "from-amber-200 to-amber-500 text-ink-950" },
  PG: { label: "PG", className: "from-emerald-500 to-green-400 text-ink-950" },
  NON_PG: { label: "Non PG", className: "from-red-600 to-rose-500 text-white" },
};

export function PgPill({
  status,
  onClick,
  className,
}: {
  status: PgStatus | undefined;
  onClick?: () => void;
  className?: string;
}) {
  const { label, className: tone } = look[status ?? "NOT_CHECKED"];
  const classes = cn(
    "inline-flex h-10 min-w-36 items-center justify-center rounded-xl bg-gradient-to-r px-4 text-sm font-bold whitespace-nowrap uppercase",
    tone,
    onClick && "transition hover:brightness-110",
    className
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {label}
    </button>
  ) : (
    <span className={classes}>{label}</span>
  );
}
