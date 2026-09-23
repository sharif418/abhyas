"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { getNativePlatform, type NativePlatform } from "@/lib/native/capacitor";
import { FocusMode, isDndAccessError } from "@/lib/native/focus-plugin";
import { hapticPulse } from "@/lib/web-platform";
import { toBn } from "@/lib/date-bn";

export type FocusSheetKind = "permission" | "status" | "info";
/** Vertical resting zone of the floating button (persisted preference). */
export type FabZone = "bottom" | "top";

interface FocusDndState {
  /** Native shell platform ("web" until init() runs — SSR safe). */
  platform: NativePlatform;
  /** True once init() has resolved (status synced / fallbacks armed). */
  ready: boolean;
  /** Android DND access granted (always true on web). */
  accessGranted: boolean;
  /** Focus (notification suppression) is currently ON. */
  active: boolean;
  /** Epoch ms when this focus session started (null = unknown). */
  startedAt: number | null;
  /** Guards against double-taps while a native call is in flight. */
  busy: boolean;
  sheet: FocusSheetKind | null;
  fabZone: FabZone;
  /** ডিস্ট্রাকশন-ফ্রি ইবাদত: pin the screen during native focus (own choice). */
  screenPin: boolean;

  init: () => Promise<void>;
  syncFromSystem: () => Promise<void>;
  toggle: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  requestAccess: () => Promise<void>;
  openSheet: (kind: FocusSheetKind) => void;
  closeSheet: () => void;
  setFabZone: (zone: FabZone) => void;
  setScreenPin: (pinned: boolean) => void;
}

/** Bengali human duration: "২ ঘণ্টা ৫ মিনিট" / "৪ মিনিট ১২ সেকেন্ড". */
export function formatDurationBn(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${toBn(h)} ঘণ্টা ${toBn(m)} মিনিট`;
  if (m > 0) return `${toBn(m)} মিনিট ${toBn(s)} সেকেন্ড`;
  return `${toBn(s)} সেকেন্ড`;
}

/** Bengali clock duration for the live chip: "১২:০৫" / "১:০২:৩৩". */
export function formatClockBn(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return toBn(h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`);
}

/**
 * Global Focus-mode state behind the floating button.
 *
 * Native (Android): truth comes from the OS — `syncFromSystem()` re-reads the
 * actual DND state on app resume so the UI never lies if the user changes DND
 * from quick settings. Web: the honest soft focus (fullscreen + wake lock).
 */
export const useFocusDndStore = create<FocusDndState>()(
  persist(
    (set, get) => ({
      platform: "web",
      ready: false,
      accessGranted: true,
      active: false,
      startedAt: null,
      busy: false,
      sheet: null,
      fabZone: "bottom",
      screenPin: false,

      init: async () => {
        const platform = getNativePlatform();
        set({ platform });
        if (platform === "web") {
          // Persisted soft focus: wake lock (and plugin state) died with the
          // page reload — re-arm both. Fullscreen needs a gesture and will
          // silently stay off until the user re-enters it from the sheet.
          if (get().active) {
            void FocusMode.enable().catch(() => {});
          }
          set({ ready: true, accessGranted: true });
          return;
        }
        await get().syncFromSystem();
        set({ ready: true });
      },

      syncFromSystem: async () => {
        if (get().platform === "web") return;
        try {
          const st = await FocusMode.getStatus();
          set({ accessGranted: st.granted });
          if (st.active && !get().active) {
            // DND on (maybe enabled from quick settings) — adopt it.
            set({ active: true, startedAt: get().startedAt ?? Date.now() });
          } else if (!st.active && get().active) {
            set({ active: false, startedAt: null });
          }
        } catch {
          /* plugin unavailable — keep optimistic state */
        }
      },

      toggle: async () => {
        const { busy, active, platform, accessGranted } = get();
        if (busy) return;
        if (platform !== "web" && !accessGranted) {
          get().openSheet("permission");
          return;
        }
        if (active) {
          await get().disable();
        } else {
          await get().enable();
        }
      },

      enable: async () => {
        if (get().busy) return;
        set({ busy: true });
        try {
          const res = await FocusMode.enable();
          if (res.active) {
            set({ active: true, startedAt: get().startedAt ?? Date.now() });
            hapticPulse(24);
            if (get().platform === "web") {
              const on = [
                res.fullscreen ? "ফুলস্ক্রিন" : null,
                res.wakeLock ? "স্ক্রিন-জাগা" : null,
              ]
                .filter(Boolean)
                .join(" ও ");
              toast.success("ওয়েব ফোকাস চালু", {
                description: on
                  ? `${on} সক্রিয়। ফোনের সব নোটিফিকেশন বন্ধ করতে Android অ্যাপ ব্যবহার করুন।`
                  : "ফোনের সব নোটিফিকেশন বন্ধ করতে Android অ্যাপ ব্যবহার করুন।",
              });
            } else {
              // ডিস্ট্রাকশন-ফ্রি ইবাদত (opt-in): pin our own activity while
              // the session runs — wandering taps land on nothing.
              if (get().screenPin) {
                FocusMode.startScreenPin().catch(() => {
                  /* not supported / OEM block — focus itself still works */
                });
              }
              toast.success("ফোকাস মোড চালু", {
                description:
                  "ফোনের সব নোটিফিকেশন ও ডিস্ট্রাকশন এখন বন্ধ থাকবে।",
              });
            }
          }
        } catch (err) {
          if (isDndAccessError(err)) {
            set({ accessGranted: false });
            get().openSheet("permission");
          } else {
            toast.error("ফোকাস মোড চালু করা যায়নি", {
              description: "একটু পরে আবার চেষ্টা করুন।",
            });
          }
        } finally {
          set({ busy: false });
        }
      },

      disable: async () => {
        if (get().busy) return;
        const prevStarted = get().startedAt;
        set({ busy: true });
        try {
          const res = await FocusMode.disable();
          if (!res.active) {
            set({ active: false, startedAt: null });
            hapticPulse(16);
            if (get().platform !== "web") {
              // Session over → unpin (no-op when never pinned).
              FocusMode.stopScreenPin().catch(() => {});
            }
            const dur =
              prevStarted != null ? formatDurationBn(Date.now() - prevStarted) : null;
            if (dur) {
              toast.success(`ফোকাস শেষ — ${dur}`, {
                description: "আলহামদুলিল্লাহ! সব নোটিফিকেশন আবার চালু হলো।",
              });
            } else {
              toast.success("ফোকাস মোড বন্ধ হলো", {
                description: "সব নোটিফিকেশন আবার চালু।",
              });
            }
            if (get().sheet === "status") set({ sheet: null });
          }
        } catch {
          toast.error("ফোকাস মোড বন্ধ করা যায়নি", {
            description: "একটু পরে আবার চেষ্টা করুন।",
          });
        } finally {
          set({ busy: false });
        }
      },

      requestAccess: async () => {
        try {
          const res = await FocusMode.requestAccess();
          if (res.granted) {
            set({ accessGranted: true, sheet: null });
            toast.success("অনুমতি পাওয়া গেছে", {
              description: "এখন ভাসমান বাটনে চাপ দিয়ে ফোকাস চালু করুন।",
            });
          } else if (res.opened) {
            set({ sheet: null });
            toast.info("সিস্টেম সেটিংস খোলা হয়েছে", {
              description:
                "তালিকায় \"অভ্যাস\" খুঁজে Do Not Disturb access অনুমতি দিন, তারপর অ্যাপে ফিরে আসুন।",
            });
          }
        } catch {
          toast.error("সেটিংস খোলা যায়নি", {
            description: "সেটিংস → Do Not Disturb access থেকে ম্যানুয়ালি অনুমতি দিন।",
          });
        }
      },

      openSheet: (kind) => set({ sheet: kind }),
      closeSheet: () => set({ sheet: null }),
      setFabZone: (zone) => set({ fabZone: zone }),
      setScreenPin: (pinned) => {
        set({ screenPin: pinned });
        // Applying mid-session keeps the promise honest immediately.
        if (get().platform !== "web" && get().active) {
          if (pinned) {
            FocusMode.startScreenPin().catch(() => {});
          } else {
            FocusMode.stopScreenPin().catch(() => {});
          }
        }
      },
    }),
    {
      name: "abhyas-focus-dnd",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        active: s.active,
        startedAt: s.startedAt,
        fabZone: s.fabZone,
        screenPin: s.screenPin,
      }),
    }
  )
);
