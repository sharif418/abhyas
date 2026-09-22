"use client";

import { motion } from "framer-motion";
import { IconRenderer } from "@/components/shared/icon-renderer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoodTrendChart } from "@/components/stats/mood-trend-chart";
import { MoodCorrelationCard } from "@/components/stats/mood-correlation-card";
import type { StatsResponse } from "@/components/stats/stats-shared";

interface StatsMoodTabProps {
  mood: StatsResponse["mood"];
  moodCorrelations: StatsResponse["moodCorrelations"];
}

/** মুড tab: mood trend chart + mood-habit correlation (or the empty state). */
export function StatsMoodTab({ mood, moodCorrelations }: StatsMoodTabProps) {
  if (mood && mood.series.length > 0) {
    return (
      <>
        {/* Mood trend chart */}
        <MoodTrendChart data={mood.series} />

        {/* Mood-habit correlation */}
        {moodCorrelations && <MoodCorrelationCard correlations={moodCorrelations} />}
      </>
    );
  }

  // Empty state — no mood logs yet (guides the user to the Home mood selector)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="gap-3 rounded-3xl p-4">
        <CardHeader className="px-0">
          <CardTitle className="text-sm font-bold">মুড ট্র্যাকিং</CardTitle>
          <CardDescription className="text-[11px]">আপনার মুডের ধারা</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconRenderer name="Heart" size={26} />
            </div>
            <div>
              <h3 className="font-semibold">এখনো কোনো মুড লগ নেই</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                হোম পেজ থেকে প্রতিদিন আপনার মুড নির্বাচন করুন। কিছুদিন পর এখানে
                আপনার মুডের ধারা এবং অভ্যাসের সাথে সম্পর্ক দেখতে পাবেন।
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
