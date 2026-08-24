import * as React from "react";

import { cn } from "./cn";

export function Card(
  props: React.HTMLAttributes<HTMLDivElement> & {
    pad?: "sm" | "md" | "lg";
  }
) {
  const { className, pad = "md", ...rest } = props;
  const padding = pad === "sm" ? "p-4" : pad === "lg" ? "p-6" : "p-5";

  return (
    <div
      className={cn(
        "rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-surface)]",
        padding,
        className
      )}
      {...rest}
    />
  );
}

