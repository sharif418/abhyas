"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { DataRow, Section } from "./profile-shared";

/**
 * localStorage keys owned by client-side state that must be cleared on a
 * full reset, alongside the server-side wipe from POST /api/me/reset.
 */
const RESET_STORAGE_KEYS = [
  "abhyas-settings",
  "abhyas-perfect-day-fired",
  "abhyas-tasbih",
  "abhyas-onboarding-done",
];

/** ডেটা — export, onboarding reset and the destructive full reset. */
export function ProfileDataSection() {
  return (
    <Section title="ডেটা" icon={Database}>
      <DataRow
        icon={Download}
        label="JSON এক্সপোর্ট"
        desc="সম্পূর্ণ ডেটা JSON ফরম্যাটে"
        action={<ExportButton format="json" label="JSON" />}
      />
      <DataRow
        icon={FileSpreadsheet}
        label="CSV এক্সপোর্ট"
        desc="স্প্রেডশিটের জন্য CSV ফাইল"
        action={<ExportButton format="csv" label="CSV" />}
      />
      <DataRow
        icon={RotateCcw}
        label="অনবোর্ডিং রিসেট"
        desc="অনবোর্ডিং উইজার্ড পুনরায় দেখাবে"
        action={<ResetOnboardingButton />}
      />
      <DataRow
        icon={Trash2}
        label="সব রিসেট"
        desc="সমস্ত অভ্যাস ও ডেটা মুছবে"
        danger
        action={<ResetAllButton />}
        last
      />
    </Section>
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
      className="h-9"
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
      <Download size={14} aria-hidden /> {label}
    </Button>
  );
}

/**
 * ResetAllButton — REAL destructive reset (audit fix #1).
 *
 * The old implementation only cleared localStorage, so all server data
 * (habits, history, XP, badges) silently reappeared after the reload. Now it
 * POSTs to /api/me/reset (which deletes every user row and resets
 * XP/level/settings on the server), THEN clears the client-side keys, drops
 * every cached query and reloads — guarded by the unified destructive
 * ConfirmDialog so the copy finally matches what actually happens.
 */
function ResetAllButton() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const reset = useMutation({
    mutationFn: () => api.post("/api/me/reset"),
    onSuccess: () => {
      for (const key of RESET_STORAGE_KEYS) {
        try {
          localStorage.removeItem(key);
        } catch {
          // storage access can be blocked (private mode) — ignore
        }
      }
      qc.clear();
      toast.success("সব ডেটা রিসেট হয়েছে");
      setOpen(false);
      // small delay so the success toast is visible before the reload
      setTimeout(() => window.location.reload(), 600);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "রিসেট করা যায়নি");
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-destructive"
        onClick={() => setOpen(true)}
      >
        রিসেট
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        variant="destructive"
        title="সবকিছু মুছে ফেলবেন?"
        description="আপনার সমস্ত অভ্যাস, ইতিহাস, XP ও ব্যাজ স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যাবে না।"
        confirmLabel="মুছে ফেলুন"
        loading={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </>
  );
}

/** Reset onboarding button — clears the onboarding localStorage flag so
 *  the user sees the starter-habit picker again on next page load. */
function ResetOnboardingButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9"
      onClick={() => {
        localStorage.removeItem("abhyas-onboarding-done");
        toast.success("অনবোর্ডিং রিসেট হয়েছে", {
          description: "পেজ রিলোড হচ্ছে...",
        });
        setTimeout(() => window.location.reload(), 800);
      }}
    >
      রিসেট
    </Button>
  );
}
