"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";

const steps = ["Fordon", "Skick", "Mönsterdjup", "Plats"];

export function CheckInFlow() {
  const [step, setStep] = useState(0);
  const [registration, setRegistration] = useState("KLM789");
  const [location, setLocation] = useState("A-04-B-13");

  if (step === steps.length) {
    return (
      <div className="rounded-2xl border border-[#d8ff57]/30 bg-[#d8ff57]/10 p-8">
        <span className="grid size-12 place-items-center rounded-full bg-[#d8ff57] text-[#0b0c0e]">
          <Check size={24} />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Hjulsetet är lagrat</h2>
        <p className="mt-2 text-[#b6bdc6]">
          {registration} · {location} · status LAGRAD
        </p>
        <p className="mt-7 text-sm font-semibold text-[#d8ff57]">
          Nästa: checka in de andra hjulen.
        </p>
        <button
          onClick={() => setStep(0)}
          className="focus-ring mt-4 min-h-12 rounded-xl border border-[#535a65] px-5"
        >
          Ny incheckning
        </button>
      </div>
    );
  }

  return (
    <div>
      <ol className="mb-8 flex gap-2" aria-label="Incheckningssteg">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`h-1.5 flex-1 rounded-full ${
              index <= step ? "bg-[#d8ff57]" : "bg-[#2a2e35]"
            }`}
            title={label}
          />
        ))}
      </ol>
      <div className="rounded-2xl border border-[#2a2e35] bg-[#14161a] p-6 md:p-8">
        <p className="eyebrow">
          Steg {step + 1} av {steps.length}
        </p>
        {step === 0 && (
          <Field title="Vilket fordon?">
            <input
              value={registration}
              onChange={(event) => setRegistration(event.target.value.toUpperCase())}
              className="focus-ring h-14 w-full rounded-xl border border-[#3a4049] bg-[#0f1114] px-4 font-mono text-xl uppercase"
              aria-label="Registreringsnummer"
            />
          </Field>
        )}
        {step === 1 && (
          <Field title="Hur ser hjulen ut?">
            <div className="grid gap-3 sm:grid-cols-3">
              {["Inga skador", "Ytliga märken", "Skada funnen"].map((label, index) => (
                <label key={label} className="cursor-pointer rounded-xl border border-[#3a4049] p-4">
                  <input
                    type="radio"
                    name="condition"
                    defaultChecked={index === 0}
                    className="mr-3 accent-[#d8ff57]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>
        )}
        {step === 2 && (
          <Field title="Mät mönsterdjup">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((wheel) => (
                <label key={wheel} className="text-xs text-[#9299a4]">
                  Hjul {wheel}
                  <input
                    type="number"
                    inputMode="decimal"
                    defaultValue="6.5"
                    step="0.1"
                    className="focus-ring mt-2 h-12 w-full rounded-xl border border-[#3a4049] bg-[#0f1114] px-3 text-base text-white"
                  />
                </label>
              ))}
            </div>
          </Field>
        )}
        {step === 3 && (
          <Field title="Skanna eller ange ledig plats">
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value.toUpperCase())}
              className="focus-ring h-14 w-full rounded-xl border border-[#3a4049] bg-[#0f1114] px-4 font-mono text-xl uppercase"
              aria-label="Lagerplats"
            />
            <p className="mt-3 text-sm text-[#9299a4]">
              A-04-B-13 är ledig · zon A
            </p>
          </Field>
        )}
        <button
          onClick={() => setStep((current) => current + 1)}
          className="focus-ring mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e] sm:w-auto"
        >
          {step === 3 ? "Lagra hjulset" : "Fortsätt"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function Field({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
