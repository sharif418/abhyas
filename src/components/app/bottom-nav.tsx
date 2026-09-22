"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { NAV_ITEMS, MORE_ITEMS } from "./nav-config";
import { useUIStore } from "@/stores/ui-store";
import { BottomSheetMenu } from "@/components/overlays/bottom-sheet-menu";
import type { ViewKey } from "@/types";

/**
 * Mobile bottom tab navigation — 4 primary tabs + "আরও".
 *
 * The আরও tab opens a proper bottom sheet (drag-to-dismiss, backdrop,
 * focus-trapped — via the unified BottomSheetMenu primitive) instead of the
 * old floating popover. This is the native-app convention for overflow menus
 * anchored to a bottom control.
 */
export function BottomNav() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const moreOpen = useUIStore((s) => s.moreSheetOpen);
  const setMoreOpen = useUIStore((s) => s.setMoreSheetOpen);

  const isMoreActive = MORE_ITEMS.some((item) => item.key === view);

  return (
    <>
      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-safe lg:hidden"
        aria-label="প্রধান নেভিগেশন"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {NAV_ITEMS.map((item) => {
            if (item.key === "more") {
              const lit = isMoreActive || moreOpen;
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setMoreOpen(!moreOpen)}
                  aria-label="আরও মেনু"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-current={isMoreActive ? "page" : undefined}
                  className="focus-visible:ring-ring/70 relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      lit ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {lit && (
                      <motion.span
                        layoutId="bottom-nav-active"
                        className="absolute h-8 w-12 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10" aria-hidden>
                      <IconRenderer name={item.icon} size={20} />
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-medium transition-colors",
                      lit ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            const active = view === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="focus-visible:ring-ring/70 relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute h-8 w-12 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10" aria-hidden>
                    <IconRenderer name={item.icon} size={20} />
                  </span>
                </span>
                <span
                  className={cn(
                    "relative z-10 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <BottomSheetMenu
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="আরও দেখুন"
        items={MORE_ITEMS}
        activeKey={view}
        onSelect={(key: ViewKey) => setView(key)}
      />
    </>
  );
}
