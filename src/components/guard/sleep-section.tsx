"use client";

import { useState } from "react";
import { BedDouble, MoonStar } from "lucide-react";
import { toBn, fromDateKey } from "@/lib/date-bn";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useBedtime, type ScreenTimeState } from "@/hooks/use-screen-time";
import { GuardSection, WebFallback, formatMinutesBn } from "./guard-shared";
import { cn } from "@/lib/utils";

/**
 * SleepSection — রাতের বিশ্রাম: last night's honest sleep estimate
 * ("ফোন স্পর্শ করেননি X ঘণ্টা"), a 7-night trend, and the bedtime
 * wind-down config (scheduled DND + morning report — the native alarm
 * engine, boot-safe, 100% offline).
 */

/** "23:15" in Bengali from minutes-of-day. */
function hhmmBn(minutesOfDay: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, minutesOfDay));
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return toBn(`${hh}:${mm}`);
}

/** Clock time from epoch ms in the device's timezone. */
function clockBn(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return toBn(`${hh}:${mm}`);
}

export function SleepSection({ screenTime }: { screenTime: ScreenTimeState }) {
  const bedtime = useBedtime();

  if (!screenTime.native) {
    return (
      <GuardSection title="রাতের বিশ্রাম ও ঘুম" icon={BedDouble} id="sleep">
        <WebFallback featureName="রাতের বিশ্রাম ও ঘুমের হিসাব" />
      </GuardSection>
    );
  }

  const sleep = screenTime.sleep;

  return (
    <GuardSection
      title="রাতের বিশ্রাম ও ঘুম"
      desc="রাতে ফোন রাখার অনুস্মারক + ঘুমের সৎ হিসাব"
      icon={BedDouble}
      id="sleep"
    >
      {/* Last night */}
      {screenTime.loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : sleep.lastNight ? (
        <div className="border-b px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MoonStar className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">
                {formatMinutesBn(sleep.lastNight.minutes)} ফোন স্পর্শ ছাড়া
              </div>
              <div className="text-[11px] text-muted-foreground">
                {clockBn(sleep.lastNight.startMs)} থেকে {clockBn(sleep.lastNight.endMs)} — ফোনের
                ব্যবহার-বিরতি থেকে অনুমান
              </div>
            </div>
          </div>
          {/* 7-night trend */}
          {sleep.history.length > 1 && <NightTrend history={sleep.history} />}
        </div>
      ) : (
        <div className="border-b px-4 py-4 text-center text-xs leading-relaxed text-muted-foreground">
          যথেষ্ট তথ্য নেই — রাতে ফোন রেখে ঘুমালে সকালে এখানে সৎ হিসাবটি দেখা যাবে।
        </div>
      )}

      {/* Bedtime config */}
      {bedtime.loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : (
        <BedtimeConfigurator bedtime={bedtime} />
      )}

      <p className="px-4 pb-4 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        ঘুমের হিসাব ওয়েয়ারেবল নয় — ফোন কতক্ষণ অপেক্ষা করেছিল তা থেকে সৎ অনুমান। রাতের DND-র
        জন্য একবার “Do Not Disturb access” অনুমতি লাগে (ফোকাস মোডের মতোই)। সব তথ্য শুধু আপনার
        ফোনেই থাকে।
      </p>
    </GuardSection>
  );
}

// ── 7-night trend ───────────────────────────────────────────────────────────

function NightTrend({ history }: { history: { date?: string; minutes: number }[] }) {
  const maxMin = Math.max(...history.map((h) => h.minutes), 60);
  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold text-muted-foreground">শেষ কয়েক রাত</div>
      <div className="mt-1.5 flex h-12 items-end gap-1" role="img" aria-label="রাতের ঘুমের ধারা">
        {history.slice(-7).map((h, i) => (
          <div key={h.date ?? i} className="flex min-w-0 flex-1 justify-center">
            <div
              className={cn(
                "w-full max-w-8 rounded-sm",
                i === history.slice(-7).length - 1 ? "bg-primary" : "bg-primary/40"
              )}
              style={{
                height: `${Math.max(8, Math.round((h.minutes / maxMin) * 100))}%`,
              }}
              title={`${h.date ? fromDateKey(h.date).toLocaleDateString("bn-BD") : ""}: ${formatMinutesBn(h.minutes)}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bedtime config ──────────────────────────────────────────────────────────

const START_OPTIONS = [21 * 60, 22 * 60, 22 * 60 + 30, 23 * 60, 23 * 60 + 30];
const END_OPTIONS = [5 * 60, 5 * 60 + 30, 6 * 60, 6 * 60 + 30, 7 * 60];

function BedtimeConfigurator({
  bedtime,
}: {
  bedtime: { native: boolean; config: ReturnType<typeof useBedtime>["config"]; saving: boolean; save: ReturnType<typeof useBedtime>["save"] };
}) {
  const [draft, setDraft] = useState(bedtime.config);
  const dirty =
    draft.enabled !== bedtime.config.enabled ||
    draft.startMinutes !== bedtime.config.startMinutes ||
    draft.endMinutes !== bedtime.config.endMinutes ||
    draft.dnd !== bedtime.config.dnd;

  const update = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="p-4">
      {/* Master toggle */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">রাতের বিশ্রাম</div>
          <div className="text-[11px] text-muted-foreground">
            {bedtime.config.enabled
              ? `${hhmmBn(bedtime.config.startMinutes)} — ${hhmmBn(bedtime.config.endMinutes)} (প্রতি রাতে)`
              : "চালু করলে প্রতি রাতে ঘুমানোর সময় মনে করিয়ে দেওয়া হবে"}
          </div>
        </div>
        <Switch
          checked={draft.enabled}
          onCheckedChange={(v) => update({ enabled: v })}
          aria-label="রাতের বিশ্রাম চালু/বন্ধ"
        />
      </div>

      {draft.enabled && (
        <div className="mt-3 space-y-3">
          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-2">
            <TimePicker
              label="ঘুমানোর সময়"
              value={draft.startMinutes}
              options={START_OPTIONS}
              onChange={(m) => update({ startMinutes: m })}
            />
            <TimePicker
              label="সকালে শেষ"
              value={draft.endMinutes}
              options={END_OPTIONS}
              onChange={(m) => update({ endMinutes: m })}
            />
          </div>

          {/* DND during the window */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium">রাতে ফোন সম্পূর্ণ শান্ত (DND)</div>
              <div className="text-[10px] text-muted-foreground">
                নোটিফিকেশন ও কল বন্ধ থাকবে — সকালে নিজেই ফিরে আসবে
              </div>
            </div>
            <Switch
              checked={draft.dnd}
              onCheckedChange={(v) => update({ dnd: v })}
              aria-label="রাতে DND চালু/বন্ধ"
            />
          </div>
        </div>
      )}

      {dirty && (
        <button
          type="button"
          disabled={bedtime.saving}
          onClick={() => void bedtime.save(draft)}
          className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-60"
        >
          {bedtime.saving ? "সেভ হচ্ছে…" : "সেভ করুন"}
        </button>
      )}
    </div>
  );
}

function TimePicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (minutes: number) => void;
}) {
  const custom = !options.includes(value);
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <select
        value={custom ? -1 : value}
        onChange={(e) => {
          const m = Number(e.target.value);
          if (m >= 0) onChange(m);
        }}
        className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
        aria-label={label}
      >
        {custom && (
          <option value={-1} disabled>
            {hhmmBn(value)} (কাস্টম)
          </option>
        )}
        {options.map((m) => (
          <option key={m} value={m}>
            {hhmmBn(m)}
          </option>
        ))}
      </select>
    </label>
  );
}
