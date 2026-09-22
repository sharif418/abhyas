"use client";

import { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";
import { ALL_VIEWS } from "./nav-config";
import { ResponsiveModal } from "@/components/overlays/responsive-modal";
import { toBn } from "@/lib/date-bn";

interface Shortcut {
  key: string;
  description: string;
}

/** Navigation shortcuts are derived from nav-config — single source of truth. */
const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: "নেভিগেশন",
    items: ALL_VIEWS.map((v, i) => ({
      key: toBn(i + 1),
      description: v.label,
    })),
  },
  {
    section: "অন্যান্য",
    items: [
      { key: "?", description: "এই শর্টকাট মেনু দেখান" },
      { key: "Esc", description: "মেনু/মডাল বন্ধ করুন" },
      { key: "N", description: "নতুন অভ্যাস যোগ করুন" },
    ],
  },
];

/**
 * Keyboard shortcuts overlay — press "?" to toggle.
 * Rendered through the unified ResponsiveModal primitive (mobile bottom
 * sheet / desktop dialog) instead of a hand-rolled fixed overlay.
 */
export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      title="কীবোর্ড শর্টকাট"
      description="দ্রুত কাজের জন্য শর্টকাট"
      size="sm"
    >
      <div className="mb-4 flex items-center gap-2 text-primary" aria-hidden>
        <Keyboard size={20} />
      </div>
      <div className="space-y-5">
        {SHORTCUTS.map((section) => (
          <div key={section.section}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {section.section}
            </h3>
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                  <kbd className="flex h-7 min-w-7 items-center justify-center rounded-md border bg-muted px-2 text-xs font-bold shadow-sm">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-[11px] text-muted-foreground">
        কীবোর্ডে <kbd className="rounded border bg-muted px-1 font-bold">?</kbd> চাপলে এই মেনু খুলে
      </p>
    </ResponsiveModal>
  );
}
