"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import { DUAS, type Dua } from "@/constants";
import { cn } from "@/lib/utils";

const CATEGORIES = ["সকাল", "সন্ধ্যা", "ঘুমানোর আগে", "খাবার", "ভ্রমণ", "বিপদে"] as const;

export function DuaLibrary() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number] | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = cat === "all" ? DUAS : DUAS.filter((d) => d.category === cat);

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-islamic text-islamic-foreground shadow-sm">
          <HeartHandshake size={18} />
        </div>
        <div>
          <h2 className="font-bold leading-tight">দোয়া সংগ্রহ</h2>
          <p className="text-[11px] text-muted-foreground">দৈনন্দিন জীবনের গুরুত্বপূর্ণ দোয়া</p>
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          সব
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {list.map((d) => (
            <DuaItem
              key={d.id}
              dua={d}
              expanded={expanded === d.id}
              onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DuaItem({
  dua,
  expanded,
  onToggle,
}: {
  dua: Dua;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="overflow-hidden rounded-2xl border bg-background/50"
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{dua.title}</div>
          <div className="text-[10px] text-muted-foreground">{dua.category}</div>
        </div>
        <span className="shrink-0 rounded-full bg-islamic/10 px-2 py-0.5 text-[10px] font-medium text-islamic">
          {dua.count ? `${toBnCount(dua.count)} বার` : "১ বার"}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="space-y-2 p-3">
              <p
                dir="rtl"
                className="text-right text-lg leading-loose"
                style={{ fontFamily: "var(--font-bengali), serif" }}
              >
                {dua.arabic}
              </p>
              <p className="text-sm font-medium text-islamic">{dua.bengali}</p>
              <p className="text-xs italic text-muted-foreground">{dua.transliteration}</p>
              <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                <span className="font-semibold">অর্থ: </span>
                {dua.meaning}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-islamic bg-islamic text-islamic-foreground"
          : "bg-card text-muted-foreground hover:border-islamic/40"
      )}
    >
      {children}
    </button>
  );
}

function toBnCount(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
}
