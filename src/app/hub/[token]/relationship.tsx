"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/Status";

import { createBookingAction, updatePrefsAction } from "./relationshipActions";

export function RelationshipClient(props: {
  token: string;
  commercialState: string;
  prefs: {
    level: string;
    pressure_profile: string;
    remind_worn_tires: boolean;
    remind_prices: boolean;
    remind_season: boolean;
    remind_bookings: boolean;
    remind_storage: boolean;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [level, setLevel] = useState(props.prefs.level);
  const [pressureProfile, setPressureProfile] = useState<"light" | "normal" | "full">(
    (props.prefs.pressure_profile as any) ?? "normal"
  );
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
      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Mina påminnelser</div>
        <div className="mt-2 text-sm text-[var(--tyra-muted)]">
          Du styr vilken typ av uppdateringar du vill få. Vi skickar inte spam.
        </div>

        {msg ? (
          <div className="mt-3">
            <StatusBanner tone="good" title="Sparat">
              {msg}
            </StatusBanner>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <div className="text-xs font-medium text-[var(--tyra-muted)]">Nivå</div>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-sm outline-none"
            >
              <option value="fewer">Färre</option>
              <option value="normal">Normal</option>
              <option value="updated">Håll mig uppdaterad</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-medium text-[var(--tyra-muted)]">Önskat lufttryck</div>
            <select
              value={pressureProfile}
              onChange={(e) => setPressureProfile(e.target.value as "light" | "normal" | "full")}
              className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-sm outline-none"
            >
              <option value="light">Ingen last</option>
              <option value="normal">Mellan</option>
              <option value="full">Full last</option>
            </select>
            <div className="mt-2 text-xs text-[var(--tyra-subtle)]">
              Vi använder detta som standard vid kontroll/påfyllning. (Exakta kPa kan skilja per bil och däck.)
            </div>
          </label>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            ["remindWornTires", "Påminn om slitna däck"],
            ["remindPrices", "Påminn om dagspriser"],
            ["remindSeason", "Påminn inför säsong"],
            ["remindBookings", "Påminn inför bokningar"],
            ["remindStorage", "Viktiga hotellhändelser"]
          ].map(([k, label]) => (
            <label
              key={k}
              className="flex items-center gap-3 rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] p-3"
            >
              <input
                type="checkbox"
                checked={(flags as any)[k]}
                onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        <Button
          tone="primary"
          size="lg"
          className="mt-4"
          disabled={isPending}
          onClick={() => {
            setMsg(null);
            startTransition(async () => {
              await updatePrefsAction({
                token: props.token,
                level: level as any,
                pressureProfile,
                ...flags
              });
              setMsg("Dina inställningar är uppdaterade.");
            });
          }}
        >
          {isPending ? "Sparar…" : "Spara inställningar"}
        </Button>
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Boka tid</div>
        <div className="mt-2 text-sm text-[var(--tyra-muted)]">
          Bokning sker i samma vy. (Kapacitetsmotor kommer senare — här är en första enkel slot-väljare.)
        </div>

        <div className="mt-5 grid gap-2">
          {slots.map((s) => (
            <Button
              key={s.startAtIso}
              disabled={isPending}
              tone="secondary"
              size="lg"
              className="w-full justify-between"
              onClick={() => {
                setMsg(null);
                startTransition(async () => {
                  await createBookingAction({
                    token: props.token,
                    startAtIso: s.startAtIso,
                    endAtIso: s.endAtIso
                  });
                  setMsg("Din tid är bokad.");
                });
              }}
            >
              <span>{s.label}</span>
              <span className="text-[var(--tyra-subtle)]">45 min</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

