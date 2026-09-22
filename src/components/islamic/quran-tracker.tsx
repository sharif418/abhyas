"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Flame, ListChecks, WifiOff, RefreshCw, type LucideIcon } from "lucide-react";
import { useQuranSessions, useLogQuran } from "@/hooks/use-prayer";
import { toBn, todayKey } from "@/lib/date-bn";
import { SURAHS } from "@/constants";
import { ResponsiveModal, ResponsiveModalFooter } from "@/components/overlays/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** A serialized Prisma QuranSession row as returned by GET /api/quran. */
interface QuranSessionRow {
  id: string;
  userId: string;
  date: string;
  surah: number;
  fromAyah: number;
  toAyah: number;
  pagesRead: number;
  juz: number | null;
  createdAt: string;
}

/** GET /api/quran response — recent sessions + aggregate stats. */
interface QuranData {
  sessions: QuranSessionRow[];
  totalPages: number;
  totalSessions: number;
  streak: number;
}

export function QuranTracker() {
  const { data: raw, isLoading, isError, refetch } = useQuranSessions();
  const [open, setOpen] = useState(false);
  // Narrow the hook's loose `sessions: any[]` to the typed response shape.
  const data: QuranData | undefined = raw;

  const totalPages = data?.totalPages ?? 0;
  const streak = data?.streak ?? 0;
  // Khatm progress: 604 pages total in a standard mushaf
  const khatmPct = Math.min(1, totalPages / 604);

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-card p-5 shadow-sm" aria-busy>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[78px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-2 rounded-3xl border bg-card p-6 text-center shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <WifiOff size={20} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold">তিলাওয়াতের তথ্য লোড করা যায়নি</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            আপনার পঠিত পৃষ্ঠা ও স্ট্রিক দেখা যাচ্ছে না।
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="focus-visible:ring-ring mt-1 inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:outline-none active:scale-95"
        >
          <RefreshCw size={13} aria-hidden />
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-islamic text-islamic-foreground shadow-sm">
            <BookOpen size={18} aria-hidden />
          </div>
          <div>
            <h2 className="font-bold leading-tight">কুরআন তিলাওয়াত</h2>
            <p className="text-[11px] text-muted-foreground">আপনার পাঠের অগ্রগতি</p>
          </div>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Plus size={14} aria-hidden /> লগ করুন
        </Button>
        <ResponsiveModal
          open={open}
          onOpenChange={setOpen}
          title="তিলাওয়াত লগ করুন"
          description="আজকের পঠিত অংশ যোগ করুন"
        >
          <LogForm onSuccess={() => setOpen(false)} />
        </ResponsiveModal>
      </div>

      {/* Khatm progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium">খতম অগ্রগতি</span>
          <span className="tabular text-muted-foreground">
            {toBn(totalPages)} / ৬০৪ পৃষ্ঠা
          </span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={604}
          aria-valuenow={totalPages}
          aria-label="খতম অগ্রগতি"
        >
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
        <Stat label="মোট পৃষ্ঠা" value={totalPages} icon={BookOpen} />
        <Stat label="সেশন" value={data?.totalSessions ?? 0} icon={ListChecks} />
        <Stat label="স্ট্রিক" value={streak} icon={Flame} streak />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  streak,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
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
        {streak ? <Icon size={14} fill="currentColor" aria-hidden /> : <Icon size={14} aria-hidden />}
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
                {s.name} (<span className="font-arabic">{s.nameArabic}</span>)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="quran-from-ayah">শুরু (আয়াত)</Label>
          <Input
            id="quran-from-ayah"
            type="number"
            min={1}
            value={fromAyah}
            onChange={(e) => setFromAyah(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quran-to-ayah">শেষ (আয়াত)</Label>
          <Input
            id="quran-to-ayah"
            type="number"
            min={fromAyah}
            value={toAyah}
            onChange={(e) => setToAyah(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="quran-pages">পৃষ্ঠা পড়েছেন</Label>
        <Input
          id="quran-pages"
          type="number"
          min={0}
          value={pages}
          onChange={(e) => setPages(Number(e.target.value))}
        />
      </div>
      <ResponsiveModalFooter>
        <Button variant="outline" onClick={onSuccess}>
          বাতিল
        </Button>
        <Button onClick={submit} disabled={log.isPending}>
          {log.isPending ? "লগ হচ্ছে..." : "সেশন সংরক্ষণ করুন"}
        </Button>
      </ResponsiveModalFooter>
    </div>
  );
}
