"use client";

import { useCallback, useEffect, useRef } from "react";
import { Maximize, MonitorSmartphone, Moon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings-store";
import { Section, ToggleRow } from "./profile-shared";

/**
 * ইবাদত মোড — the app's flagship immersive focus mode (কুরআন / জিকির).
 *
 * These toggles drive the ibadah-store session behaviour (auto fullscreen +
 * wake lock on session start) and the server-side push-suppression window.
 * They persist through the zustand localStorage store AND are mirrored to
 * POST /api/me/settings (see useIbadahSettingsSync below) — the same
 * persistence contract the other profile toggles get from the global
 * settings sync.
 */
export function ProfileIbadahSection() {
  const settings = useSettingsStore();
  useIbadahSettingsSync();

  return (
    <Section title="ইবাদত মোড" icon={Moon}>
      <ToggleRow
        icon={Moon}
        label="ইবাদত মোড সক্রিয় করুন"
        desc="কুরআন ও জিকিরের জন্য নিবিড় ফোকাস মোড"
        checked={settings.ibadahModeEnabled}
        onChange={(v) => settings.setIbadahModeEnabled(v)}
      />
      <ToggleRow
        icon={Maximize}
        label="স্বয়ংক্রিয় ফুলস্ক্রিন"
        desc="ইবাদত শুরু হলে স্ক্রিন ফুলস্ক্রিন হবে"
        checked={settings.ibadahFullscreen}
        onChange={(v) => settings.setIbadahFullscreen(v)}
      />
      <ToggleRow
        icon={MonitorSmartphone}
        label="স্ক্রিন সক্রিয় রাখুন"
        desc="তিলাওয়াত/জিকিরের সময় স্ক্রিন বন্ধ হবে না"
        checked={settings.ibadahWakeLock}
        onChange={(v) => settings.setIbadahWakeLock(v)}
        last
      />
      <div className="px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        ইবাদত চলাকালে অ্যাপের নিজস্ব নোটিফিকেশন স্বয়ংক্রিয়ভাবে বন্ধ থাকে।
        হোয়াটসঅ্যাপ/মেসেঞ্জারের নোটিফিকেশন বন্ধ করতে ফোনের ডিস্টার্ব মোড (DND) চালু রাখুন।
      </div>
    </Section>
  );
}

/**
 * Mirror the three ইবাদত booleans to POST /api/me/settings (best-effort).
 *
 * Follows the debounced sync pattern the global `useSettingsEffect` gives the
 * other toggles, with two hardening tweaks:
 *  - it skips the mount-time snapshot, so stale localStorage values can never
 *    overwrite newer server settings before hydration; and
 *  - it flushes on unmount, so a toggle made right before navigating away
 *    from the profile still persists.
 */
function useIbadahSettingsSync() {
  const { ibadahModeEnabled, ibadahFullscreen, ibadahWakeLock } = useSettingsStore();
  const initial = useRef({ ibadahModeEnabled, ibadahFullscreen, ibadahWakeLock });

  const isDirty = useCallback(() => {
    const s = useSettingsStore.getState();
    return (
      s.ibadahModeEnabled !== initial.current.ibadahModeEnabled ||
      s.ibadahFullscreen !== initial.current.ibadahFullscreen ||
      s.ibadahWakeLock !== initial.current.ibadahWakeLock
    );
  }, []);

  useEffect(() => {
    if (
      ibadahModeEnabled === initial.current.ibadahModeEnabled &&
      ibadahFullscreen === initial.current.ibadahFullscreen &&
      ibadahWakeLock === initial.current.ibadahWakeLock
    ) {
      return; // unchanged since mount — nothing to persist
    }
    const id = setTimeout(() => {
      api
        .post("/api/me/settings", { ibadahModeEnabled, ibadahFullscreen, ibadahWakeLock })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(id);
  }, [ibadahModeEnabled, ibadahFullscreen, ibadahWakeLock]);

  // Flush pending changes when the section unmounts (e.g. the user navigates
  // away from the profile mid-debounce).
  useEffect(
    () => () => {
      if (!isDirty()) return;
      const s = useSettingsStore.getState();
      api
        .post("/api/me/settings", {
          ibadahModeEnabled: s.ibadahModeEnabled,
          ibadahFullscreen: s.ibadahFullscreen,
          ibadahWakeLock: s.ibadahWakeLock,
        })
        .catch(() => {});
    },
    [isDirty]
  );
}
