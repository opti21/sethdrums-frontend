import type { Metadata } from "next";
import { Gate } from "@/components/gate";
import { MySongs } from "@/components/my-songs";

export const metadata: Metadata = { title: "My songs" };

export default function MySongsPage() {
  return (
    <Gate need="viewer" path="/my-songs">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">My songs</h1>
        <MySongs />
      </div>
    </Gate>
  );
}
