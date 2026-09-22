"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the Profile sections.
 *
 * profile-view.tsx was a 914-line monolith; it is now a thin composition of
 * focused section files (header / appearance / preferences / notifications /
 * ibadah / data / account) that all render through these primitives so the
 * visual language stays identical: rounded-3xl section cards, 8px muted icon
 * tiles, row separators, Bengali copy.
 */

/** Focus-visible ring for custom (non-shadcn) interactive controls (audit fix #5). */
export const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** GET /api/me response shape (profile subset). */
export interface MeResponse {
  id: string;
  name: string;
  xp: number;
  level: number;
  city: string;
}

export function Section({
  title,
  icon: Icon,
  children,
  padded = false,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** When true, adds p-4 padding around children. Use for sections with
   *  custom content (e.g. theme picker). Leave false for sections that
   *  use their own row-based layout (ToggleRow, DataRow) which have
   *  built-in px-4 py-3 padding. */
  padded?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-visible rounded-3xl border bg-card shadow-sm"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-bold">
        <Icon size={16} className="text-muted-foreground" aria-hidden />
        {title}
      </div>
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </motion.div>
  );
}

export function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
  last,
  extra,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  last?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b"
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={16} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {extra}
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function DataRow({
  icon: Icon,
  label,
  desc,
  action,
  danger,
  last,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  action: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          danger ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon size={16} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", danger && "text-destructive")}>{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {action}
    </div>
  );
}
