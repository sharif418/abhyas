"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
}

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: "নেভিগেশন",
    items: [
      { key: "1", description: "হোম" },
      { key: "2", description: "অভ্যাস" },
      { key: "3", description: "ফোকাস" },
      { key: "4", description: "পরিসংখ্যান" },
      { key: "5", description: "ইসলামিক" },
      { key: "6", description: "জার্নাল" },
      { key: "7", description: "সোশ্যাল" },
      { key: "8", description: "প্রোফাইল" },
    ],
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
 * Shows all available keyboard shortcuts in a clean modal.
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
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard size={20} className="text-primary" />
                <h2 className="text-lg font-bold">কীবোর্ড শর্টকাট</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                aria-label="বন্ধ করুন"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {SHORTCUTS.map((section) => (
                <div key={section.section}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.section}
                  </h3>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {item.description}
                        </span>
                        <kbd className="flex h-7 min-w-7 items-center justify-center rounded-md border bg-muted px-2 text-xs font-bold shadow-sm">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-center text-[11px] text-muted-foreground">
              কীবোর্ডে <kbd className="rounded border bg-muted px-1 font-bold">?</kbd> চাপলে এই মেনু খুলে
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
