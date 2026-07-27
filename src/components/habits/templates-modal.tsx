"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { TEMPLATE_BUNDLES, type TemplateBundle } from "@/constants/template-bundles";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Habit Templates Library modal.
 * Browse curated bundles and install one in a tap.
 */
export function TemplatesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [selected, setSelected] = useState<TemplateBundle | null>(null);
  const [installing, setInstalling] = useState(false);
  const qc = useQueryClient();

  const install = async (bundle: TemplateBundle) => {
    setInstalling(true);
    try {
      await api.post("/api/habits/templates", { bundleId: bundle.id });
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`"${bundle.name}" যোগ হয়েছে!`, {
        description: `${bundle.habits.length} টি অভ্যাস যোগ করা হয়েছে।`,
      });
      onOpenChange(false);
      setSelected(null);
    } catch {
      toast.error("ইনস্টল করতে সমস্যা হয়েছে");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>অভ্যাস টেমপ্লেট লাইব্রেরি</DialogTitle>
          <DialogDescription>
            প্রস্তুত অভ্যাস বান্ডেল এক ট্যাপে যোগ করুন
          </DialogDescription>
        </VisuallyHidden>

        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h2 className="text-lg font-bold">টেমপ্লেট লাইব্রেরি</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            প্রস্তুত অভ্যাস বান্ডেল বেছে নিন
          </p>
        </div>

        <div className="fancy-scroll max-h-[70vh] overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {TEMPLATE_BUNDLES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 text-left transition hover:shadow-md",
                      b.gradient
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-2xl">{b.emoji}</span>
                      <span className="font-bold">{b.name}</span>
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {b.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-medium">
                        {b.habits.length} টি অভ্যাস
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground transition group-hover:translate-x-0.5"
                      />
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => setSelected(null)}
                  className="mb-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  ← সব টেমপ্লেট
                </button>
                <div
                  className={cn(
                    "mb-4 overflow-hidden rounded-2xl border bg-gradient-to-br p-4",
                    selected.gradient
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{selected.emoji}</span>
                    <div>
                      <h3 className="text-lg font-bold">{selected.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selected.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 text-xs font-medium text-muted-foreground">
                  যোগ হবে এই অভ্যাসগুলো:
                </div>
                <div className="space-y-2">
                  {selected.habits.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ background: h.color }}
                      >
                        <IconRenderer name={h.icon} size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">
                            {h.name}
                          </span>
                          {h.isIslamic && (
                            <span className="rounded-full bg-islamic/10 px-1 py-0.5 text-[8px] font-bold text-islamic">
                              ইসলামিক
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {h.timeOfDay} • {h.frequency}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  className="mt-4 w-full"
                  size="lg"
                  onClick={() => install(selected)}
                  disabled={installing}
                >
                  {installing ? (
                    "যোগ হচ্ছে..."
                  ) : (
                    <>
                      <Check size={16} /> {selected.habits.length} টি অভ্যাস যোগ করুন
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
