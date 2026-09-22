"use client";

import { ShieldCheck } from "lucide-react";

/** Placeholder — full Control Center lands with the native guard plugins. */
export function GuardView() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="text-xl font-bold">নিয়ন্ত্রণ কেন্দ্র</h1>
      <p className="text-xs text-muted-foreground">অ্যাপ সময় ও সামগ্রী নিয়ন্ত্রণ</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={26} aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">এই অংশটি প্রস্তুত হচ্ছে…</p>
      </div>
    </div>
  );
}
