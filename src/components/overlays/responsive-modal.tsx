"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

/**
 * ============================================================================
 * ResponsiveModal — THE unified overlay primitive for the entire app.
 * ============================================================================
 *
 * Senior-level overlay strategy (one system, zero ad-hoc popups):
 *
 *  Mobile  → vaul bottom Drawer (drag-to-dismiss, rounded-t-3xl, handle,
 *            backdrop, focus-trap — the native-app sheet convention).
 *  Desktop → Radix centered Dialog (rounded-2xl, zoom animation).
 *
 * Every popup in অভ্যাস (habit form, habit detail, templates, share, quran
 * log, onboarding, shortcuts help, heatmap day detail, …) renders through
 * this single component so they share:
 *   - identical header anatomy (title + optional description + close button)
 *   - identical scrollable body with the branded `fancy-scroll` scrollbar
 *   - identical footer slot (actions stay reachable above the fold)
 *   - identical backdrop, z-index and animation language
 *
 * Usage:
 *   <ResponsiveModal open={open} onOpenChange={setOpen}
 *                    title="নতুন অভ্যাস" description="আজই শুরু করুন">
 *     <FormBody />
 *     <ResponsiveModalFooter>…buttons…</ResponsiveModalFooter>
 *   </ResponsiveModal>
 */

type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Optional supporting line under the title. */
  description?: string;
  /** Extra height the body may occupy (e.g. "70dvh"). Default: 72dvh. */
  maxHeight?: string;
  size?: ModalSize;
  /** Hide the header row entirely (immersive content renders its own chrome). */
  hideHeader?: boolean;
  /** Disable body scrolling (rare: fully self-managed content). */
  noScroll?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

function ModalChrome({
  title,
  description,
  onClose,
  hideHeader,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  hideHeader?: boolean;
}) {
  if (hideHeader) return null;
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
      <div className="min-w-0">
        <h2 className="text-base leading-tight font-bold text-foreground sm:text-lg">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="বন্ধ করুন"
        className="focus-visible:ring-ring/70 absolute top-4 right-4 z-10 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:outline-none active:scale-95"
      >
        <XIcon className="size-4.5" aria-hidden />
      </button>
    </div>
  );
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  maxHeight = "72dvh",
  size = "md",
  hideHeader,
  noScroll,
  className,
  bodyClassName,
  children,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
        <DrawerContent
          className={cn("rounded-t-3xl pb-safe", className)}
        >
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          {description ? (
            <DrawerDescription className="sr-only">{description}</DrawerDescription>
          ) : null}
          <ModalChrome
            title={title}
            description={description}
            onClose={() => onOpenChange(false)}
            hideHeader={hideHeader}
          />
          <div
            className={cn(
              "fancy-scroll flex-1 px-5 pb-5",
              !noScroll && "overflow-y-auto",
              bodyClassName
            )}
            style={noScroll ? undefined : { maxHeight }}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "top-[50%] left-[50%] w-full translate-x-[-50%] translate-y-[-50%] gap-0 rounded-2xl p-0",
          SIZE_CLASSES[size],
          className
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="sr-only">{description}</DialogDescription>
        ) : null}
        <ModalChrome
          title={title}
          description={description}
          onClose={() => onOpenChange(false)}
          hideHeader={hideHeader}
        />
        <div
          className={cn(
            "fancy-scroll px-6 pb-6",
            !noScroll && "overflow-y-auto",
            bodyClassName
          )}
          style={noScroll ? undefined : { maxHeight }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Sticky footer area — keeps actions visible while long bodies scroll. */
export function ResponsiveModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky bottom-0 mt-4 flex flex-col-reverse gap-2 border-t bg-background/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:justify-end sm:px-6",
        className
      )}
      {...props}
    />
  );
}
