package bd.abhyas.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * AlarmStore — the alarm engine's persisted state (SharedPreferences JSON).
 *
 * Everything the engine needs to survive a reboot lives here:
 *   • habit plan  — explicit alarm specs from the web layer (title/body/time
 *                   embedded; habits can never be recomputed natively).
 *   • prayer cfg  — city/coords/toggles + today's authoritative server times;
 *                   beyond today PrayerTimesCalc recomputes offline.
 *   • pending     — actions tapped on notification buttons while the app was
 *                   closed ([✓ নামাজ হয়ে গেছে] / [✓ সম্পন্ন]); the webview
 *                   drains them through getPendingActions() on resume.
 *
 * JSON keys are kept SHORT and stable — they are a storage format, not an API.
 */
public final class AlarmStore {

    private AlarmStore() {
        // static utility
    }

    private static final String PREFS = "abhyas_alarms";
    private static final String KEY_HABIT_PLAN = "habit_plan";
    private static final String KEY_PRAYER_CFG = "prayer_cfg";
    private static final String KEY_PENDING = "pending_actions";

    /** Hard cap for the pending-action queue (oldest dropped beyond this). */
    private static final int MAX_PENDING = 300;

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // =========================================================================
    // Alarm spec — one scheduled notification (habit kind; prayers are
    // generated natively from the config but use the SAME shape at fire time).
    // =========================================================================

    public static final class Spec {
        public String id;
        public String kind;          // "prayer" | "habit"
        public long at;              // epoch ms
        public String title;
        public String body;
        public String channel;       // "prayers" | "habits"
        public String prayerKey;     // nullable
        public String prayerDate;    // nullable YYYY-MM-DD
        public String habitId;       // nullable
        public String habitDate;     // nullable YYYY-MM-DD
        public int streak;

        static JSONObject toJson(Spec s) throws Exception {
            JSONObject o = new JSONObject();
            o.put("id", s.id);
            o.put("kind", s.kind);
            o.put("at", s.at);
            o.put("title", s.title);
            o.put("body", s.body);
            o.put("channel", s.channel);
            if (s.prayerKey != null) o.put("prayerKey", s.prayerKey);
            if (s.prayerDate != null) o.put("prayerDate", s.prayerDate);
            if (s.habitId != null) o.put("habitId", s.habitId);
            if (s.habitDate != null) o.put("habitDate", s.habitDate);
            o.put("streak", s.streak);
            return o;
        }

        static Spec fromJson(JSONObject o) {
            Spec s = new Spec();
            s.id = o.optString("id", "");
            s.kind = o.optString("kind", "habit");
            s.at = o.optLong("at", 0L);
            s.title = o.optString("title", "");
            s.body = o.optString("body", "");
            s.channel = o.optString("channel", "habits");
            s.prayerKey = o.optString("prayerKey", null);
            s.prayerDate = o.optString("prayerDate", null);
            s.habitId = o.optString("habitId", null);
            s.habitDate = o.optString("habitDate", null);
            s.streak = o.optInt("streak", 0);
            return s;
        }
    }

    // =========================================================================
    // Habit plan
    // =========================================================================

    public static void saveHabitPlan(Context ctx, List<Spec> specs) {
        JSONArray arr = new JSONArray();
        for (Spec s : specs) {
            try {
                arr.put(Spec.toJson(s));
            } catch (Exception ignored) {
                // one malformed spec never blocks the plan
            }
        }
        prefs(ctx).edit().putString(KEY_HABIT_PLAN, arr.toString()).apply();
    }

    public static List<Spec> loadHabitPlan(Context ctx) {
        List<Spec> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs(ctx).getString(KEY_HABIT_PLAN, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                out.add(Spec.fromJson(arr.getJSONObject(i)));
            }
        } catch (Exception ignored) {
            // corrupt store → empty plan (resynced on next app open)
        }
        return out;
    }

    // =========================================================================
    // Prayer config
    // =========================================================================

    public static final class PrayerConfig {
        public String city = "ঢাকা";
        public double lat = 23.8103;
        public double lng = 90.4125;
        public int offsetMin = 0;
        public List<String> prayers = new ArrayList<>();
        public boolean autoSilence = false;
        public int silenceMinutes = 15;
        public int horizonDays = 3;
        /** "YYYY-MM-DD" of the embedded server times, or null. */
        public String todayDate;
        public String tFajr, tDhuhr, tAsr, tMaghrib, tIsha;

        public boolean enabled(String key) {
            return prayers.contains(key);
        }

        /**
         * "HH:mm" for a prayer key: TODAY's authoritative server time when
         * available, else null (caller falls back to PrayerTimesCalc).
         */
        public String todayTime(String key) {
            if (todayDate == null) return null;
            switch (key) {
                case "fajr": return tFajr;
                case "dhuhr": return tDhuhr;
                case "asr": return tAsr;
                case "maghrib": return tMaghrib;
                case "isha": return tIsha;
                default: return null;
            }
        }

        JSONObject toJson() throws Exception {
            JSONObject o = new JSONObject();
            o.put("city", city);
            o.put("lat", lat);
            o.put("lng", lng);
            o.put("offsetMin", offsetMin);
            o.put("autoSilence", autoSilence);
            o.put("silenceMinutes", silenceMinutes);
            o.put("horizonDays", horizonDays);
            JSONArray p = new JSONArray();
            for (String k : prayers) p.put(k);
            o.put("prayers", p);
            if (todayDate != null) {
                JSONObject t = new JSONObject();
                t.put("date", todayDate);
                t.put("fajr", tFajr == null ? "" : tFajr);
                t.put("dhuhr", tDhuhr == null ? "" : tDhuhr);
                t.put("asr", tAsr == null ? "" : tAsr);
                t.put("maghrib", tMaghrib == null ? "" : tMaghrib);
                t.put("isha", tIsha == null ? "" : tIsha);
                o.put("todayTimes", t);
            }
            return o;
        }

        static PrayerConfig fromJson(JSONObject o) {
            PrayerConfig c = new PrayerConfig();
            c.city = o.optString("city", c.city);
            c.lat = o.optDouble("lat", c.lat);
            c.lng = o.optDouble("lng", c.lng);
            c.offsetMin = o.optInt("offsetMin", 0);
            c.autoSilence = o.optBoolean("autoSilence", false);
            c.silenceMinutes = o.optInt("silenceMinutes", 15);
            c.horizonDays = o.optInt("horizonDays", 3);
            JSONArray p = o.optJSONArray("prayers");
            if (p != null) {
                for (int i = 0; i < p.length(); i++) c.prayers.add(p.optString(i));
            }
            JSONObject t = o.optJSONObject("todayTimes");
            if (t != null) {
                c.todayDate = t.optString("date", null);
                c.tFajr = t.optString("fajr", null);
                c.tDhuhr = t.optString("dhuhr", null);
                c.tAsr = t.optString("asr", null);
                c.tMaghrib = t.optString("maghrib", null);
                c.tIsha = t.optString("isha", null);
            }
            return c;
        }
    }

    public static void savePrayerConfig(Context ctx, PrayerConfig cfg) {
        if (cfg == null) {
            prefs(ctx).edit().remove(KEY_PRAYER_CFG).apply();
            return;
        }
        try {
            prefs(ctx).edit().putString(KEY_PRAYER_CFG, cfg.toJson().toString()).apply();
        } catch (Exception ignored) {
            // never crash the engine on serialization
        }
    }

    /** null when prayer alarms were never configured / are disabled. */
    public static PrayerConfig loadPrayerConfig(Context ctx) {
        try {
            String raw = prefs(ctx).getString(KEY_PRAYER_CFG, null);
            if (raw == null) return null;
            return PrayerConfig.fromJson(new JSONObject(raw));
        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================================
    // Pending actions (notification buttons pressed while closed)
    // =========================================================================

    public static final class PendingAction {
        public String type;        // "prayer-done" | "habit-done"
        public String prayerKey;   // nullable
        public String habitId;     // nullable
        public String date;        // nullable YYYY-MM-DD
        public long at;            // epoch ms when pressed

        JSONObject toJson() throws Exception {
            JSONObject o = new JSONObject();
            o.put("type", type);
            if (prayerKey != null) o.put("prayerKey", prayerKey);
            if (habitId != null) o.put("habitId", habitId);
            if (date != null) o.put("date", date);
            o.put("at", at);
            return o;
        }

        static PendingAction fromJson(JSONObject o) {
            PendingAction a = new PendingAction();
            a.type = o.optString("type", "");
            a.prayerKey = o.optString("prayerKey", null);
            a.habitId = o.optString("habitId", null);
            a.date = o.optString("date", null);
            a.at = o.optLong("at", 0L);
            return a;
        }
    }

    /** Append one action; keeps the queue bounded (oldest dropped). */
    public static void appendPendingAction(Context ctx, PendingAction action) {
        try {
            List<PendingAction> all = loadPending(ctx);
            all.add(action);
            while (all.size() > MAX_PENDING) all.remove(0);
            JSONArray arr = new JSONArray();
            for (PendingAction a : all) arr.put(a.toJson());
            prefs(ctx).edit().putString(KEY_PENDING, arr.toString()).apply();
        } catch (Exception ignored) {
            // a failed append must never crash a BroadcastReceiver
        }
    }

    public static List<PendingAction> loadPending(Context ctx) {
        List<PendingAction> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs(ctx).getString(KEY_PENDING, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                out.add(PendingAction.fromJson(arr.getJSONObject(i)));
            }
        } catch (Exception ignored) {
            // corrupt queue → start empty
        }
        return out;
    }

    /** Read + clear (the web layer owns the actions from here on). */
    public static List<PendingAction> drainPending(Context ctx) {
        List<PendingAction> out = loadPending(ctx);
        if (!out.isEmpty()) {
            prefs(ctx).edit().putString(KEY_PENDING, "[]").apply();
        }
        return out;
    }

    // =========================================================================
    // Full reset
    // =========================================================================

    public static void clearAll(Context ctx) {
        prefs(ctx).edit().clear().apply();
    }
}
