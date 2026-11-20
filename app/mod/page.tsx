import type { Metadata } from "next";
import { Gate } from "@/components/gate";
import { ModPanel } from "@/components/mod/mod-panel";

export const metadata: Metadata = { title: "Mod panel" };

export default function ModPage() {
  return (
    <Gate need="mod" path="/mod">
      <ModPanel view="mod" />
    </Gate>
  );
}
