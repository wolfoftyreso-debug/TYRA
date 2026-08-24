import * as React from "react";

import { cn } from "./cn";
import { Card } from "./Card";
import { StatusBadge, type StatusTone } from "./Status";

export function WorkCard(props: {
  title: string;
  subtitle?: string | null;
  status?: { tone: StatusTone; label: string } | null;
  nextTitle?: string | null;
  nextHint?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <Card pad="lg" className="mt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Arbetskort</div>
          <div className={cn("mt-2 text-3xl font-semibold tracking-tight", "break-words")}>{props.title}</div>
          {props.subtitle ? <div className="mt-2 text-base text-[var(--tyra-muted)]">{props.subtitle}</div> : null}
        </div>
        {props.status ? <StatusBadge tone={props.status.tone} label={props.status.label} /> : null}
      </div>

      <div className="mt-6 rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-5 py-4">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Nästa</div>
        <div className="mt-2 text-xl font-semibold tracking-tight">{props.nextTitle ?? "Klart."}</div>
        {props.nextHint ? <div className="mt-2 text-sm text-[var(--tyra-muted)]">{props.nextHint}</div> : null}
      </div>

      {props.children ? <div className="mt-6">{props.children}</div> : null}
    </Card>
  );
}

