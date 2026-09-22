"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { APP_VERSION } from "@/constants/app";
import type { Habit } from "@/types";
import { Button } from "@/components/ui/button";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import { FOCUS_RING, Section } from "./profile-shared";

/** অ্যাবাউট — brand card + version. */
export function ProfileAboutSection() {
  return (
    <Section title="অ্যাবাউট" icon={Info}>
      <div className="p-3 text-sm">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-600 text-primary-foreground">
            অ
          </span>
          অভ্যাস
        </div>
        <p className="text-xs text-muted-foreground">
          বাংলাদেশের ব্যবহারকারীদের জন্য সম্পূর্ণ বাংলা স্বশাসন ও অভ্যাস ট্র্যাকিং অ্যাপ।
          নামাজ, কুরআন, স্ট্রিক ও গেমিফিকেশন সহ।
        </p>
        <div className="mt-2 text-[10px] text-muted-foreground">ভার্সন {APP_VERSION}</div>
      </div>
    </Section>
  );
}

/** Archived habits section — list and restore soft-deleted habits. */
export function ProfileArchiveSection() {
  const [expanded, setExpanded] = useState(false);
  const { data: archived, refetch, isLoading } = useQuery<Habit[]>({
    queryKey: ["archived-habits"],
    // audit fix #6: properly typed (was any[])
    queryFn: () => api.get<Habit[]>("/api/habits/archive"),
    enabled: false, // only fetch when expanded
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.post("/api/habits/archive", { id }),
    onSuccess: () => {
      toast.success("অভ্যাস ফিরিয়ে আনা হয়েছে");
      refetch();
    },
    onError: () => {
      toast.error("অভ্যাস ফিরিয়ে আনা যায়নি");
    },
  });

  const handleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded) refetch();
  };

  return (
    <Section title="আর্কাইভ" icon={Archive}>
      <div className="p-4">
        <button
          onClick={handleExpand}
          aria-expanded={expanded}
          className={cn(
            "flex w-full items-center justify-between rounded-lg text-sm font-medium",
            FOCUS_RING
          )}
        >
          <span>মুছে ফেলা অভ্যাসসমূহ</span>
          {expanded ? (
            <ChevronUp size={16} className="text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" aria-hidden />
          )}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                লোড হচ্ছে...
              </div>
            ) : !archived || archived.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
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
                    className="h-9 px-3 text-[11px]"
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

/** অ্যাকাউন্ট — auth state (login/logout). */
export function ProfileAccountSection() {
  const { data: session } = useSession();

  return (
    <Section title="অ্যাকাউন্ট" icon={ShieldCheck}>
      <div className="p-4">
        {session?.user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-emerald-500" aria-hidden />
              <span>
                লগইন করা: <strong>{session.user.email}</strong>
              </span>
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
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              লগইন / নিবন্ধন
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
