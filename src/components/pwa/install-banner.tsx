"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import {
  bootInstallManager,
  dismissInstall,
  getInstallState,
  promptInstall,
  subscribeInstall,
  dismissedRecently,
  type InstallState,
} from "@/lib/pwa/install";
import { isNativeApp } from "@/lib/native/capacitor";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/overlays/responsive-modal";
import { cn } from "@/lib/utils";

/** Let the user settle before inviting — 6s is the sweet spot. */
const SHOW_DELAY_MS = 6_000;
/** Query selector of the mobile bottom nav (banner parks just above it). */
const NAV_SELECTOR = 'nav[aria-label="প্রধান নেভিগেশন"]';

/** Bottom offset: 12px above the mobile nav; 24px on desktop. */
function bannerBottom(): number {
  if (typeof window === "undefined") return 96;
  if (window.matchMedia("(min-width: 1024px)").matches) return 24;
  const nav = document.querySelector<HTMLElement>(NAV_SELECTOR);
  if (nav) {
    const rect = nav.getBoundingClientRect();
    if (rect.height > 0) return window.innerHeight - rect.top + 12;
  }
  return 96;
}

/**
 * InstallBanner — the site-visit → "install the app" invitation.
 *
 *  • Android/desktop Chrome/Edge: one-tap native install (WebAPK) — installs
 *    as a REAL Android app with home-screen icon, splash, offline support
 *    and OS notifications.
 *  • iOS Safari: honest step-by-step "Add to Home Screen" guide (Apple
 *    allows no install API — instructions are the industry pattern).
 *  • Never renders inside the native Capacitor shell, once installed, or
 *    within 3 days after a dismissal.
 *
 * Mobile: parks above the bottom nav; the floating focus button re-stacks
 * above the banner (via a resize nudge it already listens to).
 * Desktop: bottom-right card.
 */
export function InstallBanner() {
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);
  const [eligible, setEligible] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bottom, setBottom] = useState(96);

  useEffect(() => {
    bootInstallManager();
    // Delay the eligibility check so the banner doesn't fight onboarding /
    // first-paint skeletons for the user's attention.
    const t = window.setTimeout(() => setEligible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const visible =
    eligible &&
    !isNativeApp() &&
    !install.installed &&
    !install.prompting &&
    !dismissedRecently() &&
    (install.canInstall || install.platform === "ios");

  // Park the banner just above the mobile bottom nav (re-measured on resize).
  useEffect(() => {
    if (!visible) return;
    const measure = () => setBottom(bannerBottom());
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [visible]);

  // Nudge layout listeners (the FAB) whenever the banner enters/leaves.
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [visible]);

  const handleInstall = useCallback(async () => {
    setBusy(true);
    try {
      const result = await promptInstall();
      if (result === "accepted") {
        toast.success("অ্যাপ ইনস্টল হয়েছে! হোম স্ক্রিন থেকে খুলুন।", {
          icon: "🎉",
          duration: 6000,
        });
      } else if (result === "dismissed") {
        toast("সমস্যা নেই — সেটিংস থেকে যেকোনো সময় ইনস্টল করতে পারবেন।", {
          duration: 5000,
        });
      } else {
        // Deferred prompt evaporated (rare: browser heuristics) — guide.
        setIosGuideOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const handleLater = useCallback(() => {
    dismissInstall(3);
  }, []);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            data-install-banner
            role="dialog"
            aria-label="অ্যাপ ইনস্টল করুন"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "fixed z-50 rounded-2xl border bg-card/95 p-3 shadow-xl backdrop-blur-md",
              // Mobile: full-width card parked above the bottom nav;
              // desktop: bottom-right corner card.
              "inset-x-3 lg:inset-x-auto lg:right-6 lg:w-[380px]"
            )}
            style={{ bottom }}
          >
            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt="অভ্যাস অ্যাপ আইকন"
                width={48}
                height={48}
                className="rounded-xl shadow-md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">অভ্যাস অ্যাপ ইনস্টল করুন</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  হোম স্ক্রিনে যোগ হবে • অফলাইনে চলবে • নোটিফিকেশন পাবেন
                </p>
              </div>
              <button
                type="button"
                onClick={handleLater}
                aria-label="পরে দেখব — বন্ধ করুন"
                className="focus-visible:ring-ring/70 -m-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2.5 flex gap-2">
              {install.canInstall ? (
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={busy}
                  className="h-9 flex-1 font-bold"
                >
                  <Download className="size-4" aria-hidden />
                  {busy ? "ইনস্টল হচ্ছে…" : "ইনস্টল করুন"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIosGuideOpen(true)}
                  className="h-9 flex-1 font-bold"
                >
                  <Share className="size-4" aria-hidden />
                  কিভাবে ইনস্টল করবো?
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLater}
                className="h-9 px-4 text-muted-foreground"
              >
                পরে
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <IosInstallGuide open={iosGuideOpen} onOpenChange={setIosGuideOpen} />
    </>
  );
}

/** iOS Safari has no install API — the honest UX is a clear 3-step guide. */
function IosInstallGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const steps: { icon: React.ReactNode; title: string; detail: string }[] = [
    {
      icon: <Share className="size-5" aria-hidden />,
      title: "শেয়ার বাটনে চাপ দিন",
      detail: "Safari-র নিচের বারে মাঝখানে থাকা শেয়ার আইকনে ট্যাপ করুন।",
    },
    {
      icon: <Download className="size-5" aria-hidden />,
      title: "“Add to Home Screen” নির্বাচন করুন",
      detail: "লিস্টে একটু নিচে স্ক্রল করলেই পাবেন।",
    },
    {
      icon: <Bell className="size-5" aria-hidden />,
      title: "“Add” চাপ দিন — শেষ!",
      detail: "হোম স্ক্রিনে অভ্যাস অ্যাপ যোগ হয়ে যাবে, অন্য যেকোনো অ্যাপের মতোই চলবে।",
    },
  ];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="আইফোনে অ্যাপ ইনস্টল"
      description="মাত্র ৩টি ধাপ — একবারই করতে হবে"
      size="sm"
    >
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border bg-card p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {s.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        ইনস্টলের পর অ্যাপ অফলাইনেও চলবে এবং নোটিফিকেশন পাবেন।
      </p>
    </ResponsiveModal>
  );
}
