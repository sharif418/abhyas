"use client";

import { motion } from "framer-motion";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Premium empty state with animated icon, gradient background, and clear CTA.
 * Used across views when there's no data to show.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed bg-gradient-to-br from-muted/30 to-card p-8 text-center",
        className,
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
        className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm"
      >
        <IconRenderer name={icon} size={28} />
      </motion.div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
