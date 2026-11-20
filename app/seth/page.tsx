import type { Metadata } from "next";
import { Gate } from "@/components/gate";
import { ModPanel } from "@/components/mod/mod-panel";

export const metadata: Metadata = { title: "Seth view" };

export default function SethPage() {
  return (
    <Gate need="mod" path="/seth">
      <ModPanel view="seth" />
    </Gate>
  );
}
