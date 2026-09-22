"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Download, Smartphone } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared building blocks for the নিয়ন্ত্রণ কেন্দ্র (Control Center). */

export function GuardSection({
  title,
  desc,
  icon: Icon,
  children,
  id,
}: {
  title: string;
  desc?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="text-sm font-bold">
            {title}
          </h2>
          {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

/**
 * The honest web fallback: these controls are OS-level capabilities that no
 * browser can offer. Instead of faking them, we explain and invite the
 * one-tap install (the WebAPK install prompt when available).
 */
export function WebFallback({ featureName }: { featureName: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Smartphone className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-semibold">অ্যান্ড্রয়েড অ্যাপ লাগবে</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {featureName} ফোনের অপারেটিং সিস্টেমের লেভেলে কাজ করে — ব্রাউজার থেকে এটা সম্ভব নয়।
        অ্যাপ ইনস্টল করলেই এই নিয়ন্ত্রণটি এখানে চালু হয়ে যাবে।
      </p>
      <div className="mt-3 flex justify-center">
        <a
          href="#/profile"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition active:scale-95"
        >
          <Download className="size-3.5" aria-hidden />
          সেটিংস থেকে ইনস্টল করুন
        </a>
      </div>
    </div>
  );
}

/** Bengali duration: 90 → "১ ঘণ্টা ৩০ মিনিট"; 25 → "২৫ মিনিট". */
export function formatMinutesBn(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0 && m > 0) return `${toBn(h)} ঘণ্টা ${toBn(m)} মিনিট`;
  if (h > 0) return `${toBn(h)} ঘণ্টা`;
  return `${toBn(m)} মিনিট`;
}

/** Usage bar: fraction of today's budget consumed (over-limit turns red). */
export function UsageBar({
  todayMinutes,
  limitMinutes,
  className,
}: {
  todayMinutes: number;
  limitMinutes: number;
  className?: string;
}) {
  const pct =
    limitMinutes > 0
      ? Math.min(100, Math.round((todayMinutes / limitMinutes) * 100))
      : 100;
  const over = limitMinutes > 0 && todayMinutes >= limitMinutes;
  return (
    <div
      role="progressbar"
      aria-label="আজকের ব্যবহার"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
