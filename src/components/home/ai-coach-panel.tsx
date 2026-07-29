"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, RefreshCw, Lightbulb, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface CoachResponse {
  encouragement: string;
  riskAlert: string | null;
  suggestions: string[];
}

/**
 * AI Coach panel — fetches personalized insights from /api/ai/coach.
 * Shows encouragement, risk alerts, and actionable suggestions.
 */
export function AICoachPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading, isFetching } = useQuery<CoachResponse>({
    queryKey: ["ai-coach", refreshKey],
    queryFn: () => api.get<CoachResponse>("/api/ai/coach"),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-500/5 via-card to-card p-4 shadow-sm"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">AI কোচ</h2>
              <p className="text-[10px] text-muted-foreground">আপনার জন্য ব্যক্তিগত পরামর্শ</p>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/70 disabled:opacity-50"
            aria-label="রিফ্রেশ"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </motion.div>
          ) : data ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Encouragement */}
              <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/8 p-2.5">
                <Heart size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <p className="text-sm font-medium leading-snug">{data.encouragement}</p>
              </div>

              {/* Risk alert */}
              {data.riskAlert && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-2.5"
                >
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium leading-snug text-amber-700 dark:text-amber-300">
                    {data.riskAlert}
                  </p>
                </motion.div>
              )}

              {/* Suggestions */}
              <div className="space-y-1.5">
                {data.suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-2 rounded-xl bg-muted/40 p-2"
                  >
                    <Lightbulb
                      size={14}
                      className="mt-0.5 shrink-0 text-violet-500"
                    />
                    <p className="text-xs leading-snug">{s}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
