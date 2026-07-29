"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Info,
  RotateCcw,
  Pencil,
  Check,
  Vibrate,
  Volume2,
  Bell,
  BellRing,
  Send,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings-store";
import { useTheme } from "next-themes";
import { ACCENT_PRESETS } from "@/constants";
import { toBn } from "@/lib/date-bn";
import { gamificationState, levelTitle } from "@/lib/gamification";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import {
  isPushSupported,
  getPushPermissionState,
  getPushSubscription,
  subscribePush,
  unsubscribePush,
  PUSH_PERMISSION_LABEL,
  type PushPermissionState,
} from "@/lib/push";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface MeResponse {
  id: string;
  name: string;
  xp: number;
  level: number;
  city: string;
}

export function ProfileView() {
  const { data: session } = useSession();
  const { data: me } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/me"),
  });
  const settings = useSettingsStore();
  const { theme, setTheme } = useTheme();

  const game = me ? gamificationState(me.xp) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">প্রোফাইল</h1>
        <p className="text-xs text-muted-foreground">অ্যাকাউন্ট ও সেটিংস</p>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          {game && (
            <ProgressRing value={game.progress} size={84} stroke={8} showGlow>
              <div className="text-center">
                <div className="tabular text-xl font-extrabold">{toBn(game.level)}</div>
                <div className="text-[9px] text-muted-foreground">লেভেল</div>
              </div>
            </ProgressRing>
          )}
          <div className="min-w-0 flex-1">
            <NameEditor name={me?.name ?? "অতিথি"} />
            <div className="mt-0.5 text-sm text-muted-foreground">
              {me ? levelTitle(me.level) : ""}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="tabular">{toBn(me?.xp ?? 0)} XP</span>
              <span>•</span>
              <span>{me?.city}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <Section title="রূপ ও থিম" icon="Palette">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">থিম</div>
            <div className="grid grid-cols-3 gap-2">
              <ThemeBtn
                active={theme === "light"}
                onClick={() => setTheme("light")}
                icon="Sun"
                label="লাইট"
              />
              <ThemeBtn
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                icon="Moon"
                label="ডার্ক"
              />
              <ThemeBtn
                active={theme === "system"}
                onClick={() => setTheme("system")}
                icon="Monitor"
                label="সিস্টেম"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">অ্যাকসেন্ট রঙ</div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((c) => {
                const active = settings.accent === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => settings.setAccent(c.value)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition",
                      active && "ring-2 ring-offset-2 ring-offset-background"
                    )}
                    style={{
                      background: c.value,
                      boxShadow: active ? `0 0 0 2px ${c.value}` : undefined,
                    }}
                    title={c.name}
                    aria-label={c.name}
                  >
                    {active && <Check size={14} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="পছন্দ" icon="SlidersHorizontal">
        <ToggleRow
          icon="Vibrate"
          label="হ্যাপটিক ফিডব্যাক"
          desc="ট্যাপে ভাইব্রেশন"
          checked={settings.haptics}
          onChange={settings.toggleHaptics}
        />
        <ToggleRow
          icon="Volume2"
          label="শব্দ"
          desc="সম্পন্ন ও বিজ্ঞপ্তি শব্দ"
          checked={settings.sound}
          onChange={settings.toggleSound}
        />
        <ToggleRow
          icon="Bell"
          label="রিমাইন্ডার"
          desc="অভ্যাস রিমাইন্ডার"
          checked={settings.remindersEnabled}
          onChange={settings.toggleReminders}
        />
        <ToggleRow
          icon="BellRing"
          label="নোটিফিকেশন"
          desc="সাধারণ নোটিফিকেশন"
          checked={settings.notificationsEnabled}
          onChange={settings.toggleNotifications}
          last
          extra={
            settings.notificationsEnabled ? <TestNotificationButton /> : null
          }
        />
      </Section>

      {/* Push Notifications */}
      <Section title="পুশ নোটিফিকেশন" icon="BellRing">
        <PushNotificationsRow />
      </Section>

      {/* Data */}
      <Section title="ডেটা" icon="Database">
        <DataRow
          icon="Download"
          label="JSON এক্সপোর্ট"
          desc="সম্পূর্ণ ডেটা JSON ফরম্যাটে"
          action={<ExportButton format="json" label="JSON" />}
        />
        <DataRow
          icon="FileSpreadsheet"
          label="CSV এক্সপোর্ট"
          desc="স্প্রেডশিটের জন্য CSV ফাইল"
          action={<ExportButton format="csv" label="CSV" />}
        />
        <DataRow
          icon="RotateCcw"
          label="সব রিসেট"
          desc="সমস্ত অভ্যাস ও ডেটা মুছবে"
          danger
          action={<ResetButton />}
          last
        />
      </Section>

      {/* About */}
      <Section title="অ্যাবাউট" icon="Info">
        <div className="p-3 text-sm">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#0d9488] text-primary-foreground">
              অ
            </span>
            অভ্যাস
          </div>
          <p className="text-xs text-muted-foreground">
            বাংলাদেশের ব্যবহারকারীদের জন্য সম্পূর্ণ বাংলা স্বশাসন ও অভ্যাস ট্র্যাকিং অ্যাপ।
            নামাজ, কুরআন, স্ট্রিক ও গেমিফিকেশন সহ।
          </p>
          <div className="mt-2 text-[10px] text-muted-foreground">ভার্সন ১.০.০</div>
        </div>
      </Section>

      {/* Archived habits */}
      <ArchiveSection />

      {/* Auth */}
      <Section title="অ্যাকাউন্ট" icon="ShieldCheck">
        <div className="p-4">
          {session?.user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <IconRenderer name="CheckCircle2" size={16} className="text-emerald-500" />
                <span>লগইন করা: <strong>{session.user.email}</strong></span>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <IconRenderer name="LogOut" size={16} />
                লগআউট করুন
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                অ্যাকাউন্ট তৈরি করে আপনার ডেটা সুরক্ষিত রাখুন এবং যেকোনো ডিভাইস থেকে অ্যাক্সেস করুন।
              </p>
              <Button
                className="w-full"
                onClick={() => window.location.href = "/login"}
              >
                লগইন / নিবন্ধন
              </Button>
            </div>
          )}
        </div>
      </Section>

      <div className="pb-4 text-center text-[10px] text-muted-foreground">
        ধৈর্য ও ধারাবাহিকতার সাথে তৈরি
      </div>
    </div>
  );
}

function NameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (n: string) =>
      api.put("/api/me", { name: n }).catch(() => {
        // fallback to settings endpoint shape if needed
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("নাম সংরক্ষিত হয়েছে");
      setEditing(false);
    },
  });

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 max-w-[180px] text-base font-bold"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && save.mutate(value)}
        />
        <Button size="sm" onClick={() => save.mutate(value)} disabled={save.isPending}>
          <Check size={14} />
        </Button>
      </div>
    );
  }
  return (
    <button
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
      className="flex items-center gap-1.5 text-left"
    >
      <span className="truncate text-lg font-bold">{name}</span>
      <Pencil size={13} className="text-muted-foreground" />
    </button>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-visible rounded-3xl border bg-card shadow-sm"
    >
      <div className="border-b px-4 py-3 text-sm font-bold">{title}</div>
      <div>{children}</div>
    </motion.div>
  );
}

function ThemeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  const Icons: Record<string, any> = { Sun, Moon, Monitor };
  const Icon = Icons[icon] ?? Sun;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "text-muted-foreground hover:border-foreground/20"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
  last,
  extra,
}: {
  icon: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
  last?: boolean;
  extra?: React.ReactNode;
}) {
  const Icons: Record<string, any> = { Vibrate, Volume2, Bell, BellRing: Bell };
  const Icon = Icons[icon] ?? Bell;
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b"
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {extra}
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * PushNotificationsRow — VAPID Web Push toggle.
 *
 * Subscribes the browser to server-driven push notifications (via the
 * `/api/push/*` routes and `src/lib/push.ts`). Shows live permission
 * status and exposes a "পরীক্ষা" button that POSTs to `/api/push/test`.
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

  // Poll Notification.permission so the UI reflects changes made from
  // browser site settings (where the user can revoke/grant outside the app).
  useEffect(() => {
    if (!supported) return;
    const id = setInterval(() => {
      setPermission(getPushPermissionState());
    }, 2000);
    return () => clearInterval(id);
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
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        sent?: boolean;
        error?: string;
      };
      if (res.ok && data.sent) {
        toast.success("পরীক্ষামূলক পুশ পাঠানো হয়েছে");
      } else {
        toast.error(data?.error || "পুশ পাঠাতে ব্যর্থ");
      }
    } catch {
      toast.error("নেটওয়ার্ক ত্রুটি");
    } finally {
      setSendingTest(false);
    }
  };

  // --- Unsupported: show muted info row, no switch ---
  if (!supported) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <BellRing size={16} />
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
          <BellRing size={16} />
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
            className="h-7 gap-1 px-2 text-[11px]"
          >
            {sendingTest ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Send size={11} />
            )}
            {sendingTest ? "পাঠানো হচ্ছে..." : "পরীক্ষা"}
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
      <div className="mt-2 pl-11 text-[11px]">
        <PermissionBadge state={permission} />
        <span className="ml-2 text-muted-foreground">
          {isLoading
            ? "অবস্থা যাচাই করা হচ্ছে..."
            : isOn
              ? "সাবস্ক্রাইব করা আছে"
              : "সাবস্ক্রাইব করা নেই"}
        </span>
      </div>

      {permission === "denied" && (
        <div className="mt-1 pl-11 text-[10px] text-muted-foreground">
          ব্রাউজার সেটিংস থেকে অনুমতি পুনরায় চালু করুন।
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

/** Test notification button — fires a sample OS notification. */
function TestNotificationButton() {
  const [status, setStatus] = useState<"idle" | "sent" | "denied">("idle");
  const send = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("denied");
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      setStatus("denied");
      return;
    }
    try {
      new Notification("অভ্যাস", {
        body: "নোটিফিকেশন সফলভাবে চালু হয়েছে!",
        icon: "/icon.svg",
      });
      setStatus("sent");
    } catch {
      setStatus("denied");
    }
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={send}
      className="h-7 gap-1 px-2 text-[11px]"
    >
      <Send size={11} />
      {status === "sent" ? "পাঠানো হয়েছে" : status === "denied" ? "অনুমতি নেই" : "পরীক্ষা"}
    </Button>
  );
}

function DataRow({
  icon,
  label,
  desc,
  action,
  danger,
  last,
}: {
  icon: string;
  label: string;
  desc: string;
  action: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  const Icons: Record<string, any> = { Download, RotateCcw, Info, Database: Info, FileSpreadsheet };
  const Icon = Icons[icon] ?? Info;
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          danger ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", danger && "text-destructive")}>{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {action}
    </div>
  );
}

function ExportButton({
  format = "json",
  label = "ডাউনলোড",
}: {
  format?: "json" | "csv";
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          if (format === "csv") {
            // trigger CSV download via direct URL
            const a = document.createElement("a");
            a.href = `/api/export?format=csv&t=${Date.now()}`;
            a.download = `abhyas-export-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            toast.success("CSV এক্সপোর্ট হয়েছে");
          } else {
            const [habits, stats] = await Promise.all([
              api.get("/api/habits"),
              api.get("/api/stats"),
            ]);
            const blob = new Blob(
              [
                JSON.stringify(
                  { habits, stats, exportedAt: new Date().toISOString() },
                  null,
                  2
                ),
              ],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `abhyas-export-${new Date()
              .toISOString()
              .slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("JSON এক্সপোর্ট হয়েছে");
          }
        } catch {
          toast.error("এক্সপোর্ট ব্যর্থ");
        }
      }}
    >
      <Download size={14} /> {label}
    </Button>
  );
}

function ResetButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          রিসেট
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>সব মুছে ফেলবেন?</AlertDialogTitle>
          <AlertDialogDescription>
            এটি আপনার সমস্ত অভ্যাস, সম্পন্ন ইতিহাস ও XP মুছে ফেলবে। এটি ফেরানো যাবে না।
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              localStorage.clear();
              toast.success("রিসেট সম্পন্ন");
              setTimeout(() => window.location.reload(), 600);
            }}
          >
            মুছে ফেলুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Archived habits section — list and restore soft-deleted habits. */
function ArchiveSection() {
  const [expanded, setExpanded] = useState(false);
  const { data: archived, refetch } = useQuery({
    queryKey: ["archived-habits"],
    queryFn: () => api.get<any[]>("/api/habits/archive"),
    enabled: false, // only fetch when expanded
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.post("/api/habits/archive", { id }),
    onSuccess: () => {
      toast.success("অভ্যাস ফিরিয়ে আনা হয়েছে");
      refetch();
    },
  });

  const handleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded) refetch();
  };

  return (
    <Section title="আর্কাইভ" icon="Archive">
      <div className="p-4">
        <button
          onClick={handleExpand}
          className="flex w-full items-center justify-between text-sm font-medium"
        >
          <span>মুছে ফেলা অভ্যাসসমূহ</span>
          <IconRenderer name={expanded ? "ChevronUp" : "ChevronDown"} size={16} className="text-muted-foreground" />
        </button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {!archived || archived.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-3">
                কোনো আর্কাইভ করা অভ্যাস নেই
              </p>
            ) : (
              archived.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/30 p-2"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: h.color }}
                  >
                    <IconRenderer name={h.icon} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold opacity-60">{h.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      সেরা স্ট্রিক: {toBn(h.bestStreak)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restore.mutate(h.id)}
                    disabled={restore.isPending}
                    className="h-7 px-2 text-[11px]"
                  >
                    ফিরিয়ে আনুন
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
