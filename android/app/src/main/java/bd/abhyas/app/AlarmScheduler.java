package bd.abhyas.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Calendar;
import java.util.List;

/**
 * AlarmScheduler — the AlarmManager muscle of the native alarm engine.
 *
 * Scheduling policy:
 *   • Android 12+ with exact-alarm special access (or 13+ where
 *     USE_EXACT_ALARM auto-grants) → setExactAndAllowWhileIdle: the alarm
 *     fires at the EXACT second even in Doze / battery-saver deep sleep.
 *   • Without the special access → setAndAllowWhileIdle (inexact window,
 *     typically still within minutes) — honest degradation, never silence.
 *   • Below Android 12 → setExactAndAllowWhileIdle needs no special access.
 *
 * Every alarm carries its full payload as Intent extras, so the receiver
 * never depends on the store being fresh at fire time. Deterministic ids
 * (`prayer-{key}-{date}`, `habit-{id}-{date}`) make regeneration replace
 * cleanly (same PendingIntent request code → same alarm slot).
 */
public final class AlarmScheduler {

    private AlarmScheduler() {
        // static utility
    }

    public static final String ACTION_ALARM = "bd.abhyas.app.action.ALARM";
    public static final String ACTION_RESTORE_DND = "bd.abhyas.app.action.RESTORE_DND";

    private static final String EXTRA_PREFIX = "bd.abhyas.app.extra.";

    // =========================================================================
    // Core scheduling primitives
    // =========================================================================

    private static AlarmManager alarmManager(Context ctx) {
        return (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    }

    /** Exact-alarm special access granted? (auto-true on API 33+ via
     *  USE_EXACT_ALARM; checked at runtime so revocation is respected). */
    public static boolean canScheduleExact(Context ctx) {
        if (Build.VERSION.SDK_INT < 31) return true;
        try {
            return alarmManager(ctx).canScheduleExactAlarms();
        } catch (Exception e) {
            return false;
        }
    }

    private static void setAlarm(Context ctx, long atEpochMs, PendingIntent pi) {
        AlarmManager am = alarmManager(ctx);
        if (am == null) return;
        try {
            if (canScheduleExact(ctx)) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atEpochMs, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atEpochMs, pi);
            }
        } catch (SecurityException e) {
            // Exact access revoked between check and set — fall back inexact.
            try {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atEpochMs, pi);
            } catch (Exception ignored) {
                // nothing more we can do
            }
        } catch (Exception ignored) {
            // clock/vendor quirks never crash the engine
        }
    }

    private static PendingIntent alarmPendingIntent(Context ctx, AlarmStore.Spec spec) {
        Intent intent = new Intent(ctx, AlarmReceiver.class);
        intent.setAction(ACTION_ALARM);
        putSpecExtras(intent, spec);
        return PendingIntent.getBroadcast(
                ctx,
                spec.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void putSpecExtras(Intent intent, AlarmStore.Spec spec) {
        intent.putExtra(EXTRA_PREFIX + "id", spec.id);
        intent.putExtra(EXTRA_PREFIX + "kind", spec.kind);
        intent.putExtra(EXTRA_PREFIX + "at", spec.at);
        intent.putExtra(EXTRA_PREFIX + "title", spec.title);
        intent.putExtra(EXTRA_PREFIX + "body", spec.body);
        intent.putExtra(EXTRA_PREFIX + "channel", spec.channel);
        if (spec.prayerKey != null) intent.putExtra(EXTRA_PREFIX + "prayerKey", spec.prayerKey);
        if (spec.prayerDate != null) intent.putExtra(EXTRA_PREFIX + "prayerDate", spec.prayerDate);
        if (spec.habitId != null) intent.putExtra(EXTRA_PREFIX + "habitId", spec.habitId);
        if (spec.habitDate != null) intent.putExtra(EXTRA_PREFIX + "habitDate", spec.habitDate);
        intent.putExtra(EXTRA_PREFIX + "streak", spec.streak);
    }

    static AlarmStore.Spec specFromExtras(Intent intent) {
        AlarmStore.Spec s = new AlarmStore.Spec();
        s.id = intent.getStringExtra(EXTRA_PREFIX + "id");
        s.kind = intent.getStringExtra(EXTRA_PREFIX + "kind");
        s.at = intent.getLongExtra(EXTRA_PREFIX + "at", 0L);
        s.title = intent.getStringExtra(EXTRA_PREFIX + "title");
        s.body = intent.getStringExtra(EXTRA_PREFIX + "body");
        s.channel = intent.getStringExtra(EXTRA_PREFIX + "channel");
        s.prayerKey = intent.getStringExtra(EXTRA_PREFIX + "prayerKey");
        s.prayerDate = intent.getStringExtra(EXTRA_PREFIX + "prayerDate");
        s.habitId = intent.getStringExtra(EXTRA_PREFIX + "habitId");
        s.habitDate = intent.getStringExtra(EXTRA_PREFIX + "habitDate");
        s.streak = intent.getIntExtra(EXTRA_PREFIX + "streak", 0);
        if (s.id == null) s.id = "unknown";
        if (s.kind == null) s.kind = "habit";
        if (s.title == null) s.title = "অভ্যাস";
        if (s.body == null) s.body = "";
        if (s.channel == null) s.channel = "habits";
        return s;
    }

    /** Schedule one spec (future-only; past times are skipped silently). */
    public static void schedule(Context ctx, AlarmStore.Spec spec) {
        long now = System.currentTimeMillis();
        if (spec.at <= now) return; // never ring for a missed window
        setAlarm(ctx, spec.at, alarmPendingIntent(ctx, spec));
    }

    /** Cancel one alarm by its deterministic id. */
    public static void cancel(Context ctx, String id) {
        Intent intent = new Intent(ctx, AlarmReceiver.class);
        intent.setAction(ACTION_ALARM);
        try {
            PendingIntent pi = PendingIntent.getBroadcast(
                    ctx,
                    id.hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager(ctx).cancel(pi);
        } catch (Exception ignored) {
            // cancel must never crash
        }
    }

    // =========================================================================
    // DND auto-restore (prayer auto-silence / focus notification action)
    // =========================================================================

    /** One-shot alarm that restores DND after N minutes. */
    public static void scheduleDndRestore(Context ctx, int minutes) {
        Intent intent = new Intent(ctx, AlarmReceiver.class);
        intent.setAction(ACTION_RESTORE_DND);
        try {
            PendingIntent pi = PendingIntent.getBroadcast(
                    ctx,
                    "dnd-restore".hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            setAlarm(ctx, System.currentTimeMillis() + minutes * 60_000L, pi);
        } catch (Exception ignored) {
            // never crash
        }
    }

    public static void cancelDndRestore(Context ctx) {
        Intent intent = new Intent(ctx, AlarmReceiver.class);
        intent.setAction(ACTION_RESTORE_DND);
        try {
            PendingIntent pi = PendingIntent.getBroadcast(
                    ctx,
                    "dnd-restore".hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager(ctx).cancel(pi);
        } catch (Exception ignored) {
            // never crash
        }
    }

    // =========================================================================
    // Prayer alarms — generated natively, self-sustaining offline
    // =========================================================================

    /**
     * (Re)schedules the full prayer horizon (today … horizonDays ahead).
     * Day 0 uses the embedded authoritative server times when their date
     * still matches; every other day is computed offline by
     * PrayerTimesCalc. Existing prayer alarms are replaced deterministically
     * (stable ids + PendingIntent request codes).
     *
     * @return number of alarms actually scheduled (future only).
     */
    public static int schedulePrayerAlarms(Context ctx, AlarmStore.PrayerConfig cfg) {
        if (cfg == null || cfg.prayers.isEmpty()) return 0;

        int scheduled = 0;
        Calendar day = Calendar.getInstance();
        for (int offset = 0; offset < Math.max(1, cfg.horizonDays); offset++) {
            Calendar d = (Calendar) day.clone();
            d.add(Calendar.DAY_OF_YEAR, offset);
            int y = d.get(Calendar.YEAR);
            int m = d.get(Calendar.MONTH) + 1;
            int dd = d.get(Calendar.DAY_OF_MONTH);
            String dateKey = String.format(java.util.Locale.US, "%04d-%02d-%02d", y, m, dd);

            for (String key : cfg.prayers) {
                String hhmm = timeFor(cfg, key, y, m, dd, dateKey);
                if (hhmm == null) continue;

                int atMin = toMinutes(hhmm) - cfg.offsetMin;
                long at = epochFor(y, m, dd, atMin);
                if (at <= System.currentTimeMillis()) continue;

                AlarmStore.Spec spec = buildPrayerSpec(cfg, key, dateKey, hhmm, atMin, at);
                setAlarm(ctx, at, alarmPendingIntent(ctx, spec));
                scheduled++;
            }
        }
        return scheduled;
    }

    /** Server time for today when valid, else the offline calculation. */
    private static String timeFor(AlarmStore.PrayerConfig cfg, String key,
                                  int y, int m, int d, String dateKey) {
        String today = cfg.todayTime(key);
        if (today != null && today.length() >= 4 && dateKey.equals(cfg.todayDate)) {
            return today;
        }
        int min = PrayerTimesCalc.minutesOfDay(key, y, m, d, cfg.lat, cfg.lng);
        return min < 0 ? null : PrayerTimesCalc.minutesToHHmm(min);
    }

    private static AlarmStore.Spec buildPrayerSpec(AlarmStore.PrayerConfig cfg, String key,
                                                   String dateKey, String hhmm,
                                                   int atMin, long at) {
        AlarmStore.Spec s = new AlarmStore.Spec();
        s.id = "prayer-" + key + "-" + dateKey;
        s.kind = "prayer";
        s.at = at;
        s.channel = "prayers";
        s.prayerKey = key;
        s.prayerDate = dateKey;

        String label = PrayerTimesCalc.labelBn(key);
        String timeBn = bnTime(hhmm);
        if (cfg.offsetMin > 0) {
            s.title = label + " — " + toBn(cfg.offsetMin) + " মিনিট পর ওয়াক্ত";
            s.body = "প্রস্তুতি নিন — " + timeBn + " এ " + label + " শুরু হবে";
        } else {
            s.title = label + " নামাজের সময়";
            s.body = "ওয়াক্ত শুরু হয়েছে (" + timeBn + ") — ইবাদতে মন দিন";
        }
        return s;
    }

    /** Cancels every prayer alarm in the current horizon (disabled prayers). */
    public static int cancelPrayerAlarms(Context ctx, AlarmStore.PrayerConfig cfg) {
        if (cfg == null) return 0;
        Calendar day = Calendar.getInstance();
        for (int offset = 0; offset < Math.max(1, cfg.horizonDays) + 1; offset++) {
            Calendar d = (Calendar) day.clone();
            d.add(Calendar.DAY_OF_YEAR, offset);
            String dateKey = String.format(java.util.Locale.US, "%04d-%02d-%02d",
                    d.get(Calendar.YEAR), d.get(Calendar.MONTH) + 1, d.get(Calendar.DAY_OF_MONTH));
            for (String key : new String[]{"fajr", "dhuhr", "asr", "maghrib", "isha"}) {
                cancel(ctx, "prayer-" + key + "-" + dateKey);
            }
        }
        return 0;
    }

    // =========================================================================
    // Full reschedule — boot / package-replaced / clock-changed path
    // =========================================================================

    /**
     * Rebuilds every alarm from the persisted store — 100% offline:
     *   • habit specs whose time is still in the future,
     *   • the full prayer horizon from PrayerTimesCalc (+ embedded today).
     */
    public static void rescheduleAll(Context ctx) {
        List<AlarmStore.Spec> plan = AlarmStore.loadHabitPlan(ctx);
        for (AlarmStore.Spec spec : plan) {
            if ("habit".equals(spec.kind)) schedule(ctx, spec);
        }
        AlarmStore.PrayerConfig cfg = AlarmStore.loadPrayerConfig(ctx);
        if (cfg != null) {
            schedulePrayerAlarms(ctx, cfg);
        }
    }

    // =========================================================================
    // Small helpers
    // =========================================================================

    private static int toMinutes(String hhmm) {
        try {
            String[] parts = hhmm.split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (Exception e) {
            return -1;
        }
    }

    /** Epoch ms for a date + minutes-of-day (device timezone). */
    private static long epochFor(int year, int month, int day, int minutesOfDay) {
        int hour = Math.floorDiv(minutesOfDay, 60);
        int minute = minutesOfDay - hour * 60;
        Calendar cal = Calendar.getInstance();
        cal.clear();
        cal.set(year, month - 1, day, hour, minute, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    /** "15:12" → "১৫:১২". */
    private static String bnTime(String hhmm) {
        StringBuilder out = new StringBuilder();
        for (char c : hhmm.toCharArray()) {
            if (c >= '0' && c <= '9') {
                out.append((char) ('০' + (c - '0')));
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    /** int → Bengali digits. */
    static String toBn(int n) {
        String s = String.valueOf(n);
        StringBuilder out = new StringBuilder();
        for (char c : s.toCharArray()) {
            out.append(c >= '0' && c <= '9' ? (char) ('০' + (c - '0')) : c);
        }
        return out.toString();
    }
}
