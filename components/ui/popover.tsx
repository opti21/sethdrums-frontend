"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import type { ReactNode } from "react";

export function Popover({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          className="z-50 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-neon-purple/50 bg-ink-700 p-4 text-sm shadow-[0_12px_40px_rgb(0_0_0/0.7),0_0_0_1px_rgb(168_85_247/0.25),0_0_24px_rgb(168_85_247/0.25)]"
        >
          {children}
          <RadixPopover.Arrow className="fill-ink-700" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export const PopoverClose = RadixPopover.Close;
