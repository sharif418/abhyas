"use client";

import { motion } from "framer-motion";
import { getDailyQuote } from "@/constants/daily-quotes";

/**
 * Daily Motivation card — shows a curated Bengali quote that rotates daily.
 * Premium card design with gradient accent, no emojis.
 */
export function DailyQuoteCard() {
  const quote = getDailyQuote();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm"
    >
      <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            আজকের অনুপ্রেরণা
          </div>
          <p className="mt-1 text-sm font-medium leading-snug">
            {quote.text}
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            — {quote.author}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
