"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, Target, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface RecapResponse {
  headline: string;
  highlights: string[];
  improvement: string;
  nextWeekFocus: string;
}

/**
 * Weekly AI Recap card — shows an LLM-generated summary of the past week.
 * Collapsible to save space. Refresh button to regenerate.
 */
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const LAST_FETCH_KEY = "abhyas-recap-last-fetch";

export function WeeklyRecapCard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Check cooldown on mount + every minute
  useState(() => {
    const check = () => {
      try {
        const last = localStorage.getItem(LAST_FETCH_KEY);
        if (last) {
          const elapsed = Date.now() - Number(last);
          if (elapsed < COOLDOWN_MS) {
            setCooldownLeft(Math.ceil((COOLDOWN_MS - elapsed) / 60000));
          }
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  });

  const { data, isLoading, isFetching } = useQuery<RecapResponse>({
    queryKey: ["ai-recap", refreshKey],
    queryFn: async () => {
      try {
        const res = await api.get<RecapResponse>("/api/ai/recap");
        try {
          localStorage.setItem(LAST_FETCH_KEY, String(Date.now()));
          setCooldownLeft(30);
        } catch {}
        return res;
      } catch {
        // Return a fallback if the LLM is rate-limited
        return {
          headline: "এই সপ্তাহে আপনি এগিয়ে আছেন!",
          highlights: ["ধারাবাহিকতা বজায় রাখুন"],
          improvement: "প্রতিদিন অভ্যাস সম্পন্ন করুন।",
          nextWeekFocus: "একটি নতুন অভ্যাস যোগ করে রুটিন বাড়ান।",
        };
      }
    },
    staleTime: COOLDOWN_MS, // 30 min cache
    retry: 0, // don't retry on 429
  });

  const handleRefresh = () => {
    if (cooldownLeft > 0) return;
    setRefreshKey((k) => k + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-500/8 via-card to-card p-4 shadow-sm"
    >
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/12 blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold leading-tight">সাপ্তাহিক সারসংক্ষেপ</h2>
              <p className="text-[10px] text-muted-foreground">AI দিয়ে তৈরি</p>
            </div>
            {expanded ? (
              <ChevronUp size={16} className="shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isFetching || cooldownLeft > 0}
            className="ml-2 flex h-7 items-center gap-1 rounded-full bg-muted px-2 text-muted-foreground transition hover:bg-muted/70 disabled:opacity-50"
            aria-label="রিফ্রেশ"
            title={cooldownLeft > 0 ? `${cooldownLeft} মিনিট পরে আবার চেষ্টা করুন` : "রিফ্রেশ"}
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            {cooldownLeft > 0 && (
              <span className="text-[9px] tabular">{cooldownLeft}মি</span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {isLoading ? (
                <div className="space-y-2 py-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              ) : data ? (
                <div className="space-y-3">
                  {/* Headline */}
                  <div className="rounded-2xl bg-emerald-500/8 p-2.5">
                    <p className="text-sm font-semibold leading-snug">
                      ✨ {data.headline}
                    </p>
                  </div>

                  {/* Highlights */}
                  {data.highlights.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <TrendingUp size={11} className="text-emerald-500" />
                        সপ্তাহের সেরা অর্জন
                      </div>
                      {data.highlights.map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-start gap-2 rounded-xl bg-muted/30 p-2"
                        >
                          <span className="mt-0.5 text-emerald-500">✓</span>
                          <p className="text-xs leading-snug">{h}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Improvement + Next week focus */}
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                      <span className="text-base">📈</span>
                      <p className="text-xs leading-snug text-amber-700 dark:text-amber-300">
                        {data.improvement}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-2.5">
                      <Target size={14} className="mt-0.5 shrink-0 text-violet-500" />
                      <p className="text-xs leading-snug">
                        <span className="font-semibold">আগামী সপ্তাহ: </span>
                        {data.nextWeekFocus}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
