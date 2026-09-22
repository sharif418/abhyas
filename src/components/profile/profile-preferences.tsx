"use client";

import { useState } from "react";
import {
  Bell,
  BellRing,
  Loader2,
  Send,
  SlidersHorizontal,
  Vibrate,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Section, ToggleRow } from "./profile-shared";

/** পছন্দ — haptics, sound, reminders and in-app notification toggles. */
export function ProfilePreferencesSection() {
  const settings = useSettingsStore();

  return (
    <Section title="পছন্দ" icon={SlidersHorizontal}>
      <ToggleRow
        icon={Vibrate}
        label="হ্যাপটিক ফিডব্যাক"
        desc="ট্যাপে ভাইব্রেশন"
        checked={settings.haptics}
        onChange={() => settings.toggleHaptics()}
      />
      <ToggleRow
        icon={Volume2}
        label="শব্দ"
        desc="সম্পন্ন ও বিজ্ঞপ্তি শব্দ"
        checked={settings.sound}
        onChange={() => settings.toggleSound()}
      />
      <ToggleRow
        icon={Bell}
        label="রিমাইন্ডার"
        desc="অভ্যাস রিমাইন্ডার"
        checked={settings.remindersEnabled}
        onChange={() => settings.toggleReminders()}
      />
      <ToggleRow
        icon={BellRing}
        label="নোটিফিকেশন"
        desc="সাধারণ নোটিফিকেশন"
        checked={settings.notificationsEnabled}
        onChange={() => settings.toggleNotifications()}
        last
        extra={
          settings.notificationsEnabled ? <TestNotificationButton /> : null
        }
      />
    </Section>
  );
}

/**
 * Test notification button — fires a sample OS notification (browser-level
 * test). Touch target raised to h-9 (audit fix #8) with a busy spinner while
 * permission is being requested.
 */
function TestNotificationButton() {
  const [status, setStatus] = useState<"idle" | "sent" | "denied">("idle");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("এই ব্রাউজারে নোটিফিকেশন সমর্থিত নয়");
      setStatus("denied");
      return;
    }
    setBusy(true);
    try {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
      }
      if (perm !== "granted") {
        toast.error("নোটিফিকেশন অনুমতি প্রয়োজন। ব্রাউজার সেটিংস থেকে অনুমতি দিন।");
        setStatus("denied");
        return;
      }
      new Notification("অভ্যাস", {
        body: "নোটিফিকেশন সফলভাবে চালু হয়েছে!",
        icon: "/icon.svg",
      });
      setStatus("sent");
      toast.success("পরীক্ষামূলক নোটিফিকেশন পাঠানো হয়েছে");
    } catch {
      toast.error("নোটিফিকেশন পাঠাতে ব্যর্থ");
      setStatus("denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={send}
      disabled={busy}
      className="h-9 gap-1.5 px-3 text-[11px]"
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" aria-hidden />
      ) : (
        <Send size={12} aria-hidden />
      )}
      {status === "sent" ? "পাঠানো হয়েছে" : status === "denied" ? "অনুমতি নেই" : "ব্রাউজার পরীক্ষা"}
    </Button>
  );
}
