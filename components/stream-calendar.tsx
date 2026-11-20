"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverClose } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type Props = {
  /** Stream days as YYYY-MM-DD, in the viewer's time zone. */
  streamDays: string[];
  value: string;
  onChange: (day: string) => void;
};

/** Date picker that highlights the days a stream happened. */
export function StreamCalendar({ streamDays, value, onChange }: Props) {
  const days = new Set(streamDays);
  const latest = streamDays[0];
  // Opens on the picked day's month, else the latest stream's month.
  const [shown, setShown] = useState<string | null>(null);
  const month = dayjs(shown || value || latest || undefined).startOf("month");
  const first = month.startOf("week");
  const cells = Array.from({ length: 42 }, (_, i) => first.add(i, "day"));
  const weeks = cells.slice(35).every((d) => d.month() !== month.month()) ? cells.slice(0, 35) : cells;

  return (
    <div className="flex items-center gap-2">
      <Popover
        trigger={
          <Button variant="outline" onClick={() => setShown(null)}>
            <CalendarDays className="size-4" />
            {value ? dayjs(value).format("ddd, MMM D, YYYY") : "Pick a stream day"}
          </Button>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => setShown(month.subtract(1, "month").format("YYYY-MM-DD"))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-semibold">{month.format("MMMM YYYY")}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next month"
            onClick={() => setShown(month.add(1, "month").format("YYYY-MM-DD"))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1 text-xs text-ink-400">
              {d}
            </span>
          ))}
          {weeks.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const streamed = days.has(key);
            const selected = key === value;
            const inMonth = d.month() === month.month();
            const label = d.format("D");
            if (!streamed) {
              return (
                <span key={key} className={cn("py-1.5 text-sm", inMonth ? "text-ink-500" : "text-ink-700")}>
                  {label}
                </span>
              );
            }
            return (
              <PopoverClose asChild key={key}>
                <button
                  type="button"
                  title={`Songs played on ${d.format("MMM D")}`}
                  onClick={() => onChange(key)}
                  className={cn(
                    "rounded-md py-1.5 text-sm font-semibold transition",
                    selected
                      ? "bg-neon-pink text-white"
                      : "bg-neon-pink/20 text-white ring-1 ring-neon-pink/50 hover:bg-neon-pink/40",
                    !inMonth && "opacity-50"
                  )}
                >
                  {label}
                </button>
              </PopoverClose>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-400">Highlighted days had a stream.</p>
      </Popover>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange("")}>
          <X className="size-4" /> All streams
        </Button>
      )}
    </div>
  );
}
