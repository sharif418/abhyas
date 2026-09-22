"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ACCENT_PRESETS } from "@/constants";
import { useSettingsStore } from "@/stores/settings-store";
import { useThemeManager } from "@/hooks/use-theme-manager";
import { cn } from "@/lib/utils";
import { FOCUS_RING, Section } from "./profile-shared";

const THEMES: { value: "light" | "dark" | "system"; icon: LucideIcon; label: string }[] = [
  { value: "light", icon: Sun, label: "লাইট" },
  { value: "dark", icon: Moon, label: "ডার্ক" },
  { value: "system", icon: Monitor, label: "সিস্টেম" },
];

const WEEK_STARTS: { value: 0 | 6; label: string; hint: string }[] = [
  { value: 6, label: "শনিবার", hint: "বাংলাদেশ" },
  { value: 0, label: "রবিবার", hint: "আন্তর্জাতিক" },
];

/** রূপ ও থিম — theme, accent color and the day a week starts on. */
export function ProfileAppearanceSection() {
  const settings = useSettingsStore();
  const { theme, setTheme } = useThemeManager();

  return (
    <Section title="রূপ ও থিম" icon={Palette} padded>
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">থিম</div>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <ThemeBtn
                key={t.value}
                active={theme === t.value}
                onClick={() => setTheme(t.value)}
                icon={t.icon}
                label={t.label}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">অ্যাকসেন্ট রঙ</div>
          <div className="flex flex-wrap gap-2 pb-1">
            {ACCENT_PRESETS.map((c) => {
              const active = settings.accent === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => settings.setAccent(c.value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition",
                    FOCUS_RING,
                    active && "ring-2 ring-offset-2 ring-offset-background"
                  )}
                  style={{
                    background: c.value,
                    boxShadow: active ? `0 0 0 2px ${c.value}` : undefined,
                  }}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={active}
                >
                  {active && <Check size={14} className="text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">সপ্তাহ শুরু</div>
          <div className="grid grid-cols-2 gap-2">
            {WEEK_STARTS.map((ws) => {
              const active = settings.weekStartsOn === ws.value;
              return (
                <button
                  key={ws.value}
                  onClick={() => settings.setWeekStartsOn(ws.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-baseline justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition",
                    FOCUS_RING,
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:border-foreground/20"
                  )}
                >
                  {ws.label}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {ws.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

function ThemeBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition",
        FOCUS_RING,
        active
          ? "border-primary bg-primary/5 text-primary"
          : "text-muted-foreground hover:border-foreground/20"
      )}
    >
      <Icon size={16} aria-hidden />
      {label}
    </button>
  );
}
