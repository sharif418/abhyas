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
import { toBn, fromDateKey } from "@/lib/date-bn";

interface DailyPoint {
  date: string;
  minutes: number;
}

/**
 * 7-day focus minutes bar chart.
 * Shows daily focus time to visualize consistency.
 */
export function FocusDailyChart({ data }: { data: DailyPoint[] }) {
  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">দৈনিক ফোকাস</h2>
          <p className="text-[11px] text-muted-foreground">গত ৭ দিন</p>
        </div>
        <div className="text-right">
          <div className="tabular text-lg font-bold text-primary">
            {toBn(totalMinutes)}
          </div>
          <div className="text-[10px] text-muted-foreground">মোট মিনিট</div>
        </div>
      </div>

      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => {
                const d = fromDateKey(v);
                return ["রবি","সোম","মঙ্গল","বুধ","বৃহঃ","শুক্র","শনি"][d.getDay()];
              }}
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
              labelFormatter={(v) => {
                const d = fromDateKey(v);
                return `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}`;
              }}
              formatter={(v: number) => [`${toBn(v)} মিনিট`, "ফোকাস"]}
            />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.minutes > 0
                      ? "var(--primary)"
                      : "var(--muted)"
                  }
                  opacity={entry.minutes > 0 ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
