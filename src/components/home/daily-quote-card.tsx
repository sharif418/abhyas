"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, Quote, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getDailyContent } from "@/constants/daily-content";

/**
 * দৈনিক ইসলামিক কনটেন্ট কার্ড — rotates daily between আয়াত and হাদিস.
 *
 * Each entry shows the Arabic text (RTL), a standard Bengali translation,
 * a short Bengali reflection and the source reference. Rotation follows the
 * day-of-year modulo pool-length convention (same entry all day, changes at
 * midnight). Premium card styling, no emojis, Bengali labels only.
 */
export function DailyQuoteCard() {
  const entry = getDailyContent();
  const [copied, setCopied] = useState(false);

  const isAyah = entry.kind === "ayah";
  const headerLabel = isAyah ? "আজকের আয়াত" : "আজকের হাদিস";
  const kindLabel = isAyah ? "আয়াত" : "হাদিস";

  const shareText = `${headerLabel}\n\n${entry.arabic}\n\n${entry.bn}\n\n${entry.reflection}\n\n— ${entry.source}`;

  const handleShare = async () => {
    // Prefer the native share sheet when available…
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: headerLabel, text: shareText });
        return;
      } catch {
        // User dismissed the sheet (or share failed) — fall back to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("কপি হয়েছে!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("শেয়ার করতে সমস্যা হয়েছে");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="article"
      aria-label={`${headerLabel} — ${entry.source}`}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm"
    >
      <div
        className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-primary/8 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-islamic/10 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        {/* Header — label + kind badge + share affordance */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-islamic/10 text-islamic shadow-sm"
              aria-hidden
            >
              <Quote size={18} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {headerLabel}
              </span>
              <span className="rounded-full bg-islamic/10 px-2 py-0.5 text-[10px] font-bold text-islamic">
                {kindLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            aria-label="শেয়ার করুন"
            title="শেয়ার করুন"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? (
              <Check size={15} aria-hidden />
            ) : (
              <Share2 size={15} aria-hidden />
            )}
          </button>
        </div>

        {/* Arabic — RTL, rendered with the app's Arabic serif stack */}
        <p
          dir="rtl"
          lang="ar"
          className="font-arabic mt-3 text-center text-lg leading-loose"
        >
          {entry.arabic}
        </p>

        {/* Bengali translation */}
        <p className="mt-2.5 text-sm font-medium leading-snug">{entry.bn}</p>

        {/* Bengali reflection */}
        <div className="mt-3 rounded-xl bg-primary/5 p-2.5 text-xs leading-relaxed text-muted-foreground">
          {entry.reflection}
        </div>

        {/* Source reference */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BookOpen size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{entry.source}</span>
        </div>
      </div>
    </motion.div>
  );
}
