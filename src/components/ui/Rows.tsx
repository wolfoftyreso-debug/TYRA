import * as React from "react";

import { cn } from "./cn";
import { StatusBadge, type StatusTone } from "./Status";

export function FieldRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <div className="text-xs font-medium text-[var(--tyra-muted)]">{props.label}</div>
      <div className="text-sm text-[var(--tyra-fg)]">{props.value}</div>
    </div>
  );
}

export function TaskRow(
  props: React.HTMLAttributes<HTMLDivElement> & {
    headline: React.ReactNode;
    subtitle?: React.ReactNode;
    status?: { tone: StatusTone; label: string } | null;
    right?: React.ReactNode;
  }
) {
  const { className, headline, subtitle, status, right, ...rest } = props;
  return (
    <div
      className={cn(
        "rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-surface)] px-5 py-4",
        className
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight">{headline}</div>
          {subtitle ? <div className="mt-1 text-sm text-[var(--tyra-muted)]">{subtitle}</div> : null}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          {status ? <StatusBadge tone={status.tone} label={status.label} /> : null}
          {right}
        </div>
      </div>
    </div>
  );
}

