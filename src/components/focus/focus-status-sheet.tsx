"use client";

import { useEffect, useState } from "react";
import {
  AlarmClockOff,
  BellOff,
  CheckCircle2,
  Globe,
  Lock,
  MonitorSmartphone,
  PhoneOff,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalFooter,
} from "@/components/overlays/responsive-modal";
import { cn } from "@/lib/utils";
import { enterFullscreen, fullscreenSupported } from "@/lib/web-platform";
import {
  useFocusDndStore,
  formatDurationBn,
} from "@/stores/focus-dnd-store";

/* ------------------------------------------------------------------ */
/*  Small presentational atoms (keep every sheet visually identical)   */
/* ------------------------------------------------------------------ */

function IconTile({
  icon: Icon,
  tone = "islamic",
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "islamic" | "amber" | "muted";
}) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-2xl",
        tone === "islamic" && "bg-islamic/10 text-islamic",
        tone === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-5.5" aria-hidden />
    </span>
  );
}

function BlockedRow({
  icon: Icon,
  title,
  note,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note?: string;
  tone?: "amber";
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
      <Icon
        className={cn(
          "mt-0.5 size-4.5 shrink-0",
          tone === "amber"
            ? "text-amber-600 dark:text-amber-400"
            : "text-islamic"
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {note && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {note}
          </p>
        )}
      </div>
    </li>
  );
}

function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-islamic/10 text-[11px] font-bold text-islamic"
      >
        {BN_DIGITS[n]}
      </span>
      <p className="pt-0.5 text-sm leading-snug">{children}</p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet body variants                                                */
/* ------------------------------------------------------------------ */

function PermissionBody() {
  const requestAccess = useFocusDndStore((s) => s.requestAccess);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-islamic/20 bg-islamic/[0.05] p-4">
        <IconTile icon={ShieldCheck} />
        <p className="text-sm leading-relaxed">
          অভ্যাস Android-এর <strong>&quot;Do Not Disturb&quot;</strong> সিস্টেম
          ব্যবহার করে আপনার ইবাদত বা গভীর মনোযোগের সময় ফোনকে সম্পূর্ণ শান্ত
          রাখে — WhatsApp, Messenger, Facebook — সব অ্যাপের নোটিফিকেশন। এর
          জন্য একবার অনুমতি দিতে হবে।
        </p>
      </div>

      <ol className="space-y-2.5">
        <StepRow n={1}>নিচের বাটনে চাপ দিন — ফোনের সেটিংস খুলবে</StepRow>
        <StepRow n={2}>তালিকায় &quot;অভ্যাস&quot; অ্যাপটি খুঁজুন</StepRow>
        <StepRow n={3}>
          <strong>Do Not Disturb access</strong> অনুমতিটি চালু করুন
        </StepRow>
        <StepRow n={4}>অ্যাপে ফিরে এসে আবার ভাসমান বাটনে চাপুন</StepRow>
      </ol>

      <p className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        গোপনীয়তা: অ্যাপ কখনোই আপনার নোটিফিকেশন পড়তে পারে না — এই অনুমতি
        শুধু নোটিফিকেশন বন্ধ/চালু করার সুইচ হিসেবে কাজ করে।
      </p>

      <ResponsiveModalFooter>
        <Button variant="outline" onClick={() => useFocusDndStore.getState().closeSheet()}>
          পরে
        </Button>
        <Button
          className="bg-islamic text-islamic-foreground hover:bg-islamic/90"
          onClick={() => void requestAccess()}
        >
          অনুমতির সেটিংস খুলুন
        </Button>
      </ResponsiveModalFooter>
    </div>
  );
}

function StatusBody() {
  const active = useFocusDndStore((s) => s.active);
  const startedAt = useFocusDndStore((s) => s.startedAt);
  const busy = useFocusDndStore((s) => s.busy);
  const disable = useFocusDndStore((s) => s.disable);
  const platform = useFocusDndStore((s) => s.platform);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed =
    startedAt != null ? formatDurationBn(Math.max(0, now - startedAt)) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-islamic/20 bg-islamic/[0.05] p-5 text-center">
        <CheckCircle2 className="size-8 text-islamic" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">
          ফোকাস মোড চালু আছে
        </p>
        {elapsed ? (
          <p className="text-2xl font-extrabold tabular-nums text-islamic">
            {elapsed}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            (সিস্টেম থেকে চালু করা হয়েছে)
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {platform === "web" ? (
          <BlockedRow
            icon={MonitorSmartphone}
            title="ওয়েব ফোকাস সক্রিয়"
            note="ফুলস্ক্রিন ও স্ক্রিন-জাগা চালু। সম্পূর্ণ ফোন নিয়ন্ত্রণের জন্য Android অ্যাপ ব্যবহার করুন।"
          />
        ) : (
          <>
            <BlockedRow
              icon={BellOff}
              title="সব অ্যাপের নোটিফিকেশন বন্ধ"
              note="WhatsApp, Messenger, Facebook — সবকিছু নীরব।"
            />
            <BlockedRow
              icon={PhoneOff}
              title="কল ও মেসেজ সাইলেন্ট"
              note="রিং বাজবে না, স্ক্রিন জ্বলবে না।"
            />
            <BlockedRow
              icon={AlarmClockOff}
              tone="amber"
              title="অ্যালার্মও বন্ধ থাকবে"
              note="দরকারি অ্যালার্ম থাকলে বন্ধ করার আগে একবার দেখে নিন।"
            />
          </>
        )}
      </ul>

      {platform === "web" && fullscreenSupported() && !document.fullscreenElement && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void enterFullscreen()}
        >
          <MonitorSmartphone aria-hidden />
          আবার ফুলস্ক্রিনে যান
        </Button>
      )}

      <ResponsiveModalFooter>
        <Button
          variant="outline"
          onClick={() => useFocusDndStore.getState().closeSheet()}
        >
          ঠিক আছে
        </Button>
        <Button
          variant="destructive"
          disabled={busy || !active}
          onClick={() => void disable()}
        >
          ফোকাস বন্ধ করুন
        </Button>
      </ResponsiveModalFooter>
    </div>
  );
}

function InfoBody() {
  const platform = useFocusDndStore((s) => s.platform);
  const accessGranted = useFocusDndStore((s) => s.accessGranted);
  const busy = useFocusDndStore((s) => s.busy);
  const enable = useFocusDndStore((s) => s.enable);
  const openSheet = useFocusDndStore((s) => s.openSheet);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">
        কুরআন তিলাওয়াত, জিকির বা গভীর মনোযোগের যেকোনো কাজের সময় — ডানদিকের
        ভাসমান বাটনে এক চাপে ফোনের সব ডিস্ট্রাকশন বন্ধ করুন। যেকোনো পেজ থেকে।
      </p>

      <div className="grid gap-3">
        <div className="flex items-start gap-3 rounded-2xl border border-islamic/25 bg-islamic/[0.05] p-4">
          <IconTile icon={Smartphone} />
          <div>
            <p className="text-sm font-bold">Android অ্যাপ — সম্পূর্ণ নিয়ন্ত্রণ</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ফোনের সিস্টেম-লেভেল Do Not Disturb — সব অ্যাপের নোটিফিকেশন, কল
              ও রিং একদম বন্ধ।
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <IconTile icon={Globe} tone="muted" />
          <div>
            <p className="text-sm font-bold">ওয়েব — সীমিত ফোকাস</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ফুলস্ক্রিন ও স্ক্রিন-জাগা। ব্রাউজার অন্য অ্যাপের নোটিফিকেশন
              বন্ধ করতে পারে না — এটা অপারেটিং সিস্টেমের নিয়ম।
            </p>
          </div>
        </div>
      </div>

      <ResponsiveModalFooter>
        <Button
          variant="outline"
          onClick={() => useFocusDndStore.getState().closeSheet()}
        >
          বন্ধ করুন
        </Button>
        {platform === "web" ? (
          <Button
            className="bg-islamic text-islamic-foreground hover:bg-islamic/90"
            disabled={busy}
            onClick={() => {
              void enable();
              useFocusDndStore.getState().closeSheet();
            }}
          >
            ওয়েব ফোকাস চালু করুন
          </Button>
        ) : !accessGranted ? (
          <Button
            className="bg-islamic text-islamic-foreground hover:bg-islamic/90"
            onClick={() => openSheet("permission")}
          >
            অনুমতি দিন
          </Button>
        ) : (
          <Button
            className="bg-islamic text-islamic-foreground hover:bg-islamic/90"
            disabled={busy}
            onClick={() => {
              void enable();
              useFocusDndStore.getState().closeSheet();
            }}
          >
            ফোকাস চালু করুন
          </Button>
        )}
      </ResponsiveModalFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet shell — one ResponsiveModal, three bodies                    */
/* ------------------------------------------------------------------ */

const SHEET_META = {
  permission: {
    title: "ফোকাস মোডের অনুমতি",
    description: "ফোনের সব নোটিফিকেশন বন্ধ করার জন্য একবার অনুমতি দিতে হবে",
  },
  status: {
    title: "ফোকাস মোড",
    description: "এই মুহূর্তে যা যা বন্ধ আছে",
  },
  info: {
    title: "ফোকাস মোড কী?",
    description: "যেকোনো পেজ থেকে এক চাপে ফোনকে নীরব করুন",
  },
} as const;

export function FocusStatusSheet() {
  const sheet = useFocusDndStore((s) => s.sheet);
  const closeSheet = useFocusDndStore((s) => s.closeSheet);

  const kind = sheet ?? "info";
  const meta = SHEET_META[kind];

  return (
    <ResponsiveModal
      open={sheet != null}
      onOpenChange={(open) => {
        if (!open) closeSheet();
      }}
      title={meta.title}
      description={meta.description}
      size="sm"
    >
      {kind === "permission" ? (
        <PermissionBody />
      ) : kind === "status" ? (
        <StatusBody />
      ) : (
        <InfoBody />
      )}
    </ResponsiveModal>
  );
}
