"use client";

import { useState } from "react";
import { Check, ScanLine } from "lucide-react";

export function PickFlow() {
  const [state, setState] = useState<"queued" | "picking" | "picked" | "delivered">(
    "queued",
  );

  return (
    <div className="rounded-2xl border border-[#2a2e35] bg-[#14161a] p-6 md:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row">
        <div>
          <p className="eyebrow">Plock 1 av 1</p>
          <h2 className="mt-2 text-3xl font-semibold">DEF456</h2>
          <p className="mt-2 text-[#a6adb7]">BMW X5 · Nokian · 275/40 R20</p>
        </div>
        <div className="rounded-xl bg-[#1b1e23] px-5 py-4">
          <p className="text-xs text-[#9299a4]">Hyllplats</p>
          <p className="mt-1 font-mono text-xl">A-03-A-08</p>
        </div>
      </div>

      {state === "queued" && (
        <Action
          title="Gå till hyllplatsen"
          description="Börja plocket när du är på väg."
          button="Börja plocka"
          onClick={() => setState("picking")}
        />
      )}
      {state === "picking" && (
        <div className="mt-8 border-t border-[#2a2e35] pt-7">
          <div className="flex items-center gap-3 text-[#d8ff57]">
            <ScanLine />
            <h3 className="font-semibold">Bekräfta rätt hjul</h3>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              defaultValue="A-03-A-08"
              aria-label="Skannad plats"
              className="focus-ring h-13 rounded-xl border border-[#3a4049] bg-[#0f1114] px-4 font-mono"
            />
            <input
              defaultValue="DEF456"
              aria-label="Skannat registreringsnummer"
              className="focus-ring h-13 rounded-xl border border-[#3a4049] bg-[#0f1114] px-4 font-mono"
            />
          </div>
          <button
            onClick={() => setState("picked")}
            className="focus-ring mt-5 min-h-12 rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e]"
          >
            Bekräfta plock
          </button>
        </div>
      )}
      {state === "picked" && (
        <Action
          title="Hjulen är plockade"
          description="Hyllplatsen är nu ledig. Kör hjulen till verkstaden."
          button="Till verkstad"
          onClick={() => setState("delivered")}
        />
      )}
      {state === "delivered" && (
        <div className="mt-8 rounded-xl border border-[#d8ff57]/30 bg-[#d8ff57]/10 p-5">
          <Check className="text-[#d8ff57]" />
          <h3 className="mt-3 text-xl font-semibold">Levererad till verkstad</h3>
          <p className="mt-2 text-sm leading-6 text-[#b6bdc6]">
            Vinterhjulen är I VERKSTAD. Bilens monterade sommarhjul är markerade
            SKA ÅTER.
          </p>
          <p className="mt-5 text-sm font-semibold text-[#d8ff57]">
            Nästa: checka in de andra hjulen.
          </p>
        </div>
      )}
    </div>
  );
}

function Action({
  title,
  description,
  button,
  onClick,
}: {
  title: string;
  description: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-8 border-t border-[#2a2e35] pt-7">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#9299a4]">{description}</p>
      <button
        onClick={onClick}
        className="focus-ring mt-5 min-h-12 rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e]"
      >
        {button}
      </button>
    </div>
  );
}
