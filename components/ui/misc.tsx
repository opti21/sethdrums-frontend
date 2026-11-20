import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/client/cn";

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-ink-300">
      <Image src="/loading.gif" alt="Loading Seth's huge forehead" width={256} height={64} unoptimized />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warn" | "error" | "ok";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-neon-blue/30 bg-neon-blue/10 text-blue-100",
    warn: "border-neon-gold/40 bg-neon-gold/10 text-amber-100",
    error: "border-red-500/40 bg-red-500/10 text-red-100",
    ok: "border-neon-teal/40 bg-neon-teal/10 text-teal-50",
  };
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}

export function SectionTitle({
  children,
  action,
  status,
}: {
  children: ReactNode;
  action?: ReactNode;
  /** Small inline notes shown right after the heading. */
  status?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">{children}</h2>
        {status}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-ink-400">
      {children}
    </div>
  );
}
