"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import { toBn } from "@/lib/date-bn";

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  done: number;
  scheduled: number;
  rate: number;
}

export function MonthlyTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  // average rate for reference line
  const avgRate =
    data.length > 0
      ? data.reduce((s, d) => s + d.rate, 0) / data.length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">বার্ষিক ধারা</h2>
          <p className="text-[11px] text-muted-foreground">
            গত ১২ মাসের সম্পন্নের হার
          </p>
        </div>
        <div className="text-right">
          <div className="tabular text-lg font-bold text-primary">
            {toBn(Math.round(avgRate * 100))}%
          </div>
          <div className="text-[10px] text-muted-foreground">গড় হার</div>
        </div>
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `${toBn(Math.round(v * 100))}%`}
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              labelFormatter={(v) => `${v}`}
              formatter={(v: number, _name, props) => {
                const p = props.payload as MonthlyTrendPoint;
                return [
                  `${toBn(Math.round(v * 100))}% (${toBn(p.done)}/${toBn(p.scheduled)})`,
                  "সম্পন্নের হার",
                ];
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fill="url(#rateGradient)"
              dot={{ fill: "var(--primary)", r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* mini summary stats */}
      <div className="mt-3 flex justify-between border-t pt-3 text-center">
        <div>
          <div className="tabular text-sm font-bold">
            {toBn(data.reduce((s, d) => s + d.done, 0))}
          </div>
          <div className="text-[9px] text-muted-foreground">মোট সম্পন্ন</div>
        </div>
        <div>
          <div className="tabular text-sm font-bold">
            {toBn(Math.round(avgRate * 100))}%
          </div>
          <div className="text-[9px] text-muted-foreground">গড় হার</div>
        </div>
        <div>
          <div className="tabular text-sm font-bold text-primary">
            {toBn(Math.round(Math.max(...data.map((d) => d.rate)) * 100))}%
          </div>
          <div className="text-[9px] text-muted-foreground">সেরা মাস</div>
        </div>
      </div>
    </motion.div>
  );
}

// unused import suppression
void LineChart;
void Line;
