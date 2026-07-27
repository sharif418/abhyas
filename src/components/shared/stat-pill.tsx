"use client";

import { cn } from "@/lib/utils";
import { IconRenderer } from "./icon-renderer";
import { toBn } from "@/lib/date-bn";

interface StatPillProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  className?: string;
}

export function StatPill({
  icon,
  label,
  value,
  sub,
  color = "var(--primary)",
  className,
}: StatPillProps) {
  const display = typeof value === "number" ? toBn(value) : value;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm",
        className
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: color }}
      >
        <IconRenderer name={icon} size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="tabular text-lg font-bold leading-tight">{display}</span>
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "Sparkles",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/50 p-8 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <IconRenderer name={icon} size={26} />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
