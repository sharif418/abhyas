"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toBn, fromDateKey } from "@/lib/date-bn";

const MOOD_LABELS = ["", "খুব খারাপ", "খারাপ", "মোটামুটি", "ভালো", "খুব ভালো"];
const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];

export interface MoodPoint {
  date: string;
  mood: number | null;
  note: string | null;
}

export function MoodTrendChart({ data }: { data: MoodPoint[] }) {
  // filter to only days with mood entries for the chart
  const entries = data.filter((d) => d.mood !== null);
  const avg =
    entries.length > 0
      ? entries.reduce((s, d) => s + (d.mood as number), 0) / entries.length
      : 0;

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border bg-card p-4 shadow-sm"
      >
        <div className="mb-2">
          <h2 className="text-sm font-bold">মুড ধারা</h2>
          <p className="text-[11px] text-muted-foreground">গত ৩০ দিনের মুড</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="text-3xl">💭</span>
          <p className="text-xs text-muted-foreground">
            এখনো কোনো মুড লগ করা হয়নি। হোম পেজ থেকে আজকের মুড নির্বাচন করুন।
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">মুড ধারা</h2>
          <p className="text-[11px] text-muted-foreground">গত ৩০ দিনের মুড</p>
        </div>
        <div className="text-right">
          <div className="text-lg">
            {MOOD_EMOJI[Math.round(avg)] ?? "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            গড়: {MOOD_LABELS[Math.round(avg)] ?? "—"} ({toBn(entries.length)} দিন)
          </div>
        </div>
      </div>

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={entries}
            margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => {
                const d = fromDateKey(v);
                return `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}`;
              }}
              interval={Math.max(0, Math.floor(entries.length / 6))}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => MOOD_EMOJI[v] ?? ""}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              labelFormatter={(v) => {
                const d = fromDateKey(v);
                return `${toBn(d.getDate())} ${["জানু","ফেব্রু","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্ট","অক্টো","নভে","ডিসে"][d.getMonth()]}`;
              }}
              formatter={(v: number) => [
                `${MOOD_EMOJI[v]} ${MOOD_LABELS[v]}`,
                "মুড",
              ]}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ fill: "var(--primary)", r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
