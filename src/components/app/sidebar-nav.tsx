"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { NAV_ITEMS, MORE_ITEMS } from "./nav-config";
import { useUIStore } from "@/stores/ui-store";

/** Desktop vertical sidebar navigation. */
export function SidebarNav() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar/60 p-4 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#0d9488] text-lg font-bold text-primary-foreground shadow-md">
          অ
        </div>
        <div className="leading-tight">
          <div className="font-bold">অভ্যাস</div>
          <div className="text-[10px] text-muted-foreground">স্বশাসন অ্যাপ</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="প্রধান নেভিগেশন">
        {NAV_ITEMS.filter((i) => i.key !== "more").map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                active
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10" aria-hidden>
                <IconRenderer name={item.icon} size={18} />
              </span>
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}

        {/* Separator */}
        <div className="my-2 border-t" role="separator" aria-orientation="horizontal" />

        {MORE_ITEMS.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                active
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10" aria-hidden>
                <IconRenderer name={item.icon} size={18} />
              </span>
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-gradient-to-br from-primary/10 to-[#0d9488]/10 p-4 text-xs">
        <div className="font-semibold">আজকের পরামর্শ</div>
        <p className="mt-1 text-muted-foreground">
          ছোট অভ্যাস দিয়ে শুরু করুন। ধারাবাহিকতাই আসল শক্তি।
        </p>
      </div>
    </aside>
  );
}
