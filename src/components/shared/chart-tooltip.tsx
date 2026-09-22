"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toBn } from "@/lib/date-bn";

/**
 * Shared Recharts tooltip style — the single source of truth for chart
 * tooltip look-and-feel (previously copy-pasted in 5 chart components).
 * Uses the app's CSS variables so it follows light/dark themes automatically.
 */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 24px rgb(0 0 0 / 0.08)",
  padding: "8px 12px",
};

export const CHART_TOOLTIP_CURSOR = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
  fill: "var(--muted)",
  fillOpacity: 0.25,
} as const;

/** Shared axis/tick styling for cartesian charts. */
export const CHART_AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/**
 * Unified tooltip row for custom tooltip renderers — keeps typography,
 * dot colors and Bengali numerals consistent across every chart.
 */
export function TooltipRow({
  name,
  value,
  color,
}: {
  name: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      {color && (
        <span
          className={cn("size-2 shrink-0 rounded-full")}
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      <span className="text-muted-foreground">{name}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/** Percent formatter helper used by trend charts. */
export function pctLabel(done: number, scheduled: number): string {
  const pct = scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
  return `${toBn(pct)}% (${toBn(done)}/${toBn(scheduled)})`;
}
