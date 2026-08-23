"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { demoQuote, formatSek } from "@/lib/demo-data";

export function QuoteBuilder() {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  async function openAndCopy() {
    const url = `${window.location.origin}/offer/${demoQuote.token}`;
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-[#2a2e35] bg-[#101215] p-5">
        <p className="eyebrow">Underlag</p>
        <div className="mt-3 flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              ABC123 · Volvo XC60 2022
            </h2>
            <p className="mt-1 text-sm text-[#9299a4]">
              Sommar · 235/55 R19 · premiumsegment · XL
            </p>
          </div>
          <span className="text-sm text-[#ffb09d]">2 hjul under 4 mm</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {demoQuote.options.map((option) => (
          <section
            key={option.id}
            className={`rounded-2xl border p-5 ${
              option.slot === "recommended"
                ? "border-[#d8ff57]/60 bg-[#d8ff57]/5"
                : "border-[#2a2e35] bg-[#14161a]"
            }`}
          >
            <p className="eyebrow">{option.title}</p>
            <h3 className="mt-4 text-xl font-semibold">
              {option.product.brand}
            </h3>
            <p className="mt-1 text-sm text-[#a6adb7]">{option.product.model}</p>
            <p className="mt-4 text-sm leading-6 text-[#9299a4]">
              {option.rationale}
            </p>
            <div className="my-5 border-t border-[#2a2e35]" />
            <ul className="space-y-2 text-xs text-[#a6adb7]">
              {option.lines.map((line) => (
                <li key={line.label} className="flex justify-between gap-3">
                  <span>
                    {line.quantity} × {line.label}
                  </span>
                  <span>{formatSek(line.quantity * line.unitPriceOre)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-2xl font-semibold">
              {formatSek(option.totalOre)}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#2a2e35] bg-[#14161a] p-5 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold">
            {ready ? "Offerten är redo" : "Kontrollera tre paket"}
          </p>
          <p className="mt-1 text-xs text-[#9299a4]">
            Skickas inte förrän ni kopplar e-post.
          </p>
        </div>
        {!ready ? (
          <button
            onClick={() => setReady(true)}
            className="focus-ring min-h-12 rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e]"
          >
            Markera redo
          </button>
        ) : (
          <button
            onClick={openAndCopy}
            className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e]"
          >
            {copied ? <Check size={18} /> : <ExternalLink size={18} />}
            Öppna kundlänk
            {!copied && <Copy size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
