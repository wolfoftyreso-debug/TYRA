import * as React from "react";

import { cn } from "./cn";

export type StatusTone = "good" | "attention" | "blocked" | "neutral";

function dotClass(tone: StatusTone) {
  if (tone === "good") return "bg-emerald-500";
  if (tone === "attention") return "bg-amber-500";
  if (tone === "blocked") return "bg-red-500";
  return "bg-zinc-400";
}

function bannerClass(tone: StatusTone) {
  if (tone === "good") return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
  if (tone === "attention") return "border-amber-300/40 bg-amber-500/10 text-amber-100";
  if (tone === "blocked") return "border-red-300/40 bg-red-500/10 text-red-100";
  return "border-[var(--tyra-border)] bg-[var(--tyra-surface)] text-[var(--tyra-fg)]";
}

export function StatusBadge(props: { tone: StatusTone; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--tyra-border)] bg-[var(--tyra-surface)] px-3 py-1 text-xs font-medium text-[var(--tyra-fg)]",
        props.className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass(props.tone))} aria-hidden />
      <span>{props.label}</span>
    </span>
  );
}

export function StatusBanner(
  props: React.HTMLAttributes<HTMLDivElement> & {
    tone: StatusTone;
    title?: string;
  }
) {
  const { tone, title, className, children, ...rest } = props;
  return (
    <div className={cn("rounded-[var(--tyra-radius)] border px-4 py-3", bannerClass(tone), className)} {...rest}>
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      {children ? <div className={cn(title ? "mt-1 text-sm opacity-90" : "text-sm")}>{children}</div> : null}
    </div>
  );
}

