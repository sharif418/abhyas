"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, Send, Sparkles, MoonStar } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  isPushSupported,
  getPushPermissionState,
  getPushSubscription,
  subscribePush,
  unsubscribePush,
  PUSH_PERMISSION_LABEL,
  type PushPermissionState,
} from "@/lib/push";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Section, ToggleRow } from "./profile-shared";

/** পুশ নোটিফিকেশন — VAPID Web Push section + স্মার্ট বুদ্ধিমত্তা। */
export function ProfileNotificationsSection() {
  return (
    <>
      <Section title="পুশ নোটিফিকেশন" icon={BellRing}>
        <PushNotificationsRow />
      </Section>
      <SmartRemindersSection />
    </>
  );
}

/**
 * SmartRemindersSection — স্মার্ট নোটিফিকেশন (Roadmap ফেজ ১-৪):
 *  ১. স্মার্ট রিমাইন্ডার — ভুলে যাওয়া অভ্যাসের ধাপে-ধাপে মনে করানো
 *     (৯০ মিনিট পর মৃদু বার্তা, রাত ৮:৩০/১০:৩০-এ স্ট্রিক রক্ষার সারসংক্ষেপ)।
 *  ২. নামাজে সাইলেন্ট পরামর্শ — ওয়াক্ত শুরুতে ১৫ মিনিট ফোকাস মোডের
 *     পরামর্শ (অ্যান্ড্রয়েডে আসল DND, ওয়েবে সফট ফোকাস)।
 */
function SmartRemindersSection() {
  const smartReminders = useSettingsStore((s) => s.smartRemindersEnabled);
  const prayerSilence = useSettingsStore((s) => s.prayerSilenceEnabled);
  const toggleSmartReminders = useSettingsStore((s) => s.toggleSmartReminders);
  const togglePrayerSilence = useSettingsStore((s) => s.togglePrayerSilence);

  return (
    <Section title="স্মার্ট সহায়তা" icon={Sparkles}>
      <ToggleRow
        icon={Sparkles}
        label="স্মার্ট রিমাইন্ডার"
        desc="ভুলে গেলে ৯০ মিনিট পর মৃদু বার্তা, রাতে স্ট্রিক রক্ষার শেষ সুযোগ"
        checked={smartReminders}
        onChange={toggleSmartReminders}
      />
      <ToggleRow
        icon={MoonStar}
        label="নামাজে সাইলেন্ট পরামর্শ"
        desc="ওয়াক্ত শুরুতে ১৫ মিনিট ফোকাস মোডের পরামর্শ (অ্যান্ড্রয়েডে আসল DND)"
        checked={prayerSilence}
        onChange={togglePrayerSilence}
        last
      />
    </Section>
  );
}

/**
 * PushNotificationsRow — VAPID Web Push toggle.
 *
 * Subscribes the browser to server-driven push notifications (via the
 * `/api/push/*` routes and `src/lib/push.ts`). Shows live permission
 * status and exposes a "পুশ পরীক্ষা" button that POSTs to `/api/push/test`.
 *
 * Degrades gracefully when:
 *   - Push is unsupported (no SW / PushManager / non-secure context)
 *   - VAPID keys are missing on the server
 *   - The user previously denied notification permission
 */
function PushNotificationsRow() {
  const [supported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    getPushPermissionState()
  );
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Check for an existing push subscription on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sub = await getPushSubscription();
      if (cancelled) return;
      setSubscribed(Boolean(sub));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reflect Notification.permission changes made from browser site settings
  // (where the user can revoke/grant outside the app). Audit fix #4: no more
  // 2s setInterval polling forever — re-check on mount and on tab visibility
  // changes only.
  useEffect(() => {
    if (!supported) return;
    const sync = () => setPermission(getPushPermissionState());
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [supported]);

  const handleToggle = async (checked: boolean) => {
    setBusy(true);
    try {
      if (checked) {
        const sub = await subscribePush();
        if (sub) {
          setSubscribed(true);
          setPermission("granted");
          toast.success("পুশ নোটিফিকেশন চালু হয়েছে");
        } else {
          // Permission denied by user OR subscribe silently failed.
          setPermission(getPushPermissionState());
          toast.error("পুশ অনুমতি অস্বীকার করা হয়েছে");
        }
      } else {
        const ok = await unsubscribePush();
        if (ok) {
          setSubscribed(false);
          toast.success("পুশ নোটিফিকেশন বন্ধ হয়েছে");
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "পুশ অপারেশন ব্যর্থ";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setSendingTest(true);
    try {
      const data = await api.post<{ sent?: boolean }>("/api/push/test");
      if (data.sent) {
        toast.success("পরীক্ষামূলক পুশ পাঠানো হয়েছে");
      } else {
        toast.error("পুশ পাঠাতে ব্যর্থ");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "নেটওয়ার্ক ত্রুটি";
      toast.error(msg);
    } finally {
      setSendingTest(false);
    }
  };

  // --- Unsupported: show muted info row, no switch ---
  if (!supported) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <BellRing size={16} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">পুশ নোটিফিকেশন</div>
          <div className="text-[11px] text-muted-foreground">
            এই ব্রাউজারে সমর্থিত নয় (HTTPS ও সার্ভিস ওয়ার্কার প্রয়োজন)
          </div>
        </div>
      </div>
    );
  }

  const isOn = subscribed === true;
  const isLoading = subscribed === null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <BellRing size={16} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">পুশ নোটিফিকেশন</div>
          <div className="text-[11px] text-muted-foreground">
            সার্ভার থেকে অভ্যাস রিমাইন্ডার
          </div>
        </div>
        {isOn && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={sendingTest || busy}
            className="h-9 gap-1.5 px-3 text-[11px]"
          >
            {sendingTest ? (
              <Loader2 size={12} className="animate-spin" aria-hidden />
            ) : (
              <Send size={12} aria-hidden />
            )}
            {sendingTest ? "পাঠানো হচ্ছে..." : "পুশ পরীক্ষা"}
          </Button>
        )}
        <Switch
          checked={isOn}
          onCheckedChange={handleToggle}
          disabled={busy || isLoading || permission === "denied"}
          aria-label="পুশ নোটিফিকেশন টগল"
        />
      </div>

      {/* Status row */}
      <div className="mt-2 flex items-center gap-2 pl-11 text-[11px]">
        <PermissionBadge state={permission} />
        <span className="text-muted-foreground">
          {isLoading
            ? "অবস্থা যাচাই করা হচ্ছে..."
            : isOn
              ? "সাবস্ক্রাইব করা আছে ✓"
              : permission === "denied"
                ? "অনুমতি ব্লক করা হয়েছে"
                : "সাবস্ক্রাইব করা নেই"}
        </span>
      </div>

      {/* Denied permission — helpful guidance */}
      {permission === "denied" && (
        <div className="mt-2 ml-11 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
          <div className="font-medium">নোটিফিকেশন ব্লক করা হয়েছে</div>
          <p className="mt-0.5 leading-relaxed">
            পুশ নোটিফিকেশন চালু করতে ব্রাউজারের ঠিকানা বারের বাম পাশে থাকা নোটিফিকেশন
            আইকনে ক্লিক করুন, তারপর "নোটিফিকেশন" অনুমতি "অনুমতি দিন" এ পরিবর্তন করুন।
          </p>
        </div>
      )}

      {/* Default permission — hint to enable */}
      {permission === "default" && !isOn && (
        <div className="mt-1 ml-11 text-[10px] text-muted-foreground">
          টগল চালু করলে ব্রাউজার অনুমতি চাইবে
        </div>
      )}
    </div>
  );
}

function PermissionBadge({ state }: { state: PushPermissionState }) {
  const color =
    state === "granted"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : state === "denied"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        color
      )}
    >
      {PUSH_PERMISSION_LABEL[state]}
    </span>
  );
}
