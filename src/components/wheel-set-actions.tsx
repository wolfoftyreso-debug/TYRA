"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { markMounted, statusLabels, type WheelSetStatus } from "@/lib/domain/status";

export function WheelSetActions({ initialStatus }: { initialStatus: WheelSetStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const canMount = status === "PICKED" || status === "IN_WORKSHOP";

  if (!canMount) {
    return (
      <div className="rounded-2xl border border-[#2a2e35] bg-[#101215] p-5">
        <p className="eyebrow">Nästa steg</p>
        <p className="mt-3 text-sm text-[#a6adb7]">
          Aktuell status: {statusLabels[status]}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#2a2e35] bg-[#101215] p-5">
      <p className="eyebrow">Nästa steg</p>
      <button
        onClick={() => setStatus(markMounted(status))}
        className="focus-ring mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d8ff57] px-4 font-semibold text-[#0b0c0e]"
      >
        <Check size={18} /> Markera monterad
      </button>
    </div>
  );
}
