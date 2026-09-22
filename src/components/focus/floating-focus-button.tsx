"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, MoonStar } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticPulse } from "@/lib/web-platform";
import {
  useFocusDndStore,
  formatClockBn,
} from "@/stores/focus-dnd-store";
import { FocusStatusSheet } from "@/components/focus/focus-status-sheet";

const FAB_SIZE = 56;
const LONG_PRESS_MS = 480;
/** Movement (px) before a press becomes a drag — taps stay taps. */
const DRAG_THRESHOLD = 10;
/** Query selector of the mobile bottom nav (measured for true resting height). */
const NAV_SELECTOR = 'nav[aria-label="প্রধান নেভিগেশন"]';

interface DragState {
  pointerId: number | null;
  startY: number;
  startBottom: number;
  /** Live bottom while dragging (refs beat stale closures in pointerup). */
  currentBottom: number;
  dragging: boolean;
  longPressed: boolean;
  suppressClick: boolean;
}

/**
 * Resting `bottom` (px from viewport bottom) for a zone.
 * Mobile: floats 12px above the real bottom nav (safe-area aware because the
 * nav itself is measured). Desktop (lg): standard 24px margin — no nav there.
 * While the PWA install banner is parked above the nav, the FAB re-stacks on
 * top of it so the two never overlap (the banner nudges a resize on show).
 */
function restingBottom(zone: "top" | "bottom"): number {
  if (typeof window === "undefined") return 84;
  if (zone === "top") {
    return Math.max(140, window.innerHeight - 96 - FAB_SIZE);
  }
  if (window.matchMedia("(min-width: 1024px)").matches) return 24;
  const banner = document.querySelector<HTMLElement>('[data-install-banner]');
  let bottom = 84;
  const nav = document.querySelector<HTMLElement>(NAV_SELECTOR);
  if (nav) {
    const rect = nav.getBoundingClientRect();
    if (rect.height > 0) bottom = window.innerHeight - rect.top + 12;
  }
  if (banner) bottom += banner.offsetHeight + 10;
  return bottom;
}

/**
 * FloatingFocusButton — the global focus-mode control.
 *
 * Present on EVERY view (mounted once in the app shell) so the user can enter
 * focus from wherever they are — Quran, Zikr, habits, anywhere.
 *
 *  • tap          → toggle focus (Android: system-wide DND; web: soft focus)
 *  • long-press   → status/info sheet (what's blocked, session length)
 *  • drag ↑/↓     → reposition; snaps to the nearer half and is remembered
 *
 * The active state breathes (halo pulse) and shows a live Bengali timer chip,
 * all disabled under `prefers-reduced-motion`.
 */
export function FloatingFocusButton() {
  const active = useFocusDndStore((s) => s.active);
  const busy = useFocusDndStore((s) => s.busy);
  const startedAt = useFocusDndStore((s) => s.startedAt);
  const fabZone = useFocusDndStore((s) => s.fabZone);
  const init = useFocusDndStore((s) => s.init);
  const toggle = useFocusDndStore((s) => s.toggle);
  const syncFromSystem = useFocusDndStore((s) => s.syncFromSystem);
  const openSheet = useFocusDndStore((s) => s.openSheet);
  const setFabZone = useFocusDndStore((s) => s.setFabZone);

  const reduced = useReducedMotion();
  const [bottom, setBottom] = useState<number | null>(null); // null = resting
  const [dragging, setDragging] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  /** 0 until the first post-paint measure — keeps SSR & hydration identical. */
  const [layoutTick, setLayoutTick] = useState(0);

  const drag = useRef<DragState>({
    pointerId: null,
    startY: 0,
    startBottom: 0,
    currentBottom: 0,
    dragging: false,
    longPressed: false,
    suppressClick: false,
  });
  const longPressTimer = useRef<number | null>(null);

  // ── lifecycle: init native status, keep it truthful on app resume ────────
  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void syncFromSystem();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [syncFromSystem]);

  // ── resting position (re-measure after paint + on any layout change) ────
  // `restingBottom()` reads live layout (nav rect / media query), so a pure
  // `setBottom(null)` on resize would bail out when already null and keep a
  // stale inline style — hence the tick counter forces a real re-render.
  useEffect(() => {
    const bump = () => setLayoutTick((t) => t + 1);
    const raf = requestAnimationFrame(bump);
    const mql = window.matchMedia("(min-width: 1024px)");
    mql.addEventListener?.("change", bump);
    window.addEventListener("resize", bump);
    window.addEventListener("orientationchange", bump);
    return () => {
      cancelAnimationFrame(raf);
      mql.removeEventListener?.("change", bump);
      window.removeEventListener("resize", bump);
      window.removeEventListener("orientationchange", bump);
    };
  }, []);

  // ── live elapsed ticker (only while active) ──────────────────────────────
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const elapsedMs =
    active && startedAt != null ? Math.max(0, now - startedAt) : 0;

  // ── interaction: drag + long-press + tap ─────────────────────────────────
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const currentBottom = bottom ?? restingBottom(fabZone);
      drag.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startBottom: currentBottom,
        currentBottom,
        dragging: false,
        longPressed: false,
        suppressClick: false,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* capture best-effort */
      }
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        const d = drag.current;
        if (d.pointerId == null || d.dragging) return;
        d.longPressed = true;
        d.suppressClick = true;
        hapticPulse(18);
        openSheet(active ? "status" : "info");
      }, LONG_PRESS_MS);
    },
    [active, bottom, fabZone, clearLongPress, openSheet]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      if (d.pointerId !== e.pointerId) return;
      const dy = d.startY - e.clientY; // up = positive
      if (!d.dragging) {
        if (Math.abs(dy) < DRAG_THRESHOLD) return;
        d.dragging = true;
        clearLongPress();
        setDragging(true);
      }
      const minB = 64;
      const maxB = Math.max(minB + 1, window.innerHeight - 152);
      const next = Math.min(maxB, Math.max(minB, d.startBottom + dy));
      d.currentBottom = next;
      setBottom(next);
    },
    [clearLongPress]
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      if (d.pointerId !== e.pointerId) return;
      clearLongPress();
      d.pointerId = null;
      setDragging(false);
      if (d.dragging) {
        d.suppressClick = true;
        const zone: "top" | "bottom" =
          d.currentBottom > window.innerHeight / 2 ? "top" : "bottom";
        if (zone !== fabZone) setFabZone(zone);
      }
      setBottom(null); // snap back to the (possibly new) resting spot
    },
    [fabZone, setFabZone, clearLongPress]
  );

  const onClick = useCallback(() => {
    if (drag.current.suppressClick) {
      drag.current.suppressClick = false;
      return;
    }
    if (busy) return;
    void toggle();
  }, [busy, toggle]);

  // Hydration-safe resting position: until the first post-paint tick the
  // value is the SSR default (84), so server HTML and the hydration render
  // match exactly; the rAF bump then swaps in the measured real position.
  const resolvedBottom =
    layoutTick > 0 ? bottom ?? restingBottom(fabZone) : 84;

  const label = active ? "ফোকাস মোড বন্ধ করুন" : "ফোকাস মোড চালু করুন";

  return (
    <>
      <motion.button
        type="button"
        aria-label={label}
        aria-pressed={active}
        aria-busy={busy || undefined}
        title={label}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(e) => {
          // Desktop parity for long-press: right-click opens the sheet.
          e.preventDefault();
          openSheet(active ? "status" : "info");
        }}
        className={cn(
          "fixed right-4 z-40 flex select-none items-center justify-center rounded-full",
          "focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "shadow-lg transition-[background-color,border-color,box-shadow]",
          !dragging && "transition-[bottom,background-color,border-color] duration-300 ease-out",
          active
            ? "border border-islamic/40 bg-islamic text-islamic-foreground shadow-islamic/30"
            : "border border-border/70 bg-background/90 text-foreground/75 backdrop-blur-md hover:text-primary"
        )}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          bottom: resolvedBottom,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "pointer",
        }}
        initial={reduced ? false : { scale: 0, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { delay: 0.9, type: "spring", stiffness: 260, damping: 21 }
        }
        whileHover={reduced || dragging ? undefined : { scale: 1.06 }}
        whileTap={reduced ? undefined : { scale: 0.92 }}
      >
        {/* breathing halo while focus is ON */}
        {active && !reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-islamic/45"
            animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        <span className="relative z-10" aria-hidden>
          <motion.span
            className="flex items-center justify-center"
            key={active ? "on" : "off"}
            initial={reduced ? false : { scale: 0.4, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
          >
            {active ? <MoonStar size={24} /> : <Moon size={22} />}
          </motion.span>
        </span>
      </motion.button>

      {/* live session chip (also a tap target → status sheet) */}
      {active && (
        <button
          type="button"
          onClick={() => openSheet("status")}
          className={cn(
            "fixed right-4 z-40 rounded-full px-2.5 py-1",
            "bg-islamic text-islamic-foreground shadow-md shadow-islamic/25",
            "text-[10px] font-bold tabular-nums tracking-wide",
            "focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:outline-none",
            "transition-[bottom] ease-out",
            !dragging && "duration-300"
          )}
          style={{
            bottom: resolvedBottom + FAB_SIZE + 8,
            touchAction: "none",
          }}
          aria-label="ফোকাস সেশনের সময় — বিস্তারিত দেখুন"
        >
          {startedAt != null ? (
            <>
              <span className="mr-1 opacity-80">ফোকাস</span>
              {formatClockBn(elapsedMs)}
            </>
          ) : (
            "ফোকাস চালু"
          )}
        </button>
      )}

      <FocusStatusSheet />
    </>
  );
}
