"use client";

import { useMemo, useState, useTransition } from "react";

import { createBookingAction, updatePrefsAction } from "./relationshipActions";

export function RelationshipClient(props: {
  token: string;
  commercialState: string;
  prefs: {
    level: string;
    remind_worn_tires: boolean;
    remind_prices: boolean;
    remind_season: boolean;
    remind_bookings: boolean;
    remind_storage: boolean;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [level, setLevel] = useState(props.prefs.level);
  const [flags, setFlags] = useState({
    remindWornTires: props.prefs.remind_worn_tires,
    remindPrices: props.prefs.remind_prices,
    remindSeason: props.prefs.remind_season,
    remindBookings: props.prefs.remind_bookings,
    remindStorage: props.prefs.remind_storage
  });
  const [msg, setMsg] = useState<string | null>(null);

  const slots = useMemo(() => {
    const out: Array<{ startAtIso: string; endAtIso: string; label: string }> = [];
    const now = new Date();
    for (let d = 1; d <= 7; d++) {
      const day = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      // 08:00, 09:00, 10:00 (lite demo)
      for (const hour of [8, 9, 10]) {
        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + 45 * 60 * 1000);
        out.push({
          startAtIso: start.toISOString(),
          endAtIso: end.toISOString(),
          label: `${start.toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" })} ${start.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`
        });
      }
    }
    return out.slice(0, 12);
  }, []);

  return (
    <div className="mt-10 grid gap-4">
      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-medium text-black/60">Mina påminnelser</div>
        <div className="mt-2 text-sm text-black/70">
          Du styr vilken typ av uppdateringar du vill få. Vi skickar inte spam.
        </div>

        {msg ? <div className="mt-3 text-sm text-black/70">{msg}</div> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <div className="text-xs font-medium text-black/60">Nivå</div>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="fewer">Färre</option>
              <option value="normal">Normal</option>
              <option value="updated">Håll mig uppdaterad</option>
            </select>
          </label>

          <div className="text-xs text-black/50">
            Inställningarna gäller denna TYRA-länk och kan ändras när som helst.
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            ["remindWornTires", "Påminn om slitna däck"],
            ["remindPrices", "Påminn om dagspriser"],
            ["remindSeason", "Påminn inför säsong"],
            ["remindBookings", "Påminn inför bokningar"],
            ["remindStorage", "Viktiga hotellhändelser"]
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
              <input
                type="checkbox"
                checked={(flags as any)[k]}
                onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        <button
          className="mt-4 rounded-xl bg-[#0b0c0e] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={isPending}
          onClick={() => {
            setMsg(null);
            startTransition(async () => {
              await updatePrefsAction({
                token: props.token,
                level: level as any,
                ...flags
              });
              setMsg("Sparat.");
            });
          }}
        >
          {isPending ? "Sparar…" : "Spara inställningar"}
        </button>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-medium text-black/60">Boka tid</div>
        <div className="mt-2 text-sm text-black/70">
          Bokning sker i samma vy. (Kapacitetsmotor kommer senare — här är en första enkel slot-väljare.)
        </div>

        <div className="mt-5 grid gap-2">
          {slots.map((s) => (
            <button
              key={s.startAtIso}
              disabled={isPending}
              className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm hover:border-black/20 disabled:opacity-40"
              onClick={() => {
                setMsg(null);
                startTransition(async () => {
                  await createBookingAction({
                    token: props.token,
                    startAtIso: s.startAtIso,
                    endAtIso: s.endAtIso
                  });
                  setMsg("Bokat.");
                });
              }}
            >
              <span>{s.label}</span>
              <span className="text-black/50">45 min</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

