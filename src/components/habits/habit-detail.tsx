"use client";

import { motion } from "framer-motion";
import { Flame, Pencil, Trash2, Trophy, Target, TrendingUp, Snowflake } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Heatmap } from "@/components/shared/heatmap";
import { IconTile, IconRenderer } from "@/components/shared/icon-renderer";
import { ProgressRing } from "@/components/shared/progress-ring";
import { useHabits, useToggleHabit, useDeleteHabit } from "@/hooks/use-habits";
import { useFreezeHabit } from "@/hooks/use-freeze";
import { useUIStore } from "@/stores/ui-store";
import { toBn, todayKey } from "@/lib/date-bn";
import { CATEGORY_MAP } from "@/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function HabitDetailSheet() {
  const habitId = useUIStore((s) => s.selectedHabitId);
  const close = useUIStore((s) => s.closeHabitDetail);
  const openEdit = useUIStore((s) => s.openEditHabit);
  const { data: habits } = useHabits();
  const toggle = useToggleHabit();
  const del = useDeleteHabit();
  const freeze = useFreezeHabit();

  const habit = habits?.find((h) => h.id === habitId) ?? null;
  const cat = habit ? CATEGORY_MAP[habit.category] : null;

  return (
    <Sheet open={!!habitId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {habit && (
          <>
            <SheetHeader className="border-b px-5 pb-4 pt-5">
              <div className="flex items-start gap-3">
                <IconTile name={habit.icon} color={habit.color} size={48} />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg leading-tight">
                    {habit.name}
                  </SheetTitle>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{cat?.emoji} {habit.category}</span>
                    <span>•</span>
                    <span>{habit.timeOfDay}</span>
                    <span>•</span>
                    <span>{habit.frequency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => toggle.mutate({ habitId: habit.id })}
                  className="flex-1"
                  variant={habit.completedToday ? "secondary" : "default"}
                >
                  {habit.completedToday ? "✓ সম্পন্ন হয়েছে" : "আজ সম্পন্ন করুন"}
                </Button>
                {!habit.completedToday &&
                  habit.frozenDate !== todayKey() &&
                  habit.streak >= 3 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => freeze.mutate(habit.id)}
                      disabled={freeze.isPending}
                      title="স্ট্রিক ফ্রিজ করুন"
                      className="text-sky-600 hover:text-sky-700"
                    >
                      <Snowflake size={16} />
                    </Button>
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    close();
                    openEdit(habit.id);
                  }}
                >
                  <Pencil size={16} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>অভ্যাস মুছে ফেলবেন?</AlertDialogTitle>
                      <AlertDialogDescription>
                        «{habit.name}» এর সমস্ত ইতিহাস মুছে যাবে। এটি ফেরানো যাবে না।
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>বাতিল</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          del.mutate(habit.id, { onSuccess: close });
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        মুছে ফেলুন
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </SheetHeader>

            <div className="fancy-scroll flex-1 overflow-y-auto px-5 py-4">
              {/* Stats trio */}
              <div className="grid grid-cols-3 gap-2">
                <StatBox
                  icon="Flame"
                  label="বর্তমান স্ট্রিক"
                  value={habit.streak}
                  color="var(--streak)"
                />
                <StatBox
                  icon="Trophy"
                  label="সেরা স্ট্রিক"
                  value={habit.bestStreak}
                  color="var(--primary)"
                />
                <StatBox
                  icon="Target"
                  label="মোট সম্পন্ন"
                  value={habit.totalDone}
                  color="#7c3aed"
                />
              </div>

              {/* Completion rate ring */}
              <div className="mt-4 flex items-center gap-4 rounded-2xl border bg-card p-4">
                <ProgressRing value={habit.completionRate} size={76} stroke={8}>
                  <div className="text-center">
                    <div className="tabular text-base font-bold">
                      {toBn(Math.round(habit.completionRate * 100))}%
                    </div>
                  </div>
                </ProgressRing>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <TrendingUp size={15} /> গত ৩০ দিন
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    এই সময়ে আপনি {toBn(Math.round(habit.completionRate * 30))} দিন অভ্যাসটি সম্পন্ন করেছেন।
                  </p>
                </div>
              </div>

              {/* Heatmap */}
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">কার্যকলাপ (৬ মাস)</h3>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    কম
                    <span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-muted" />
                    <span className="mx-0.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-primary/30" />
                    <span className="mx-0.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-primary/60" />
                    <span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-primary" />
                    বেশি
                  </div>
                </div>
                <Heatmap
                  completedDates={habit.completedDates}
                  habit={habit}
                  weeks={26}
                  color={habit.color}
                />
              </div>

              {/* Milestones */}
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold">মাইলস্টোন</h3>
                <div className="flex flex-wrap gap-2">
                  {[7, 14, 30, 100, 365].map((m) => {
                    const reached = habit.bestStreak >= m;
                    return (
                      <div
                        key={m}
                        className={cnBadge(reached)}
                      >
                        <Flame
                          size={12}
                          fill={reached ? "currentColor" : "none"}
                          className={reached ? "text-streak" : "text-muted-foreground"}
                        />
                        <span>{toBn(m)} দিন</span>
                        {reached && <span className="ml-0.5">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center">
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <IconRenderer name={icon} size={16} />
      </div>
      <div className="tabular text-xl font-extrabold leading-none">{toBn(value)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function cnBadge(reached: boolean) {
  return [
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
    reached
      ? "border-streak/30 bg-streak/10 text-streak"
      : "border-border bg-muted/50 text-muted-foreground",
  ].join(" ");
}
