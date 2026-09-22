"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Download,
  Globe,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInstallState,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa/install";
import { isNativeApp, getNativePlatform } from "@/lib/native/capacitor";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/constants/app";
import { DataRow, Section } from "./profile-shared";

/**
 * অ্যাপ — install, updates and version. The Settings-page home for the
 * whole install experience: a visitor who dismissed the smart banner can
 * install from here any time, and everyone can trigger an update check.
 */
export function ProfileAppSection() {
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);
  const native = isNativeApp();
  const platform = getNativePlatform();
  const [checking, setChecking] = useState(false);
  const [swVersion, setSwVersion] = useState<string | null>(null);

  useEffect(() => {
    // Best-effort: read the active cache version from the Service Worker.
    if (!("serviceWorker" in navigator) || typeof window === "undefined") return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg?.active) return;
      const mc = new MessageChannel();
      mc.port1.onmessage = (e) => {
        if (e.data?.type === "SW_VERSION") setSwVersion(e.data.version as string);
      };
      reg.active.postMessage({ type: "GET_VERSION" }, [mc.port2]);
    }).catch(() => {});
  }, []);

  const handleInstall = useCallback(async () => {
    const result = await promptInstall();
    if (result === "accepted") {
      toast.success("অ্যাপ ইনস্টল হয়েছে! হোম স্ক্রিন থেকে খুলুন।", { duration: 6000 });
    } else if (result === "dismissed") {
      toast("সমস্যা নেই — যেকোনো সময় আবার চেষ্টা করতে পারবেন।");
    } else {
      toast.info(
        "এই ব্রাউজারে সরাসরি ইনস্টল বাটন নেই। ব্রাউজার মেনু থেকে “Add to Home Screen / ইনস্টল করুন” বেছে নিন।",
        { duration: 8000 }
      );
    }
  }, []);

  const handleUpdateCheck = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      toast.info("এই মোডে আপডেট চেক নেই — পেজ রিলোড করলেই সর্বশেষ ভার্সন আসবে।");
      return;
    }
    setChecking(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        toast.info("পেজ রিলোড করলেই সর্বশেষ ভার্সন আসবে।");
        return;
      }
      await reg.update();
      if (reg.waiting) {
        toast("নতুন আপডেট প্রস্তুত — হালনাগাদ করুন চাপুন", {
          action: {
            label: "হালনাগাদ করুন",
            onClick: () => reg.waiting?.postMessage({ type: "SKIP_WAITING" }),
          },
          duration: 15000,
        });
      } else {
        toast.success("আপনি ইতিমধ্যে সর্বশেষ ভার্সনে আছেন।");
      }
    } catch {
      toast.error("আপডেট চেক করা যায়নি — একটু পরে আবার চেষ্টা করুন।");
    } finally {
      setChecking(false);
    }
  }, []);

  return (
    <Section title="অ্যাপ" icon={Smartphone}>
      <DataRow
        icon={native ? CheckCircle2 : install.installed ? CheckCircle2 : Globe}
        label={
          native
            ? "অ্যান্ড্রয়েড অ্যাপ চালু আছে"
            : install.installed
              ? "অ্যাপ ইনস্টল করা আছে"
              : "ব্রাউজারে চলছে (ওয়েব)"
        }
        desc={
          native
            ? "সব OS-লেভেল ফিচার (ফোকাস, অ্যাপ নিয়ন্ত্রণ) সক্রিয়। নতুন আপডেট অটোমেটিক আসবে।"
            : install.installed
              ? "অফলাইনেও চলবে • নতুন আপডেট নিজে থেকেই বসবে।"
              : "হোম স্ক্রিনে যোগ করলে সত্যিকারের অ্যাপের মতোই চলবে — অফলাইন + নোটিফিকেশন।"
        }
        action={
          !native && !install.installed ? (
            <Button size="sm" variant="outline" onClick={handleInstall} className="h-8">
              <Download className="size-3.5" aria-hidden />
              ইনস্টল
            </Button>
          ) : undefined
        }
        last
      />

      {!native && !install.installed && !install.canInstall && (
        <p className="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
          {install.platform === "ios"
            ? "আইফোনে: Safari-র শেয়ার বাটন → “Add to Home Screen”।"
            : "ব্রাউজার মেনু (⋮ / ঠিকচিহ্ন) → “ইনস্টল করুন / Add to Home Screen”।"}
        </p>
      )}

      {!native && (
        <DataRow
          icon={RefreshCw}
          label="আপডেট চেক করুন"
          desc="অ্যাপে ঢুকলেই নতুন আপডেট নিজে থেকে বসে যায় — চাইলে এখনই চেক করুন।"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpdateCheck}
              disabled={checking}
              className="h-8"
            >
              <RefreshCw className={checking ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
              চেক
            </Button>
          }
          last
        />
      )}

      <DataRow
        icon={Smartphone}
        label={`ভার্সন ${APP_VERSION}`}
        desc={
          swVersion
            ? `ক্যাশ ${swVersion.replace("abhyas-", "")} • প্ল্যাটফর্ম: ${native ? platform : "ওয়েব"}`
            : `প্ল্যাটফর্ম: ${native ? platform : "ওয়েব"}`
        }
        action={undefined}
        last
      />
    </Section>
  );
}
