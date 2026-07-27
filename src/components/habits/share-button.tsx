"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

interface ShareStats {
  name: string;
  currentStreak: number;
  bestStreak: number;
  totalDone: number;
  completionRate: number;
  isIslamic: boolean;
}

/**
 * Share button + modal — generates a shareable text summary of a habit's
 * progress. Supports WhatsApp share + copy-to-clipboard.
 */
export function ShareButton({ habitId }: { habitId: string }) {
  const [open, setOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const res = await api.get<{ text: string; stats: ShareStats }>(
        `/api/habits/${habitId}/share`
      );
      setShareText(res.text);
      setStats(res.stats);
    } catch {
      toast.error("শেয়ার টেক্সট তৈরিতে সমস্যা");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("কপি হয়েছে!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("কপি করতে সমস্যা");
    }
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={generate}
        title="শেয়ার করুন"
        aria-label="শেয়ার করুন"
      >
        <Share2 size={16} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <VisuallyHidden>
            <DialogTitle>অভ্যাস শেয়ার করুন</DialogTitle>
            <DialogDescription>
              আপনার অভ্যাসের অগ্রগতি শেয়ার করুন
            </DialogDescription>
          </VisuallyHidden>

          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Preview card */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-4">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative">
                  <div className="mb-2 text-[10px] font-medium text-muted-foreground">
                    📚 অভ্যাস অ্যাপ
                  </div>
                  <h3 className="text-base font-bold">{stats.name}</h3>
                  {stats.isIslamic && (
                    <span className="mt-0.5 inline-block rounded-full bg-islamic/10 px-2 py-0.5 text-[9px] font-bold text-islamic">
                      ইসলামিক অভ্যাস
                    </span>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-card/60 p-2 text-center">
                      <div className="tabular text-lg font-bold text-streak">
                        🔥 {toBn(stats.currentStreak)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        বর্তমান স্ট্রিক
                      </div>
                    </div>
                    <div className="rounded-xl bg-card/60 p-2 text-center">
                      <div className="tabular text-lg font-bold text-primary">
                        🏆 {toBn(stats.bestStreak)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        সেরা স্ট্রিক
                      </div>
                    </div>
                    <div className="rounded-xl bg-card/60 p-2 text-center">
                      <div className="tabular text-lg font-bold">
                        ✅ {toBn(stats.totalDone)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        মোট সম্পন্ন
                      </div>
                    </div>
                    <div className="rounded-xl bg-card/60 p-2 text-center">
                      <div className="tabular text-lg font-bold text-primary">
                        📊 {toBn(stats.completionRate)}%
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        সম্পন্নের হার
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share text preview */}
              <div className="rounded-xl bg-muted/40 p-3">
                <pre className="whitespace-pre-wrap font-sans text-[11px] leading-snug text-muted-foreground">
                  {shareText}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={shareWhatsApp}
                  className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#1da851]"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1 gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} /> কপি হয়েছে
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> কপি করুন
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function toBn(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
}
