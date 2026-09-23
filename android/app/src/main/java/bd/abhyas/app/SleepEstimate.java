package bd.abhyas.app;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * SleepEstimate — "ফোন রেখে ঘুমিয়েছিলেন কখন থেকে কখন?"
 *
 * An honest, device-local sleep estimate with NO wearable and no background
 * sensing: the longest gap in phone usage between yesterday evening and this
 * morning is the window the phone lay untouched — for most people that IS
 * their sleep. The morning bedtime-off notification reports it ("রাতে X
 * ঘণ্টা ফোন স্পর্শ করেননি"), and each day's estimate is written into a small
 * local history so the নিয়ন্ত্রণ কেন্দ্র can show a 7-day trend.
 *
 * ── Method ───────────────────────────────────────────────────────────────
 * Walk UsageEvents from yesterday 18:00 → now and collect every activity
 * marker (any resume/pause = the phone was being used). The longest
 * marker-to-marker gap of at least {@link #MIN_GAP_MINUTES} is returned as
 * [start, end]:
 *   • start ≈ শেষ বার ফোন হাতে (bedtime-ish),
 *   • end   ≈ সকালে প্রথম ব্যবহার (wake-ish) — or "now" when the gap is
 *     still open (queried before the first morning touch: "অন্তত X ঘণ্টা")।
 *
 * Honesty guards:
 *   • No markers at all in the window → null (nothing measurable — we never
 *     invent a number).
 *   • The gap must start AFTER the first marker (an evening-dinner lull or
 *     an untouched-since-18:00 phone produces no fake estimate).
 *   • Usage access missing → null, never a guess.
 *
 * PRIVACY: everything stays in a local SharedPreferences file; no night-time
 * data ever leaves the device.
 */
public final class SleepEstimate {

    private SleepEstimate() {
        // static utility
    }

    private static final String PREFS = "abhyas_sleep";
    private static final String KEY_NIGHT_PREFIX = "night_"; // + date → "start,end"

    /** Evening window starts at 18:00 the previous day. */
    private static final int WINDOW_START_HOUR = 18;
    /** A real "phone untouched" gap must be at least this long. */
    private static final long MIN_GAP_MINUTES = 45L;

    // =========================================================================
    // The estimate
    // =========================================================================

    /**
     * Last night's [startMs, endMs] or null when nothing is measurable.
     */
    public static long[] estimateLastNight(Context ctx) {
        if (!UsageGuardPlugin.hasUsageAccess(ctx)) return null;
        try {
            UsageStatsManager usm =
                    (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return null;

            Calendar windowStart = Calendar.getInstance();
            windowStart.add(Calendar.DAY_OF_YEAR, -1);
            windowStart.set(Calendar.HOUR_OF_DAY, WINDOW_START_HOUR);
            windowStart.set(Calendar.MINUTE, 0);
            windowStart.set(Calendar.SECOND, 0);
            windowStart.set(Calendar.MILLISECOND, 0);

            long now = System.currentTimeMillis();
            UsageEvents events = usm.queryEvents(windowStart.getTimeInMillis(), now);
            if (events == null) return null;

            // Collect every marker timestamp (any usage event = phone alive).
            List<Long> markers = new ArrayList<>();
            UsageEvents.Event e = new UsageEvents.Event();
            while (events.hasNextEvent()) {
                events.getNextEvent(e);
                if (e.getPackageName() == null) continue;
                int t = e.getEventType();
                if (t == UsageEvents.Event.ACTIVITY_RESUMED
                        || t == UsageEvents.Event.ACTIVITY_PAUSED) {
                    long ts = e.getTimeStamp();
                    if (markers.isEmpty() || markers.get(markers.size() - 1) != ts) {
                        markers.add(ts);
                    }
                }
            }
            if (markers.isEmpty()) return null; // never invent a number

            // Longest gap ≥ MIN_GAP, starting strictly after the FIRST marker
            // (so an "untouched since 18:00" phone yields no fake estimate).
            long minGapMs = MIN_GAP_MINUTES * 60_000L;
            long bestStart = -1L, bestEnd = -1L, bestDur = 0L;
            for (int i = 1; i < markers.size(); i++) {
                long gapStart = markers.get(i - 1);
                long gapEnd = markers.get(i);
                long dur = gapEnd - gapStart;
                if (dur >= minGapMs && dur > bestDur) {
                    bestDur = dur;
                    bestStart = gapStart;
                    bestEnd = gapEnd;
                }
            }
            // Gap still open (queried before the first morning touch): count
            // it up to NOW — an honest "at least this long".
            long openDur = now - markers.get(markers.size() - 1);
            if (openDur >= minGapMs && openDur > bestDur) {
                bestDur = openDur;
                bestStart = markers.get(markers.size() - 1);
                bestEnd = now;
            }
            if (bestStart < 0) return null;
            return new long[]{bestStart, bestEnd};
        } catch (RuntimeException e) {
            return null; // access revoked mid-read — nothing measurable
        }
    }

    // =========================================================================
    // History (one estimate per day, written once, local only)
    // =========================================================================

    /**
     * Today's estimate, recorded under today's date key if not already there
     * (the morning alarm and any later UI read agree on ONE number per day).
     * Returns the estimate even when it was already recorded.
     */
    public static long[] recordIfNew(Context ctx) {
        long[] est = estimateLastNight(ctx);
        if (est == null) return null;
        SharedPreferences p = prefs(ctx);
        String key = KEY_NIGHT_PREFIX + UsageGuardPlugin.todayKey();
        if (!p.contains(key)) {
            p.edit().putString(key, est[0] + "," + est[1]).apply();
            purgeStale(p);
        }
        return est;
    }

    /**
     * The last {@code days} recorded nights, oldest → newest:
     * JSON objects {date, startMs, endMs, minutes}. Missing days are simply
     * absent (no fabricated entries).
     */
    public static JSONArray history(Context ctx, int days) {
        JSONArray out = new JSONArray();
        try {
            SharedPreferences p = prefs(ctx);
            Calendar day = Calendar.getInstance();
            day.add(Calendar.DAY_OF_YEAR, -(days - 1));
            SimpleDateFormatHolder fmt = new SimpleDateFormatHolder();
            for (int i = 0; i < days; i++) {
                String dateKey = fmt.key(day);
                String raw = p.getString(KEY_NIGHT_PREFIX + dateKey, null);
                if (raw != null) {
                    String[] parts = raw.split(",");
                    if (parts.length == 2) {
                        long start = Long.parseLong(parts[0]);
                        long end = Long.parseLong(parts[1]);
                        JSONObject o = new JSONObject();
                        o.put("date", dateKey);
                        o.put("startMs", start);
                        o.put("endMs", end);
                        o.put("minutes", Math.max(0, Math.round((end - start) / 60000.0)));
                        out.put(o);
                    }
                }
                day.add(Calendar.DAY_OF_YEAR, 1);
            }
        } catch (Exception ignored) {
            // corrupt entry — skip it, never crash a notification path
        }
        return out;
    }

    /** Deletes night_ keys older than the kept window (cheap hygiene). */
    private static void purgeStale(SharedPreferences p) {
        Calendar cutoff = Calendar.getInstance();
        cutoff.add(Calendar.DAY_OF_YEAR, -8); // keep a week
        SimpleDateFormatHolder fmt = new SimpleDateFormatHolder();
        String cutoffKey = fmt.key(cutoff);
        SharedPreferences.Editor editor = null;
        for (String key : p.getAll().keySet()) {
            if (key.startsWith(KEY_NIGHT_PREFIX)
                    && key.substring(KEY_NIGHT_PREFIX.length()).compareTo(cutoffKey) < 0) {
                if (editor == null) editor = p.edit();
                editor.remove(key);
            }
        }
        if (editor != null) editor.apply();
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** yyyy-MM-dd key helper (format object is not thread-safe — per call). */
    private static final class SimpleDateFormatHolder {
        final java.text.SimpleDateFormat fmt = new java.text.SimpleDateFormat(
                "yyyy-MM-dd", java.util.Locale.US);

        String key(Calendar day) {
            return fmt.format(day.getTime());
        }
    }
}
