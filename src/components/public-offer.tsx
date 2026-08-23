"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { demoQuote, formatSek } from "@/lib/demo-data";

export function PublicOffer() {
  const [selected, setSelected] = useState(demoQuote.options[0].id);
  const [accepted, setAccepted] = useState(false);

  if (accepted) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#dce89f]">
          <Check size={28} />
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          Tack, ditt val är registrerat.
        </h1>
        <p className="mt-4 leading-7 text-[#5c5f56]">
          Werkstad Tyresö kontaktar dig för att föreslå en bokning. Ingen
          grossistorder har lagts automatiskt.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-black/10 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <strong className="tracking-[0.14em]">WERKSTAD TYRESÖ</strong>
          <span className="text-xs text-[#66695f]">Offert · ABC123</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 md:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6c705f]">
            Personlig däckrekommendation
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
            Tre genomräknade val för din Volvo XC60.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5c5f56]">
            Vi har utgått från bilens dimension, belastningskrav och det
            konstaterade bytesbehovet. Alla priser inkluderar fyra däck,
            montering, balansering och miljöavgift.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {demoQuote.options.map((option) => {
            const isSelected = selected === option.id;
            return (
              <article
                key={option.id}
                className={`flex flex-col rounded-2xl border bg-[#faf9f5] p-6 ${
                  isSelected ? "border-[#1f2418] ring-2 ring-[#1f2418]" : "border-black/10"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#707365]">
                  {option.title}
                </p>
                <h2 className="mt-5 text-2xl font-semibold">
                  {option.product.brand}
                </h2>
                <p className="mt-1 text-[#66695f]">{option.product.model}</p>
                <p className="mt-5 text-sm leading-6 text-[#5c5f56]">
                  {option.rationale}
                </p>
                <dl className="mt-6 space-y-3 border-t border-black/10 pt-5 text-sm">
                  {option.lines.map((line) => (
                    <div key={line.label} className="flex justify-between gap-3">
                      <dt>
                        {line.quantity} × {line.label}
                      </dt>
                      <dd>{formatSek(line.quantity * line.unitPriceOre)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 text-3xl font-semibold">
                  {formatSek(option.totalOre)}
                </p>
                {option.product.eprelUrl && (
                  <a
                    href={option.product.eprelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring mt-2 text-xs underline underline-offset-4"
                  >
                    EU-märkning (EPREL)
                  </a>
                )}
                <button
                  onClick={() => setSelected(option.id)}
                  className={`focus-ring mt-6 min-h-12 rounded-xl px-4 font-semibold ${
                    isSelected
                      ? "bg-[#1f2418] text-white"
                      : "border border-black/20"
                  }`}
                >
                  {isSelected ? "Vald" : "Välj detta paket"}
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col justify-between gap-6 border-t border-black/15 pt-8 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 text-sm text-[#5c5f56]">
            <ShieldCheck className="shrink-0" size={20} />
            <p>
              Giltig till {demoQuote.validUntil}. Ditt val loggas när du
              accepterar.
            </p>
          </div>
          <button
            onClick={() => setAccepted(true)}
            className="focus-ring min-h-13 rounded-xl bg-[#1f2418] px-7 font-semibold text-white"
          >
            Acceptera valt paket
          </button>
        </div>
      </main>
    </>
  );
}
