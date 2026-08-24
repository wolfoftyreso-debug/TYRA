import * as React from "react";

import { cn } from "./cn";

export type ButtonTone = "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--tyra-radius)] font-medium outline-none transition-colors disabled:opacity-40 disabled:pointer-events-none";

const byTone: Record<ButtonTone, string> = {
  primary:
    "bg-[var(--tyra-fg)] text-[var(--tyra-panel)] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--tyra-focus)]",
  secondary:
    "border border-[var(--tyra-border)] bg-[var(--tyra-surface)] text-[var(--tyra-fg)] hover:border-[var(--tyra-focus)] focus-visible:ring-2 focus-visible:ring-[var(--tyra-focus)]",
  tertiary:
    "bg-transparent text-[var(--tyra-fg)] hover:bg-[var(--tyra-surface)] focus-visible:ring-2 focus-visible:ring-[var(--tyra-focus)]",
  destructive:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-red-300"
};

const bySize: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
  xl: "px-6 py-4 text-lg"
};

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: ButtonTone;
    size?: ButtonSize;
  }
) {
  const { tone = "secondary", size = "md", className, ...rest } = props;
  return <button className={cn(base, byTone[tone], bySize[size], className)} {...rest} />;
}

