import type { Metadata } from "next";
import Link from "next/link";
import { Gate } from "@/components/gate";
import { BannedVideos } from "@/components/mod/banned-videos";

export const metadata: Metadata = { title: "Banned videos" };

export default function Page() {
  return (
    <Gate need="mod" path="/mod/banned-videos">
      <div className="space-y-6">
        <div>
          <Link href="/mod" className="text-sm text-ink-300 hover:text-white">
            ← Mod panel
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold">Banned videos</h1>
        </div>
        <BannedVideos />
      </div>
    </Gate>
  );
}
