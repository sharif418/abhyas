"use client";

import { useEffect, useState } from "react";
import { Clock, Search, ShieldAlert, ShieldCheck, TimerOff } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ResponsiveModal } from "@/components/overlays/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsageGuard } from "@/hooks/use-guard";
import { UsageGuard } from "@/lib/native/usage-plugin";
import type { AppInfo, AppUsage } from "@/lib/native/usage-plugin";
import {
  formatMinutesBn,
  GuardSection,
  UsageBar,
  WebFallback,
} from "./guard-shared";
import { cn } from "@/lib/utils";

const LIMIT_PRESETS = [15, 30, 60, 120, 180, 300];

/**
 * AppLimitsSection — per-app daily time budgets ("ফেসবুক দিনে বেশি ৩০ মিনিট
 * নয়"). Usage list refreshes on app resume; the watchdog notification is
 * managed by the native UsageGuardService (setEnforcement).
 */
export function AppLimitsSection() {
  const guard = useUsageGuard();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [limitFor, setLimitFor] = useState<AppUsage | AppInfo | null>(null);

  // Permission gate (Android only, one-time).
  if (!guard.native) {
    return (
      <GuardSection title="অ্যাপ ব্যবহারের সময়সীমা" icon={Clock} id="app-limits">
        <WebFallback featureName="অন্য অ্যাপের ব্যবহার-সময় নিয়ন্ত্রণ" />
      </GuardSection>
    );
  }

  if (guard.loading) {
    return (
      <GuardSection title="অ্যাপ ব্যবহারের সময়সীমা" icon={Clock}>
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </GuardSection>
    );
  }

  if (!guard.accessGranted) {
    return (
      <GuardSection title="অ্যাপ ব্যবহারের সময়সীমা" icon={Clock}>
        <div className="px-4 py-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-6" aria-hidden />
          </div>
          <p className="mt-3 text-sm font-semibold">একবার অনুমতি দিতে হবে</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            কোন অ্যাপ কতক্ষণ চালু থাকে সেটি দেখার জন্য Android-এর “Usage access” অনুমতি লাগে।
            আপনার ডেটা শুধুই আপনার ফোনেই থাকে — কোথাও পাঠানো হয় না।
          </p>
          <Button size="sm" className="mt-3 font-bold" onClick={() => void guard.requestAccess()}>
            অনুমতি দিন
          </Button>
        </div>
      </GuardSection>
    );
  }

  const limitedCount = guard.apps.filter((a) => a.limitMinutes > 0).length;
  const overCount = guard.apps.filter((a) => a.overLimit).length;

  return (
    <GuardSection
      title="অ্যাপ ব্যবহারের সময়সীমা"
      desc="প্রতিটি অ্যাপের দৈনিক বাজেট ঠিক করুন — পার হলে জানানো হবে"
      icon={Clock}
      id="app-limits"
    >
      {/* Enforcement master switch */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">নজরদারি চালু</div>
          <div className="text-[11px] text-muted-foreground">
            সময় পার হলে নোটিফিকেশন: “অভ্যাসে ফিরে আসুন”
          </div>
        </div>
        <Switch
          checked={guard.enforcementActive}
          onCheckedChange={(v) => void guard.setEnforcement(v)}
          aria-label="নজরদারি চালু/বন্ধ"
        />
      </div>

      {/* Block screen (interception) */}
      <InterceptionCard guard={guard} />

      {/* Summary strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span>{toBn(guard.apps.length)}টি অ্যাপ আজ চালু হয়েছে</span>
        {limitedCount > 0 && <span>• সীমা দেওয়া: {toBn(limitedCount)}টি</span>}
        {overCount > 0 && (
          <span className="font-semibold text-destructive">
            • সীমা পার: {toBn(overCount)}টি
          </span>
        )}
      </div>

      {/* App usage list */}
      <ul className="fancy-scroll max-h-96 overflow-y-auto">
        {guard.apps.map((app) => (
          <li key={app.packageName} className="border-b last:border-b-0">
            <AppLimitRow
              app={app}
              busy={guard.busyPackage === app.packageName}
              onEdit={() => setLimitFor(app)}
            />
          </li>
        ))}
        {guard.apps.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted-foreground">
            আজ এখনো কোনো অ্যাপ চালু হয়নি — নিচের বাটন থেকে যেকোনো অ্যাপে সীমা দিন।
          </li>
        )}
      </ul>

      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full font-semibold"
          onClick={() => setPickerOpen(true)}
        >
          <Search className="size-3.5" aria-hidden />
          নতুন অ্যাপে সময়সীমা দিন
        </Button>
      </div>

      {/* All-apps picker */}
      <AppPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(info) => {
          setPickerOpen(false);
          setLimitFor(info);
        }}
      />

      {/* Limit editor */}
      <LimitEditorSheet
        app={limitFor}
        onOpenChange={(open) => !open && setLimitFor(null)}
        onSave={async (minutes) => {
          if (!limitFor) return;
          await guard.setLimit(limitFor.packageName, minutes);
        }}
      />
    </GuardSection>
  );
}

// ── Rows & sheets ───────────────────────────────────────────────────────────

/** The block-screen (interception) sub-card — toggle + overlay permission. */
function InterceptionCard({
  guard,
}: {
  guard: ReturnType<typeof useUsageGuard>;
}) {
  const it = guard.interception;

  return (
    <div className="border-b">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            থামানোর স্ক্রিন
            {it.enabled && it.blockedToday > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                আজ {toBn(it.blockedToday)}বার
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            সময় শেষ হওয়া অ্যাপ খুললেই উৎসাহমূলক স্ক্রিন — “৫ মিনিট বিরতি” নিতে পারবেন
          </div>
        </div>
        <Switch
          checked={it.enabled}
          onCheckedChange={(v) => void guard.setInterception(v)}
          aria-label="থামানোর স্ক্রিন চালু/বন্ধ"
        />
      </div>

      {it.enabled && !it.overlayGranted && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden />
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              স্ক্রিনটি অন্য অ্যাপের উপরে দেখাতে একবার “অন্য অ্যাপের উপরে প্রদর্শন” অনুমতি
              দিতে হবে। না দিলে শুধু নোটিফিকেশন আসবে।
            </p>
          </div>
          <Button
            size="sm"
            className="mt-2 w-full font-bold"
            onClick={() => void guard.requestOverlayPermission()}
          >
            অনুমতি দিন
          </Button>
        </div>
      )}

      {it.enabled && it.overlayGranted && (
        <div className="mx-4 mb-3 flex items-center gap-1.5 rounded-xl bg-primary/5 px-3 py-2 text-[11px] font-medium text-primary">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          ওভারলে অনুমতি আছে — অ্যাপ খুললে স্ক্রিন সঙ্গে সঙ্গেই আসবে
        </div>
      )}
    </div>
  );
}

function AppIcon({ app }: { app: AppUsage | AppInfo }) {
  const icon = "icon" in app ? app.icon : undefined;
  if (icon) {
    return (
      <img
        src={`data:image/png;base64,${icon}`}
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg"
      />
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
      {app.label.slice(0, 1)}
    </span>
  );
}

function AppLimitRow({
  app,
  busy,
  onEdit,
}: {
  app: AppUsage;
  busy: boolean;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={busy}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
    >
      <AppIcon app={app} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{app.label}</span>
          <span
            className={cn(
              "shrink-0 tabular-nums text-xs",
              app.overLimit ? "font-bold text-destructive" : "text-muted-foreground"
            )}
          >
            {formatMinutesBn(app.todayMinutes)}
          </span>
        </div>
        {app.limitMinutes > 0 ? (
          <>
            <UsageBar todayMinutes={app.todayMinutes} limitMinutes={app.limitMinutes} className="mt-1.5" />
            <p
              className={cn(
                "mt-1 text-[10px]",
                app.overLimit ? "font-semibold text-destructive" : "text-muted-foreground"
              )}
            >
              {app.overLimit
                ? "সীমা পার হয়েছে — অভ্যাসে ফিরে আসুন"
                : `সীমা: ${formatMinutesBn(app.limitMinutes)}`}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-[10px] text-muted-foreground">সীমা নেই — ট্যাপ করে দিন</p>
        )}
      </div>
    </button>
  );
}

function AppPickerSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (app: AppInfo) => void;
}) {
  const [apps, setApps] = useState<AppInfo[] | null>(null);
  const [query, setQuery] = useState("");

  // Load the full launchable-app list when the sheet first opens.
  useEffect(() => {
    if (!open || apps !== null) return;
    let cancelled = false;
    UsageGuard.getApps()
      .then((res) => {
        if (!cancelled) setApps(res.apps);
      })
      .catch(() => {
        if (!cancelled) setApps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, apps]);

  const filtered = (apps ?? []).filter((a) =>
    query.trim() ? a.label.toLowerCase().includes(query.trim().toLowerCase()) : true
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="অ্যাপ বাছাই করুন"
      description="যে অ্যাপের সময় কমাতে চান"
      size="sm"
    >
      <div className="sticky top-0 z-10 pb-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="অ্যাপের নাম খুঁজুন…"
          aria-label="অ্যাপ খুঁজুন"
        />
      </div>
      {apps === null ? (
        <div className="space-y-2 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">কিছু পাওয়া যায়নি</p>
      ) : (
        <ul className="fancy-scroll max-h-[50vh] space-y-1 overflow-y-auto">
          {filtered.map((a) => (
            <li key={a.packageName}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <AppIcon app={a} />
                <span className="truncate text-sm font-medium">{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveModal>
  );
}

function LimitEditorSheet({
  app,
  onOpenChange,
  onSave,
}: {
  app: AppUsage | AppInfo | null;
  onOpenChange: (open: boolean) => void;
  onSave: (minutes: number) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const current = app && "limitMinutes" in app ? app.limitMinutes : 0;

  const pick = async (minutes: number) => {
    setSaving(true);
    try {
      await onSave(minutes);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal
      open={!!app}
      onOpenChange={onOpenChange}
      title={app ? `সময়সীমা: ${app.label}` : ""}
      description="দিনে যতক্ষণ পর্যন্ত ব্যবহার ঠিক করুন"
      size="sm"
    >
      <div className="grid grid-cols-2 gap-2">
        {LIMIT_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={saving}
            onClick={() => void pick(m)}
            className={cn(
              "focus-visible:ring-ring/70 rounded-xl border px-3 py-3 text-sm font-bold transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
              current === m
                ? "border-primary bg-primary/10 text-primary"
                : "hover:border-primary/50"
            )}
          >
            {formatMinutesBn(m)}
          </button>
        ))}
      </div>
      {current > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => void pick(0)}
          className="mt-3 w-full text-destructive hover:bg-destructive/10"
        >
          <TimerOff className="size-3.5" aria-hidden />
          সীমা তুলে দিন
        </Button>
      )}
      <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        সময় পার হলে নোটিফিকেশন আসবে; “থামানোর স্ক্রিন” চালু থাকলে অ্যাপ খুললেই উৎসাহমূলক
        স্ক্রিন দেখা যাবে। সিদ্ধান্ত সবসময় আপনার — অ্যাপ শুধু মনে করিয়ে দেয়।
      </p>
    </ResponsiveModal>
  );
}
