"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { LevelCard, QuickStat, type StatsResponse } from "@/components/stats/stats-shared";
import { StatsOverviewTab } from "@/components/stats/stats-overview-tab";
import { StatsTrendsTab } from "@/components/stats/stats-trends-tab";
import { StatsMoodTab } from "@/components/stats/stats-mood-tab";
import { StatsBadgesTab } from "@/components/stats/stats-badges-tab";

type StatsTab = "overview" | "trends" | "mood" | "badges";

const TABS: readonly { key: StatsTab; label: string }[] = [
  { key: "overview", label: "সারসংক্ষেপ" },
  { key: "trends", label: "ধারা" },
  { key: "mood", label: "মুড" },
  { key: "badges", label: "ব্যাজ" },
] as const;

/** পরিসংখ্যান view — thin shell: data fetch + level hero + WAI-ARIA tabs.
 *  Tab content lives in stats-{overview,trends,mood,badges}-tab.tsx. */
export function StatsView() {
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsResponse>("/api/stats"),
  });

  // WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump to first/last.
  // Roving tabindex: only the active tab has tabIndex=0, others have -1.
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TABS.findIndex((t) => t.key === activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "Right":
        nextIndex = (currentIndex + 1) % TABS.length;
        break;
      case "ArrowLeft":
      case "Left":
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = TABS.length - 1;
        break;
      default:
        return; // don't preventDefault for unhandled keys
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const newTab = TABS[nextIndex];
      setActiveTab(newTab.key);
      // Move focus to the newly activated tab (WAI-ARIA recommended behavior)
      requestAnimationFrame(() => {
        document.getElementById(`stats-tab-${newTab.key}`)?.focus();
      });
    }
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <IconRenderer name="WifiOff" size={26} />
          </div>
          <div>
            <h3 className="font-semibold">পরিসংখ্যান লোড করতে সমস্যা</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ডেটা লোড করা যায়নি। আবার চেষ্টা করুন।
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">পরিসংখ্যান</h1>
        <p className="text-xs text-muted-foreground">আপনার অগ্রগতির সম্পূর্ণ চিত্র</p>
      </div>

      {/* Level card */}
      <LevelCard g={stats.gamification} />

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat
          icon="Flame"
          value={stats.streaks.bestOverall}
          label="সেরা স্ট্রিক"
          color="var(--streak)"
        />
        <QuickStat
          icon="CalendarCheck"
          value={stats.perfectDays}
          label="নিখুঁত দিন"
          color="var(--color-violet-500)"
        />
        <QuickStat
          icon="Moon"
          value={stats.prayersDone}
          label="আজকের নামাজ"
          color="var(--islamic)"
          sub="/ ৫"
        />
        <QuickStat
          icon="BookOpen"
          value={stats.quranPages}
          label="কুরআন পৃষ্ঠা"
          color="var(--primary)"
        />
      </div>

      {/* Tab navigation — WAI-ARIA tabs with arrow-key navigation */}
      <div
        role="tablist"
        aria-label="পরিসংখ্যান বিভাগ"
        onKeyDown={handleTabKeyDown}
        className="flex gap-1 rounded-2xl bg-muted/50 p-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              id={`stats-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`stats-tabpanel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabpanels — tabIndex=0 keeps them keyboard-scrollable */}
      {activeTab === "overview" && (
        <div
          role="tabpanel"
          id="stats-tabpanel-overview"
          aria-labelledby="stats-tab-overview"
          tabIndex={0}
          className="space-y-5"
        >
          <StatsOverviewTab insights={stats.insights} categories={stats.categories} />
        </div>
      )}

      {activeTab === "trends" && (
        <div
          role="tabpanel"
          id="stats-tabpanel-trends"
          aria-labelledby="stats-tab-trends"
          tabIndex={0}
          className="space-y-5"
        >
          <StatsTrendsTab
            dailySeries={stats.dailySeries}
            weekly={stats.weekly}
            monthlyTrend={stats.monthlyTrend}
            yearlyHeatmap={stats.yearlyHeatmap}
          />
        </div>
      )}

      {activeTab === "mood" && (
        <div
          role="tabpanel"
          id="stats-tabpanel-mood"
          aria-labelledby="stats-tab-mood"
          tabIndex={0}
          className="space-y-5"
        >
          <StatsMoodTab mood={stats.mood} moodCorrelations={stats.moodCorrelations} />
        </div>
      )}

      {activeTab === "badges" && (
        <div
          role="tabpanel"
          id="stats-tabpanel-badges"
          aria-labelledby="stats-tab-badges"
          tabIndex={0}
        >
          <StatsBadgesTab badges={stats.badges} badgeStats={stats.badgeStats} />
        </div>
      )}
    </div>
  );
}
