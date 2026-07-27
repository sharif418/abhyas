"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar, Clock } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

export interface InsightsData {
  bestWeekday: string;
  bestWeekdayCount: number;
  bestTime: string;
  bestTimeCount: number;
  momentumDelta: number;
  momentumLabel: string;
  last7Rate: number;
  prev7Rate: number;
  weekdaySeries: { name: string; count: number }[];
  timeOfDaySeries: { name: string; count: number }[];
}

export function WeeklyInsights({ insights }: { insights: InsightsData }) {
  const momentumUp = insights.momentumDelta > 0.1;
  const momentumDown = insights.momentumDelta < -0.1;
  const MomentumIcon = momentumUp ? TrendingUp : momentumDown ? TrendingDown : Minus;
  const momentumColor = momentumUp
    ? "text-emerald-600 dark:text-emerald-400"
    : momentumDown
    ? "text-rose-600 dark:text-rose-400"
    : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3">
        <h2 className="text-sm font-bold">সাপ্তাহিক অন্তর্দৃষ্টি</h2>
        <p className="text-[11px] text-muted-foreground">
          আপনার অভ্যাসের ধরন বিশ্লেষণ
        </p>
      </div>

      {/* Momentum hero */}
      <div
        className={cn(
          "mb-4 flex items-center gap-3 rounded-2xl border p-3",
          momentumUp
            ? "border-emerald-500/30 bg-emerald-500/5"
            : momentumDown
            ? "border-rose-500/30 bg-rose-500/5"
            : "border-border bg-muted/30"
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            momentumUp
              ? "bg-emerald-500/15"
              : momentumDown
              ? "bg-rose-500/15"
              : "bg-muted"
          )}
        >
          <MomentumIcon size={20} className={momentumColor} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">গতিপ্রকৃতি</div>
          <div className="text-xs text-muted-foreground">
            গত ৭ দিন vs তার আগের ৭ দিন
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-lg font-bold", momentumColor)}>
            {insights.momentumLabel}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {insights.momentumDelta > 0 ? "+" : ""}
            {toBn(Math.round(insights.momentumDelta * 100))}%
          </div>
        </div>
      </div>

      {/* Insight cards */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <InsightCard
          icon="Calendar"
          label="সেরা দিন"
          value={insights.bestWeekday}
          sub={`${toBn(insights.bestWeekdayCount)} বার সম্পন্ন`}
          color="#7c3aed"
        />
        <InsightCard
          icon="Clock"
          label="সেরা সময়"
          value={insights.bestTime}
          sub={`${toBn(insights.bestTimeCount)} বার সম্পন্ন`}
          color="#0d9488"
        />
      </div>

      {/* Weekday chart */}
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">
        সপ্তাহের দিন অনুযায়ী সম্পন্ন
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={insights.weekdaySeries}
            margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => toBn(v)}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${toBn(v)} বার`, "সম্পন্ন"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {insights.weekdaySeries.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.name === insights.bestWeekday
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 40%, var(--muted))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const Icons: Record<string, any> = { Calendar, Clock };
  const Icon = Icons[icon] ?? Calendar;
  return (
    <div className="rounded-2xl border bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon size={12} style={{ color }} />
        {label}
      </div>
      <div className="mt-1 text-base font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
