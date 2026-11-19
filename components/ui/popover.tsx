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
          className="card z-50 max-h-80 w-80 overflow-y-auto bg-ink-850 p-4 text-sm shadow-xl"
        >
          {children}
          <RadixPopover.Arrow className="fill-ink-850" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export const PopoverClose = RadixPopover.Close;
