"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useQuranSessions, useLogQuran } from "@/hooks/use-prayer";
import { toBn, todayKey } from "@/lib/date-bn";
import { SURAHS } from "@/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface QuranData {
  sessions: any[];
  totalPages: number;
  totalSessions: number;
  streak: number;
}

export function QuranTracker() {
  const { data } = useQuranSessions();
  const [open, setOpen] = useState(false);

  const totalPages = data?.totalPages ?? 0;
  const streak = data?.streak ?? 0;
  // Khatm progress: 604 pages total in a standard mushaf
  const khatmPct = Math.min(1, totalPages / 604);

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <div>
            <h2 className="font-bold leading-tight">কুরআন তিলাওয়াত</h2>
            <p className="text-[11px] text-muted-foreground">আপনার পাঠের অগ্রগতি</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus size={14} /> লগ করুন
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>কুরআন সেশন লগ করুন</DialogTitle>
              <DialogDescription>
                আজকের তিলাওয়াতের বিবরণ লিখুন
              </DialogDescription>
            </DialogHeader>
            <LogForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Khatm progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium">খতম অগ্রগতি</span>
          <span className="tabular text-muted-foreground">
            {toBn(totalPages)} / ৬০৪ পৃষ্ঠা
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-islamic to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${khatmPct * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1 text-right text-[10px] text-muted-foreground">
          {toBn(Math.round(khatmPct * 100))}% সম্পন্ন
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="মোট পৃষ্ঠা" value={totalPages} icon="BookOpen" />
        <Stat label="সেশন" value={data?.totalSessions ?? 0} icon="ListChecks" />
        <Stat label="স্ট্রিক" value={streak} icon="Flame" streak />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  streak,
}: {
  label: string;
  value: number;
  icon: string;
  streak?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 p-2.5 text-center">
      <div
            className={cn(
              "mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg",
              streak ? "bg-streak/15 text-streak" : "bg-islamic/15 text-islamic"
            )}
          >
        {icon === "Flame" ? (
          <Flame size={14} fill="currentColor" />
        ) : icon === "BookOpen" ? (
          <BookOpen size={14} />
        ) : (
          <span className="text-xs font-bold">✓</span>
        )}
      </div>
      <div className="tabular text-lg font-extrabold leading-none">{toBn(value)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function LogForm({ onSuccess }: { onSuccess: () => void }) {
  const log = useLogQuran();
  const [surah, setSurah] = useState(SURAHS[0].number);
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(SURAHS[0].ayahs);
  const [pages, setPages] = useState(1);

  const submit = () => {
    log.mutate(
      {
        date: todayKey(),
        surah,
        fromAyah,
        toAyah,
        pagesRead: pages,
      },
      { onSuccess }
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>সূরা</Label>
        <Select value={String(surah)} onValueChange={(v) => {
          const n = Number(v);
          setSurah(n);
          const s = SURAHS.find((x) => x.number === n);
          if (s) {
            setFromAyah(1);
            setToAyah(s.ayahs);
          }
        }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SURAHS.map((s) => (
              <SelectItem key={s.number} value={String(s.number)}>
                {s.name} ({s.nameArabic})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>শুরু (আয়াত)</Label>
          <Input
            type="number"
            min={1}
            value={fromAyah}
            onChange={(e) => setFromAyah(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>শেষ (আয়াত)</Label>
          <Input
            type="number"
            min={fromAyah}
            value={toAyah}
            onChange={(e) => setToAyah(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>পৃষ্ঠা পড়েছেন</Label>
        <Input
          type="number"
          min={0}
          value={pages}
          onChange={(e) => setPages(Number(e.target.value))}
        />
      </div>
      <Button onClick={submit} disabled={log.isPending} className="w-full">
        {log.isPending ? "লগ হচ্ছে..." : "সেশন সংরক্ষণ করুন"}
      </Button>
    </div>
  );
}
