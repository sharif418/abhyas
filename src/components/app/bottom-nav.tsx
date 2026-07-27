"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { NAV_ITEMS } from "./nav-config";
import { useUIStore } from "@/stores/ui-store";

/** Mobile bottom tab navigation (premium pill style, horizontally scrollable). */
export function BottomNav() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-safe lg:hidden">
      <div className="no-scrollbar mx-auto flex max-w-lg items-stretch gap-0.5 overflow-x-auto px-1.5">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className="relative flex min-w-[3.25rem] flex-1 flex-col items-center gap-0.5 py-2.5"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-10 items-center justify-center rounded-full transition-colors",
                  active ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute h-8 w-10 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  <IconRenderer name={item.icon} size={18} />
                </span>
              </span>
              <span
                className={cn(
                  "relative z-10 text-[8.5px] font-medium leading-none transition-colors",
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
  );
}
