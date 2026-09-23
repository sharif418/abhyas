"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePrayerTimes } from "@/hooks/use-prayer";
import { useSettingsStore } from "@/stores/settings-store";
import { useFocusDndStore } from "@/stores/focus-dnd-store";
import { currentPrayerKey } from "@/lib/prayer";
import { toBn, todayKey } from "@/lib/date-bn";
import { PRAYERS } from "@/constants";

/** localStorage key holding the city last picked in the prayer card. */
export const PRAYER_CITY_KEY = "abhyas-prayer-city";
/** Minutes of focus suggested when a prayer time arrives. */
const SILENCE_MINUTES = 15;
const SILENCE_PREFIX = "abhyas-prayer-silence-";
/** How often we look for a prayer-time boundary crossing. */
const POLL_MS = 60_000;

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

/** Read the city the user last chose in the prayer card (default ঢাকা). */
export function getPrayerCity(): string {
  if (typeof window === "undefined") return "ঢাকা";
  try {
    return localStorage.getItem(PRAYER_CITY_KEY) || "ঢাকা";
  } catch {
    return "ঢাকা";
  }
}

/**
 * usePrayerSilence — নামাজের সময় অটো-সাইলেন্ট পরামর্শ.
 *
 * When a prayer time ARRIVES (observed as a boundary crossing while the app
 * is open — not on every reload), suggests one 15-minute quiet session:
 *
 *  • Android native → real system-wide DND via the FocusMode plugin
 *    (the same enable/disable path as the floating focus button).
 *  • Web/PWA → the honest soft focus (fullscreen + wake lock).
 *
 * One suggestion per prayer per day. If the tab is hidden, a browser
 * notification is fired instead (when permission was granted); without
 * permission nothing is shown — no silent spam.
 */
export function usePrayerSilence() {
  const enabled = useSettingsStore((s) => s.prayerSilenceEnabled);
  const { data: times } = usePrayerTimes(getPrayerCity(), { enabled });

  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !times) return;

    // Establish the baseline shortly after mount so a mid-session prayer
    // start is detected as a *transition* (no suggestion on app load).
    const baseline = setTimeout(() => {
      lastKey.current = currentPrayerKey(times, new Date());
    }, 1000);

    const id = setInterval(() => {
      const now = new Date();
      const key = currentPrayerKey(times, now);
      const prev = lastKey.current;
      lastKey.current = key;
      if (prev === null || prev === key) return;
      maybeSuggest(key as PrayerKey, now);
    }, POLL_MS);

    return () => {
      clearTimeout(baseline);
      clearInterval(id);
    };
  }, [enabled, times]);
}

function maybeSuggest(key: PrayerKey, now: Date) {
  const meta = PRAYERS.find((p) => p.key === key);
  if (!meta) return;

  // Once per prayer per day.
  const day = todayKey(now);
  const dedupKey = `${SILENCE_PREFIX}${day}-${key}`;
  try {
    if (localStorage.getItem(dedupKey)) return;
    localStorage.setItem(dedupKey, "1");
  } catch {
    /* private mode — still show the suggestion, just skip dedup */
  }

  // Hidden tab → OS-level notification (only with permission; else silent).
  if (typeof document !== "undefined" && document.hidden) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`${meta.label}-এর সময় হয়েছে`, {
          body: `এই ${toBn(SILENCE_MINUTES)} মিনিট ফোন চুপ রাখুন — ইবাদতে মন দিন।`,
          tag: `prayer-${key}-${day}`,
          icon: "/icon.svg",
        });
      } catch {
        /* ignore */
      }
    }
    return;
  }

  toast(`${meta.label}-এর সময় হয়েছে`, {
    description: "নামাজের সময় ফোন চুপ রাখুন — ইবাদতে মন দিন।",
    duration: 20_000,
    action: {
      label: `${toBn(SILENCE_MINUTES)} মিনিট ফোকাস`,
      onClick: () => void startSilenceSession(),
    },
  });
}

/** Start (or join) a focus session that self-ends after SILENCE_MINUTES. */
async function startSilenceSession() {
  const store = useFocusDndStore.getState();
  if (store.active) return; // already focusing — suggestion served its purpose

  await store.enable();

  // Auto-release after 15 min — but never kill a session the user restarted
  // themselves meanwhile (their startedAt would differ).
  const startedAt = useFocusDndStore.getState().startedAt;
  setTimeout(() => {
    const s = useFocusDndStore.getState();
    if (s.active && s.startedAt != null && s.startedAt === startedAt) {
      void s.disable();
    }
  }, SILENCE_MINUTES * 60 * 1000);
}
