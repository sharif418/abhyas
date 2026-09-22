"use client";

import * as React from "react";
import { AlertTriangle, Trash2, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Unified confirmation dialog — the ONE way to ask "are you sure?" in অভ্যাস.
 * Replaces the per-feature ad-hoc AlertDialogs (delete habit, reset data,
 * freeze streak, …) with consistent anatomy, Bengali copy and intent styling.
 *
 * Variants:
 *  - destructive (red)   — irreversible data loss
 *  - confirm   (primary) — confident action
 *  - info      (neutral) — heads-up before an action
 */

type ConfirmVariant = "destructive" | "confirm" | "info";

const ICONS: Record<ConfirmVariant, React.ElementType> = {
  destructive: Trash2,
  confirm: CheckCircle2,
  info: Info,
};

const ICON_CLASSES: Record<ConfirmVariant, string> = {
  destructive:
    "bg-destructive/10 text-destructive dark:bg-destructive/20",
  confirm: "bg-primary/10 text-primary dark:bg-primary/20",
  info: "bg-muted text-muted-foreground",
};

const ACTION_CLASSES: Record<ConfirmVariant, string> = {
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40",
  confirm: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40",
  info: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40",
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Action title, e.g. "অভ্যাস মুছে ফেলুন?" */
  title: string;
  /** Explanation of consequences — be specific about what is lost. */
  description: string;
  /** Confirm button label (defaults to "নিশ্চিত করুন"). */
  confirmLabel?: string;
  /** Cancel button label (defaults to "বাতিল"). */
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Show the warning triangle instead of the variant icon. */
  warn?: boolean;
  onConfirm: () => void;
  /** Disable the confirm button (e.g. while async reset runs). */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "নিশ্চিত করুন",
  cancelLabel = "বাতিল",
  variant = "confirm",
  warn,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  const Icon = warn ? AlertTriangle : ICONS[variant];
  const iconClass = warn ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : ICON_CLASSES[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-0 rounded-2xl p-0 sm:max-w-md">
        <AlertDialogHeader className="gap-0 p-5 sm:p-6 sm:pb-2">
          <div
            className={cn(
              "mb-4 inline-flex size-11 items-center justify-center rounded-full",
              iconClass
            )}
            aria-hidden
          >
            <Icon className="size-5" />
          </div>
          <AlertDialogTitle className="text-left text-lg font-bold leading-snug">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-left text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 px-5 pb-5 sm:flex-row sm:px-6 sm:pb-6">
          <AlertDialogCancel className="mt-0 rounded-xl">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open while `loading` runs
              onConfirm();
            }}
            disabled={loading}
            className={cn("rounded-xl", ACTION_CLASSES[variant])}
          >
            {loading ? "অপেক্ষা করুন…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
