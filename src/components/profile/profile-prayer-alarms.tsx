"use client";

import { useCallback, useEffect, useState } from "react";
import { AlarmClock, BadgeCheck, Loader2, MoonStar, ShieldAlert, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { NativeAlarm, type AlarmStatus } from "@/lib/native/alarm-plugin";
import { FocusMode } from "@/lib/native/focus-plugin";
import { isNativeApp } from "@/lib/native/capacitor";
import { useSettingsStore } from "@/stores/settings-store";
import { PRAYERS } from "@/constants";
import { toBn } from "@/lib/date-bn";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, ToggleRow } from "./profile-shared";

/** Offset choices for "ring before the prayer time" (minutes). */
const OFFSET_CHOICES = [0, 5, 10, 15] as const;

/**
 * নামাজের ওয়াকত রিমাইন্ডার — the alarm engine's user-facing settings.
 *
 * Android app: exact offline alarms (AlarmManager) that survive reboots and
 * Doze, with per-prayer toggles, a pre-alert offset and optional real DND.
 * PWA: the same settings drive the server-side prayer Web Push.
 */
export function ProfilePrayerAlarmsSection() {
  const enabled = useSettingsStore((s) => s.prayerAlarmsEnabled);
  const offset = useSettingsStore((s) => s.prayerAlarmOffsetMin);
  const prayers = useSettingsStore((s) => s.prayerAlarmPrayers);
  const autoSilence = useSettingsStore((s) => s.prayerAutoSilenceEnabled);
  const toggleEnabled = useSettingsStore((s) => s.togglePrayerAlarms);
  const setOffset = useSettingsStore((s) => s.setPrayerAlarmOffset);
  const togglePrayer = useSettingsStore((s) => s.togglePrayerAlarmPrayer);
  const toggleAutoSilence = useSettingsStore((s) => s.togglePrayerAutoSilence);

  const selected = prayers ?? PRAYERS.map((p) => p.key);

  return (
    <>
      <Section title="নামাজের ওয়াকত" icon={MoonStar}>
        <ToggleRow
          icon={AlarmClock}
          label="ওয়াকত রিমাইন্ডার"
          desc="অ্যান্ড্রয়েড অ্যাপে নিখুঁত অফলাইন অ্যালার্ম — রিবুট বা ইন্টারনেট ছাড়াই বাজে; PWA-তে পুশ নোটিফিকেশন"
          checked={enabled}
          onChange={toggleEnabled}
        />

        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            {/* Pre-alert offset */}
            <div className="flex items-center gap-3 border-t px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">আগে জানানো</div>
                <div className="text-[11px] text-muted-foreground">
                  ওয়াক্ত শুরুর কতক্ষণ আগে বাজবে
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1" role="radiogroup" aria-label="আগে জানানো">
                {OFFSET_CHOICES.map((min) => (
                  <button
                    key={min}
                    type="button"
                    role="radio"
                    aria-checked={offset === min}
                    onClick={() => setOffset(min)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-[11px] font-medium transition-colors",
                      offset === min
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {min === 0 ? "ঠিক সময়ে" : `${toBn(min)} মিনিট`}
                  </button>
                ))}
              </div>
            </div>

            {/* Per-prayer toggles */}
            <div className="border-t px-4 py-3">
              <div className="text-sm font-medium">কোন ওয়াকত</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRAYERS.map((p) => {
                  const on = selected.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => togglePrayer(p.key)}
                      className={cn(
                        "h-9 rounded-full border px-3.5 text-xs font-medium transition-colors",
                        on
                          ? "border-islamic/40 bg-islamic/10 text-islamic dark:text-islamic-foreground"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {on ? "✓ " : ""}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <ToggleRow
              icon={MoonStar}
              label="নামাজের সময় অটো সাইলেন্ট"
              desc="ওয়াক্ত শুরু হলে ১৫ মিনিট ফোনের আসল DND (শুধু অ্যান্ড্রয়েড অ্যাপে, Do Not Disturb অনুমতি লাগবে)"
              checked={autoSilence}
              onChange={toggleAutoSilence}
              last
            />
          </motion.div>
        )}
      </Section>

      <NativeAlarmStatusCard showDnd={enabled && autoSilence} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Native engine status — only inside the Android app
// ---------------------------------------------------------------------------

function NativeAlarmStatusCard({ showDnd }: { showDnd: boolean }) {
  // mounted-guard: keep SSR output stable (native detection is client-only)
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<AlarmStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setStatus(await NativeAlarm.getStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !isNativeApp()) return;
    void refresh();
    const onVisibility = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mounted, refresh]);

  if (!mounted || !isNativeApp()) return null;

  const requestExact = async () => {
    setBusy("exact");
    try {
      await NativeAlarm.requestExactAlarmAccess();
      toast("সেটিংস খুলেছে — অনুমতি দিয়ে ফিরে আসুন");
    } catch {
      toast.error("সেটিংস খোলা যায়নি");
    } finally {
      setBusy(null);
    }
  };

  const requestNotifications = async () => {
    setBusy("notif");
    try {
      const { granted } = await NativeAlarm.requestNotificationPermission();
      if (granted) toast.success("নোটিফিকেশন অনুমতি পেয়েছে");
      else toast("অনুমতি দেওয়া হয়নি — সেটিংস থেকে চালু করুন");
      void refresh();
    } catch {
      toast.error("অনুমতি চাওয়া যায়নি");
    } finally {
      setBusy(null);
    }
  };

  const requestDnd = async () => {
    setBusy("dnd");
    try {
      await FocusMode.requestAccess();
      toast("Do Not Disturb অনুমতির স্ক্রিন খুলেছে");
    } catch {
      toast.error("সেটিংস খোলা যায়নি");
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const { ok } = await NativeAlarm.testAlarm({ seconds: 20 });
      if (ok) toast(`২০ সেকেন্ড পর একটি পরীক্ষা নোটিফিকেশন আসবে`);
      else toast.error("পরীক্ষা নোটিফিকেশন পাঠানো যায়নি");
    } catch {
      toast.error("পরীক্ষা নোটিফিকেশন পাঠানো যায়নি");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="অ্যালার্ম ইঞ্জিন" icon={Zap}>
      <StatusRow
        ok={status?.exactAlarms ?? false}
        loading={status === null}
        label="নিখুঁত অ্যালার্ম"
        okDesc="চালু — ফোন ঘুমিয়ে থাকলেও নির্ভুল সময়ে বাজবে"
        badDesc="বন্ধ — Android 12+ এ বিশেষ অনুমতি দরকার"
        busy={busy === "exact"}
        onFix={requestExact}
        fixLabel="অনুমতি দিন"
      />
      <StatusRow
        ok={status?.notifications ?? false}
        loading={status === null}
        label="নোটিফিকেশন"
        okDesc="অনুমতি আছে — রিমাইন্ডার দেখা যাবে"
        badDesc="বন্ধ — রিমাইন্ডার দেখা যাবে না"
        busy={busy === "notif"}
        onFix={requestNotifications}
        fixLabel="অনুমতি দিন"
      />
      {showDnd && (
        <StatusRow
          ok={status?.dndAccess ?? false}
          loading={status === null}
          label="Do Not Disturb"
          okDesc="অনুমতি আছে — নামাজের সময় অটো-সাইলেন্ট কাজ করবে"
          badDesc="অনুমতি নেই — অটো-সাইলেন্ট কাজ করবে না"
          busy={busy === "dnd"}
          onFix={requestDnd}
          fixLabel="অনুমতি দিন"
        />
      )}
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">পরীক্ষা নোটিফিকেশন</div>
          <div className="text-[11px] text-muted-foreground">
            ইঞ্জিন ঠিক আছে কি না ২০ সেকেন্ডেই যাচাই করুন
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={sendTest}
          disabled={busy !== null}
          className="h-9 shrink-0 gap-1.5 px-3 text-[11px]"
        >
          {busy === "test" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Zap size={12} aria-hidden />}
          পরীক্ষা করুন
        </Button>
      </div>
    </Section>
  );
}

function StatusRow({
  ok,
  loading,
  label,
  okDesc,
  badDesc,
  busy,
  onFix,
  fixLabel,
}: {
  ok: boolean;
  loading: boolean;
  label: string;
  okDesc: string;
  badDesc: string;
  busy: boolean;
  onFix: () => void;
  fixLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          loading
            ? "bg-muted text-muted-foreground"
            : ok
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : ok ? (
          <BadgeCheck size={16} aria-hidden />
        ) : (
          <ShieldAlert size={16} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{ok ? okDesc : badDesc}</div>
      </div>
      {!ok && !loading && (
        <Button
          variant="outline"
          size="sm"
          onClick={onFix}
          disabled={busy}
          className="h-8 shrink-0 px-3 text-[11px]"
        >
          {busy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
          {fixLabel}
        </Button>
      )}
    </div>
  );
}
