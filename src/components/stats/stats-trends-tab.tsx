"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toBn } from "@/lib/date-bn";
import {
  CHART_AXIS_PROPS,
  CHART_TOOLTIP_CURSOR,
  CHART_TOOLTIP_STYLE,
} from "@/components/shared/chart-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { YearlyHeatmap } from "@/components/stats/yearly-heatmap";
import {
  MonthlyTrendChart,
  type MonthlyTrendPoint,
} from "@/components/stats/monthly-trend-chart";
import type { StatsResponse } from "@/components/stats/stats-shared";

interface StatsTrendsTabProps {
  dailySeries: StatsResponse["dailySeries"];
  weekly: StatsResponse["weekly"];
  monthlyTrend: MonthlyTrendPoint[];
  yearlyHeatmap: StatsResponse["yearlyHeatmap"];
}

/** ধারা tab: yearly heatmap + last-30-day activity bars + 12-month trend. */
export function StatsTrendsTab({
  dailySeries,
  weekly,
  monthlyTrend,
  yearlyHeatmap,
}: StatsTrendsTabProps) {
  return (
    <>
      {/* Yearly heatmap */}
      {yearlyHeatmap && yearlyHeatmap.length > 0 && (
        <YearlyHeatmap data={yearlyHeatmap} />
      )}

      {/* Weekly completion chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="gap-3 rounded-3xl p-4">
          <CardHeader className="px-0">
            <CardTitle className="text-sm font-bold">
              গত ৩০ দিনের কার্যকলাপ
            </CardTitle>
            <CardDescription className="text-[11px]">
              সপ্তাহিক হার: {toBn(Math.round(weekly.rate * 100))}%
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailySeries}
                  margin={{ top: 8, right: 0, left: -24, bottom: 0 }}
                >
                  <XAxis
                    {...CHART_AXIS_PROPS}
                    dataKey="date"
                    tickFormatter={(v: string) => toBn(new Date(v).getDate())}
                    interval={4}
                  />
                  <YAxis
                    {...CHART_AXIS_PROPS}
                    tickFormatter={(v: number) => toBn(v)}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={CHART_TOOLTIP_CURSOR}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}`;
                    }}
                    formatter={(v: number) => [`${toBn(v)} টি`, "সম্পন্ন"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={14}>
                    {dailySeries.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.count > 0 ? "var(--primary)" : "var(--muted)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly trend (12 months) */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <MonthlyTrendChart data={monthlyTrend} />
      )}
    </>
  );
}
