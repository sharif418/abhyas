"use client";

import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toBn } from "@/lib/date-bn";
import { CATEGORY_MAP } from "@/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WeeklyInsights, type InsightsData } from "@/components/stats/weekly-insights";
import type { StatsResponse } from "@/components/stats/stats-shared";

interface StatsOverviewTabProps {
  insights: InsightsData;
  categories: StatsResponse["categories"];
}

/**
 * Theme-aware fallback for categories missing from CATEGORY_MAP.
 * (Previously a flat #999 gray that broke the dark theme.)
 */
const UNKNOWN_CATEGORY_COLOR = "var(--muted-foreground)";

function categoryColor(category: string): string {
  return (
    CATEGORY_MAP[category as keyof typeof CATEGORY_MAP]?.color ??
    UNKNOWN_CATEGORY_COLOR
  );
}

/** সারসংক্ষেপ tab: weekly insights card + category breakdown donut. */
export function StatsOverviewTab({ insights, categories }: StatsOverviewTabProps) {
  return (
    <>
      <WeeklyInsights insights={insights} />

      {categories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="gap-3 rounded-3xl p-4">
            <CardHeader className="px-0">
              <CardTitle className="text-sm font-bold">ক্যাটেগরি বিশ্লেষণ</CardTitle>
              <CardDescription className="text-[11px]">
                কোন ক্ষেত্রে বেশি মনোযোগ
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="flex items-center gap-4">
                {/* Donut: habit count per category */}
                <div className="h-36 w-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories.map((c) => ({
                          name: c.category,
                          value: c.habits,
                        }))}
                        dataKey="value"
                        innerRadius={36}
                        outerRadius={62}
                        paddingAngle={2}
                      >
                        {categories.map((c, i) => (
                          <Cell key={i} fill={categoryColor(c.category)} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend + today's completion rate per category */}
                <div className="flex-1 space-y-2">
                  {categories.slice(0, 6).map((c) => {
                    const meta =
                      CATEGORY_MAP[c.category as keyof typeof CATEGORY_MAP];
                    const rate = c.habits > 0 ? c.doneToday / c.habits : 0;
                    return (
                      <div key={c.category} className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: categoryColor(c.category) }}
                          />
                          <span className="flex-1 truncate">
                            {meta?.emoji} {c.category}
                          </span>
                          <span className="tabular font-medium text-muted-foreground">
                            {toBn(c.doneToday)}/{toBn(c.habits)}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${rate * 100}%`,
                              background: meta?.color ?? "var(--primary)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
}
