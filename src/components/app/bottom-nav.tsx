"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { NAV_ITEMS, MORE_ITEMS } from "./nav-config";
import { useUIStore } from "@/stores/ui-store";
import { useUIStore as useUI } from "@/stores/ui-store";
import { useState, useRef, useEffect } from "react";
import type { ViewKey } from "@/types";

/** Mobile bottom tab navigation — 5 primary tabs + More menu. */
export function BottomNav() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close More menu when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  // Check if current view is in the "more" list
  const isMoreActive = MORE_ITEMS.some((item) => item.key === view);

  const handleMoreClick = () => {
    setMoreOpen((v) => !v);
  };

  const handleMoreSelect = (key: ViewKey) => {
    setView(key);
    setMoreOpen(false);
  };

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-safe lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          if (item.key === "more") {
            return (
              <div key="more" ref={moreRef} className="relative flex flex-1">
                <button
                  onClick={handleMoreClick}
                  className="relative flex w-full flex-col items-center gap-0.5 py-2.5"
                  aria-label="আরও"
                  aria-expanded={moreOpen}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      isMoreActive || moreOpen
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {(isMoreActive || moreOpen) && (
                      <motion.span
                        layoutId="bottom-nav-active"
                        className="absolute h-8 w-12 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">
                      <IconRenderer name={moreOpen ? "X" : "Menu"} size={20} />
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-medium transition-colors",
                      isMoreActive || moreOpen
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {moreOpen ? "বন্ধ" : "আরও"}
                  </span>
                </button>

                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 rounded-2xl border bg-popover p-1.5 shadow-xl"
                    >
                      {MORE_ITEMS.map((mItem) => {
                        const active = view === mItem.key;
                        return (
                          <button
                            key={mItem.key}
                            onClick={() => handleMoreSelect(mItem.key)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition",
                              active
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            <IconRenderer name={mItem.icon} size={16} />
                            {mItem.label}
                            {active && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

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
