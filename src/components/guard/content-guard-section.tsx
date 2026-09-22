"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Baby,
  Ban,
  Globe2,
  Plus,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/overlays/responsive-modal";
import { useContentGuard } from "@/hooks/use-guard";
import type { ContentFilterMode } from "@/lib/native/content-plugin";
import { GuardSection, WebFallback } from "./guard-shared";
import { cn } from "@/lib/utils";

const MODES: {
  key: ContentFilterMode;
  title: string;
  desc: string;
  icon: typeof Globe2;
  color: string;
}[] = [
  {
    key: "family",
    title: "পারিবারিক সুরক্ষা",
    desc: "পর্নোগ্রাফি ও প্রাপ্তবয়স্ক সামগ্রী আটকায় (CleanBrowsing Family)",
    icon: Baby,
    color: "#059669",
  },
  {
    key: "security",
    title: "নিরাপত্তা",
    desc: "ম্যালওয়্যার ও ফিশিং সাইট আটকায় (Quad9)",
    icon: ShieldCheck,
    color: "#0369a1",
  },
  {
    key: "ads",
    title: "বিজ্ঞাপন-মুক্ত",
    desc: "বিজ্ঞাপন ও ট্র্যাকার আটকায় (AdGuard DNS)",
    icon: Ban,
    color: "#b45309",
  },
  {
    key: "custom",
    title: "শুধু নিজের নিয়ম",
    desc: "নিচে যেসব সাইট দেবেন শুধু সেগুলোই আটকাবে",
    icon: Globe2,
    color: "#7c3aed",
  },
];

/**
 * ContentGuardSection — DNS-level content filtering. Master switch off =
 * completely disabled (hard requirement). Mode cards pick the upstream
 * resolver family; custom rules add always-block / always-allow domains.
 */
export function ContentGuardSection() {
  const guard = useContentGuard();
  const [rulesOpen, setRulesOpen] = useState(false);

  if (!guard.native) {
    return (
      <GuardSection title="সামগ্রী নিয়ন্ত্রণ" icon={ShieldX} id="content-guard">
        <WebFallback featureName="DNS-ভিত্তিক সামগ্রী নিয়ন্ত্রণ" />
      </GuardSection>
    );
  }

  const { status } = guard;

  return (
    <GuardSection
      title="সামগ্রী নিয়ন্ত্রণ"
      desc="DNS লেভেলে অনাকাঙ্ক্ষিত সাইট আটকানো — সব অ্যাপ-ব্রাউজারে একসাথে চলে"
      icon={status.running ? ShieldCheck : ShieldX}
      id="content-guard"
    >
      {/* Master switch + live stats */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            status.running ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {status.running ? <ShieldCheck className="size-5" aria-hidden /> : <ShieldX className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {status.running ? "সুরক্ষা চালু আছে" : "বন্ধ আছে"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {status.running
              ? `আজ ${toBn(status.blockedToday)}টি অনুরোধ আটকানো হয়েছে`
              : "যেকোনো মোড বেছে নিলেই চালু হবে"}
          </div>
        </div>
        {status.running && (
          <Button
            variant="outline"
            size="sm"
            disabled={guard.busy}
            onClick={() => void guard.stop()}
            className="h-8 shrink-0"
          >
            বন্ধ করুন
          </Button>
        )}
      </div>

      {guard.loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : status.running ? (
        <div className="p-4">
          <ActiveModeCard guard={guard} onRules={() => setRulesOpen(true)} />
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              disabled={guard.busy}
              onClick={() => void guard.start(m.key)}
              className="focus-visible:ring-ring/70 flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:border-primary/50 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${m.color}1a`, color: m.color }}
              >
                <m.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{m.title}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  {m.desc}
                </span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="focus-visible:ring-ring/70 w-full rounded-xl border border-dashed py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="mr-1 inline size-3.5" aria-hidden />
            নিজের ব্লক-লিস্ট / অ্যালাউ-লিস্ট সম্পাদনা
          </button>
        </div>
      )}

      <p className="border-t px-4 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
        প্রাইভেসি: ফিল্টার শুধু ডোমেইন নাম দেখে — HTTPS কন্টেন্ট কখনো পড়ে না, কোথাও পাঠানোও
        হয় না। যেকোনো সময় উপরের “বন্ধ করুন” থেকে সম্পূর্ণ বন্ধ করা যায়।
      </p>

      <RulesSheet open={rulesOpen} onOpenChange={setRulesOpen} guard={guard} />
    </GuardSection>
  );
}

function ActiveModeCard({
  guard,
  onRules,
}: {
  guard: ReturnType<typeof useContentGuard>;
  onRules: () => void;
}) {
  const mode = MODES.find((m) => m.key === guard.status.mode) ?? MODES[0];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${mode.color}1a`, color: mode.color }}
        >
          <mode.icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{mode.title}</p>
          <p className="text-[11px] text-muted-foreground">{mode.desc}</p>
        </div>
      </div>

      {/* Live-ish counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <motion.p
            key={guard.status.blockedToday}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="text-lg font-extrabold tabular-nums text-primary"
          >
            {toBn(guard.status.blockedToday)}
          </motion.p>
          <p className="text-[10px] text-muted-foreground">আটকানো অনুরোধ (আজ)</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-lg font-extrabold tabular-nums">{toBn(guard.status.totalToday)}</p>
          <p className="text-[10px] text-muted-foreground">মোট অনুরোধ (আজ)</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 font-semibold"
          onClick={onRules}
        >
          নিয়ম সম্পাদনা
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 font-semibold"
          disabled={guard.busy}
          onClick={() => void guard.start(mode.key)}
        >
          মোড বদলান
        </Button>
      </div>
    </div>
  );
}

function RulesSheet({
  open,
  onOpenChange,
  guard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guard: ReturnType<typeof useContentGuard>;
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="নিজের নিয়ম"
      description="ব্লক-লিস্টের সাইট সব মোডেই আটকাবে; অ্যালাউ-লিস্টের সাইট কখনো আটকাবে না"
      size="sm"
    >
      {open ? (
        <RulesSheetBody
          key="rules"
          guard={guard}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveModal>
  );
}

function RulesSheetBody({
  guard,
  onDone,
}: {
  guard: ReturnType<typeof useContentGuard>;
  onDone: () => void;
}) {
  const [blockInput, setBlockInput] = useState("");
  const [allowInput, setAllowInput] = useState("");
  // Drafts start from the persisted native rules (loaded async on mount).
  const [blockList, setBlockList] = useState<string[] | null>(null);
  const [allowList, setAllowList] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void guard.loadRules().then((r) => {
      if (cancelled) return;
      setBlockList(r.block);
      setAllowList(r.allow);
    });
    return () => {
      cancelled = true;
    };
     
  }, []);

  const addBlock = () => {
    const d = blockInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d || blockList?.includes(d)) return;
    setBlockList([...(blockList ?? []), d]);
    setBlockInput("");
  };

  const addAllow = () => {
    const d = allowInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d || allowList.includes(d)) return;
    setAllowList([...allowList, d]);
    setAllowInput("");
  };

  const save = async () => {
    await guard.setRules({ block: blockList ?? [], allow: allowList });
    onDone();
  };

  if (blockList === null) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <label className="mb-1 block text-xs font-semibold" htmlFor="block-domain">
        ব্লক করুন (যেমন: facebook.com)
      </label>
      <div className="flex gap-2">
        <Input
          id="block-domain"
          value={blockInput}
          onChange={(e) => setBlockInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addBlock()}
          placeholder="example.com"
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={addBlock} aria-label="ব্লক-লিস্টে যোগ করুন">
          <Plus className="size-4" aria-hidden />
        </Button>
      </div>
      <DomainChips list={blockList} onRemove={(d) => setBlockList(blockList.filter((x) => x !== d))} tone="destructive" />

      <label className="mb-1 mt-4 block text-xs font-semibold" htmlFor="allow-domain">
        কখনো আটকাবে না (যেমন: yourbank.com)
      </label>
      <div className="flex gap-2">
        <Input
          id="allow-domain"
          value={allowInput}
          onChange={(e) => setAllowInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAllow()}
          placeholder="example.com"
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={addAllow} aria-label="অ্যালাউ-লিস্টে যোগ করুন">
          <Plus className="size-4" aria-hidden />
        </Button>
      </div>
      <DomainChips list={allowList} onRemove={(d) => setAllowList(allowList.filter((x) => x !== d))} tone="primary" />

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          বাতিল
        </Button>
        <Button size="sm" onClick={() => void save()} className="font-bold">
          সেভ করুন
        </Button>
      </div>
    </>
  );
}

function DomainChips({
  list,
  onRemove,
  tone,
}: {
  list: string[];
  onRemove: (domain: string) => void;
  tone: "destructive" | "primary";
}) {
  if (list.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map((d) => (
        <span
          key={d}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          {d}
          <button
            type="button"
            onClick={() => onRemove(d)}
            aria-label={`${d} সরান`}
            className="focus-visible:ring-ring/70 rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <Trash2 className="size-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
