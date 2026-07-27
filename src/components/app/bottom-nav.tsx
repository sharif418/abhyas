"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { NAV_ITEMS } from "./nav-config";
import { useUIStore } from "@/stores/ui-store";

/** Mobile bottom tab navigation (premium pill style). */
export function BottomNav() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-safe lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
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
                <span className="relative z-10">
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
  );
}
