"use client";

import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
  /** Forwarded to the underlying SVG (e.g. `aria-hidden` for decorative icons). */
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Renders any lucide icon by its PascalCase name.
 * Falls back to CheckCircle if the name is unknown.
 */
export function IconRenderer({
  name,
  className,
  size = 20,
  strokeWidth = 2,
  ...rest
}: IconRendererProps) {
  const Comp = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[name] ??
    LucideIcons.CheckCircle;
  return <Comp className={className} size={size} strokeWidth={strokeWidth} {...rest} />;
}

/** A colored rounded tile showing a habit icon. */
export function IconTile({
  name,
  color,
  size = 44,
  className,
  iconSize,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
  iconSize?: number;
}) {
  return (
    <div
      role="img"
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
        className
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${shade(color, -18)})`,
        boxShadow: `0 6px 16px -8px ${color}`,
      }}
    >
      <IconRenderer name={name} size={iconSize ?? size * 0.5} aria-hidden />
    </div>
  );
}

/** Darken/lighten a hex color by a percentage (-100..100). */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}
