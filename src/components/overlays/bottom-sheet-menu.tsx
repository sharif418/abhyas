"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import type { NavItem } from "@/components/app/nav-config";

/**
 * BottomSheetMenu — unified "menu in a sheet" pattern.
 *
 * Used by the bottom-nav "আরও" tab (replacing the old tiny floating popover,
 * which had no backdrop, no Escape handling and cramped 36px rows). Follows
 * the Material/iOS convention: menus that anchor to a bottom control open as
 * a proper bottom sheet (mobile) / centered dialog (desktop) with backdrop,
 * focus trap, Escape-to-close and ≥48px touch targets.
 */

interface BottomSheetMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: NavItem[];
  /** Currently active view key (used to mark the active row). */
  activeKey?: string;
  onSelect: (key: NavItem["key"]) => void;
  footer?: React.ReactNode;
}

export function BottomSheetMenu({
  open,
  onOpenChange,
  title,
  items,
  activeKey,
  onSelect,
  footer,
}: BottomSheetMenuProps) {
  const isMobile = useIsMobile();

  const list = (
    <div role="menu" aria-label={title} className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="menuitem"
            type="button"
            onClick={() => {
              onSelect(item.key);
              onOpenChange(false);
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/70 flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
              active ? "bg-primary/10" : "hover:bg-muted/60 active:bg-muted"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
              aria-hidden
            >
              <IconRenderer name={item.icon} size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[15px] font-semibold",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                {item.label}
              </span>
              {item.description && (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
            </span>
            {active && (
              <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-3xl pb-safe">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <p className="text-sm font-bold tracking-wide text-muted-foreground">{title}</p>
          </div>
          {list}
          {footer && <div className="border-t px-4 py-3">{footer}</div>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[50%] left-[50%] w-full translate-x-[-50%] translate-y-[-50%] gap-0 rounded-2xl p-0 sm:max-w-xs"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <p className="text-sm font-bold tracking-wide text-muted-foreground">{title}</p>
        </div>
        {list}
        {footer && <div className="border-t px-4 py-3">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
