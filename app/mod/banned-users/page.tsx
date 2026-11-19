import type { Metadata } from "next";
import Link from "next/link";
import { Gate } from "@/components/gate";
import { BannedUsers } from "@/components/mod/banned-users";

export const metadata: Metadata = { title: "Banned users" };

export default function Page() {
  return (
    <Gate need="mod" path="/mod/banned-users">
      <div className="space-y-6">
        <div>
          <Link href="/mod" className="text-sm text-ink-300 hover:text-white">
            ← Mod panel
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold">Banned users</h1>
        </div>
        <BannedUsers />
      </div>
    </Gate>
  );
}
