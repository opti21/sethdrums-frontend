import type { Metadata } from "next";
import { History } from "@/components/history";

export const metadata: Metadata = { title: "Previously played" };

export default function PreviouslyPlayedPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Previously played</h1>
      <History />
    </div>
  );
}
