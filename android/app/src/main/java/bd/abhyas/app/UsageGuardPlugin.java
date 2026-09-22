package bd.abhyas.app;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;

/**
 * UsageGuard — per-app daily time budgets for অভ্যাস.
 *
 * Powers the "নিয়ন্ত্রণ" screen: the user sees how many minutes each app has
 * been in the foreground TODAY, sets a daily budget (minutes/day) per app, and
 * can arm a background watchdog ({@link UsageGuardService}) that fires a
 * Bengali "সময় শেষ" notification when a budget is crossed — pulling the user
 * back to their habits instead of an endless scroll.
 *
 * ── Permission model ─────────────────────────────────────────────────────
 * Everything is gated behind Android's USAGE-STATS special access:
 * `android.permission.PACKAGE_USAGE_STATS` (an appop, granted by the USER from
 * Settings → Special app access → Usage access). It is NEVER granted at
 * install time; {@link #requestAccess} merely opens that settings screen and
 * resolves honestly with `granted:false, opened:true` — the JS layer re-checks
 * when the user comes back. App listing additionally relies on
 * QUERY_ALL_PACKAGES (manifest) so the budget picker can show every app.
 *
 * PRIVACY: usage data never leaves the device. No app names, no durations, no
 * sync — the numbers live only in this process and in a local
 * SharedPreferences file. The usage events themselves are read via
 * UsageStatsManager.queryEvents and aggregated to per-app minute totals with
 * zero third-party involvement.
 *
 * ── Aggregation (shared with the watchdog service) ───────────────────────
 * The static {@link #foregroundMillisSince} helper walks UsageEvents between
 * local midnight and now, pairing every ACTIVITY_RESUMED with the matching
 * ACTIVITY_PAUSED (these constants are the API-29 renames of the legacy
 * MOVE_TO_FOREGROUND / MOVE_TO_BACKGROUND events and carry the SAME wire
 * values 1/2 — javac inlines them, so one code path serves API 24→36). An
 * interval that is still open (app in the foreground right now) is counted up
 * to "now", mirroring Digital Wellbeing's behaviour. This helper is public and
 * static on purpose: UsageGuardService reuses the identical logic every 60 s
 * so the plugin's answer and the service's enforcement can never disagree.
 */
@CapacitorPlugin(name = "UsageGuard")
public class UsageGuardPlugin extends Plugin {

    /** Rejected when Usage access has not been granted yet (matches ERR_ in usage-plugin.ts). */
    static final String ERR_USAGE_ACCESS_REQUIRED = "USAGE_ACCESS_REQUIRED";
    static final String ERR_UNSUPPORTED = "UNSUPPORTED";
    static final String ERR_SETTINGS_UNAVAILABLE = "SETTINGS_UNAVAILABLE";
    static final String ERR_INVALID_ARGS = "INVALID_ARGS";

    /** Local store for {package → minutes/day} budgets + the service's notified-set. */
    static final String PREFS_NAME = "abhyas_usage_guard";
    static final String KEY_LIMITS = "limits";

    /** Launcher icons are downscaled to this size (px) before base64 encoding. */
    private static final int ICON_PX = 48;
    /** Icons heavier than this after PNG compression are skipped (icon stays null). */
    private static final int MAX_ICON_BYTES = 32 * 1024;

    // ── JS API ────────────────────────────────────────────────────────────

    @PluginMethod
    public void isAccessGranted(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasUsageAccess(getContext()));
        call.resolve(ret);
    }

    /**
     * Opens the system "Usage access" settings screen where the user grants
     * the one-time special access. Resolves immediately with `opened: true`
     * (or `granted:true` when access already exists); the JS layer re-checks
     * status when the user returns — the same honest pattern as
     * FocusModePlugin.requestAccess.
     */
    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (hasUsageAccess(getContext())) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("opened", false);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("সেটিংস স্ক্রিন খোলা যায়নি", ERR_SETTINGS_UNAVAILABLE);
        }
    }

    /**
     * Lists every launchable app (minus অভ্যাস itself) for the budget picker:
     * packageName, display label, and a ≤48px base64 PNG launcher icon when it
     * is cheap to produce. Icons that compress badly are returned as null and
     * the web layer falls back to an initial-letter tile.
     */
    @PluginMethod
    public void getApps(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> candidates = pm.queryIntentActivities(launcher, 0);
            String ownPackage = getContext().getPackageName();

            List<JSObject> apps = new ArrayList<>();
            if (candidates != null) {
                for (ResolveInfo ri : candidates) {
                    if (ri.activityInfo == null || ri.activityInfo.packageName == null) continue;
                    String pkg = ri.activityInfo.packageName;
                    if (pkg.equals(ownPackage)) continue; // never offer a budget for ourselves

                    JSObject app = new JSObject();
                    app.put("packageName", pkg);
                    String label = pkg;
                    try {
                        CharSequence loaded = ri.loadLabel(pm);
                        if (loaded != null && loaded.length() > 0) label = loaded.toString();
                    } catch (RuntimeException ignored) {
                    }
                    app.put("label", label);
                    app.put("icon", encodeLauncherIcon(pm, pkg));

                    apps.add(app);
                }
            }
            sortApps(apps);

            JSObject ret = new JSObject();
            ret.put("apps", new JSArray(apps));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("অ্যাপের তালিকা পড়া যায়নি", "APP_LIST_FAILED");
        }
    }

    /**
     * Today's honest scoreboard: foreground minutes per app since local
     * midnight, merged with the stored per-app budgets. Rows appear for every
     * app that was used today OR has a budget set (a budgeted-but-unused app
     * is exactly the row the user wants to see). Requires Usage access.
     */
    @PluginMethod
    public void getUsageToday(PluginCall call) {
        if (!hasUsageAccess(getContext())) {
            call.reject("ব্যবহারের তথ্য দেখার অনুমতি দরকার", ERR_USAGE_ACCESS_REQUIRED);
            return;
        }
        try {
            Context ctx = getContext();
            Map<String, Long> millis = foregroundMillisSince(ctx, midnightToday());
            Map<String, Integer> limits = getLimitsMap(ctx);

            TreeSet<String> packages = new TreeSet<>();
            packages.addAll(millis.keySet());
            packages.addAll(limits.keySet());

            List<JSObject> apps = new ArrayList<>();
            for (String pkg : packages) {
                long usedMillis = millis.containsKey(pkg) ? millis.get(pkg) : 0L;
                int limitMinutes = limits.containsKey(pkg) ? limits.get(pkg) : 0;
                if (usedMillis <= 0 && limitMinutes <= 0) continue;
                int todayMinutes = (int) Math.round(usedMillis / 60000.0);

                JSObject app = new JSObject();
                app.put("packageName", pkg);
                app.put("label", getAppLabel(ctx, pkg));
                app.put("todayMinutes", todayMinutes);
                app.put("limitMinutes", limitMinutes);
                app.put("overLimit", limitMinutes > 0 && todayMinutes >= limitMinutes);
                apps.add(app);
            }
            sortApps(apps);

            JSObject ret = new JSObject();
            ret.put("apps", new JSArray(apps));
            ret.put("enforcementActive", UsageGuardService.isRunning());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("ব্যবহারের তথ্য পড়া যায়নি", "USAGE_READ_FAILED");
        }
    }

    /**
     * Persists (or updates) one app's daily budget. `minutesPerDay = 0`
     * removes the budget — 0 and "no entry" therefore mean the same thing to
     * every reader of the map.
     */
    @PluginMethod
    public void setLimit(PluginCall call) {
        String packageName = call.getString("packageName");
        Integer minutes = intArg(call, "minutesPerDay");
        if (packageName == null || packageName.trim().isEmpty() || minutes == null || minutes < 0) {
            call.reject("অ্যাপের নাম ও দৈনিক সময়সীমা দরকার", ERR_INVALID_ARGS);
            return;
        }
        Map<String, Integer> limits = getLimitsMap(getContext());
        if (minutes == 0) {
            limits.remove(packageName);
        } else {
            limits.put(packageName, minutes);
        }
        saveLimitsMap(getContext(), limits);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    /** Removes one app's budget (identical to setLimit(packageName, 0)). */
    @PluginMethod
    public void removeLimit(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.trim().isEmpty()) {
            call.reject("অ্যাপের নাম দরকার", ERR_INVALID_ARGS);
            return;
        }
        Map<String, Integer> limits = getLimitsMap(getContext());
        limits.remove(packageName);
        saveLimitsMap(getContext(), limits);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    /**
     * Arms / disarms the background watchdog service. Arming requires Usage
     * access (a guard that cannot read usage would be a lie), and uses
     * startForegroundService on API 26+ so the service outlives the activity.
     *
     * NOTIFICATION PERMISSION NOTE (API 33+): POST_NOTIFICATIONS is a runtime
     * permission. This plugin cannot meaningfully request it from Capacitor,
     * so UsageGuardService degrades silently: the watchdog keeps enforcing
     * (usage still measured, budgets still tracked) but the "সময় শেষ" alerts
     * are only shown when NotificationManagerCompat.areNotificationsEnabled()
     * is true. The web UI is expected to point the user at the system
     * notification settings for অভ্যাস.
     */
    @PluginMethod
    public void setEnforcement(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("enabled মান দরকার", ERR_INVALID_ARGS);
            return;
        }
        if (enabled && !hasUsageAccess(getContext())) {
            call.reject("ব্যবহারের তথ্য দেখার অনুমতি দরকার", ERR_USAGE_ACCESS_REQUIRED);
            return;
        }
        Context ctx = getContext();
        Intent service = new Intent(ctx, UsageGuardService.class);
        if (enabled) {
            // ContextCompat handles the API 26+ startForegroundService dance.
            ContextCompat.startForegroundService(ctx, service);
        } else {
            ctx.stopService(service);
        }
        JSObject ret = new JSObject();
        ret.put("active", enabled);
        call.resolve(ret);
    }

    // ── Shared helpers (also used by UsageGuardService) ──────────────────

    /**
     * True when the user has granted the Usage-access appop. Standard reliable
     * pattern: ask AppOpsManager what mode the PACKAGE_USAGE_STATS op is in
     * for OUR uid/package — MODE_ALLOWED means granted. A SecurityException
     * (or a missing service) simply means "not granted".
     */
    public static boolean hasUsageAccess(Context context) {
        if (context == null) return false;
        try {
            AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            if (appOps == null) return false;
            int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), context.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Per-app foreground milliseconds since {@code sinceMillis} (callers pass
     * local midnight). Walks the UsageEvents stream pairing
     * ACTIVITY_RESUMED→ACTIVITY_PAUSED; the still-open interval of an app in
     * the foreground right now is counted up to the current time.
     * Returns an empty map (never throws) when access is missing/revoked —
     * honest "nothing measurable" instead of a crash.
     */
    public static Map<String, Long> foregroundMillisSince(Context context, long sinceMillis) {
        Map<String, Long> totals = new HashMap<>();
        if (context == null) return totals;
        try {
            UsageStatsManager usm =
                    (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return totals;
            long now = System.currentTimeMillis();
            UsageEvents events = usm.queryEvents(Math.max(0L, sinceMillis), now);
            if (events == null) return totals;

            UsageEvents.Event event = new UsageEvents.Event();
            Map<String, Long> resumedAt = new HashMap<>();
            while (events.hasNextEvent()) {
                events.getNextEvent(event);
                String pkg = event.getPackageName();
                if (pkg == null) continue;
                int type = event.getEventType();
                if (type == UsageEvents.Event.ACTIVITY_RESUMED) {
                    resumedAt.put(pkg, event.getTimeStamp());
                } else if (type == UsageEvents.Event.ACTIVITY_PAUSED) {
                    Long start = resumedAt.remove(pkg);
                    if (start != null && event.getTimeStamp() > start) {
                        totals.merge(pkg, event.getTimeStamp() - start, Long::sum);
                    }
                }
            }
            // Count the app that is open RIGHT NOW up to this instant.
            for (Map.Entry<String, Long> open : resumedAt.entrySet()) {
                if (now > open.getValue()) {
                    totals.merge(open.getKey(), now - open.getValue(), Long::sum);
                }
            }
        } catch (RuntimeException e) {
            // Access revoked mid-read (SecurityException) or an OEM quirk —
            // report what we have instead of crashing the call.
        }
        return totals;
    }

    /** Local midnight (00:00:00.000) in the device's current timezone. */
    public static long midnightToday() {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    /** Stable date key (yyyy-MM-dd) for day-scoped storage. */
    public static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /** Reads the {package → minutes/day} budget map from local storage. */
    public static Map<String, Integer> getLimitsMap(Context context) {
        Map<String, Integer> limits = new LinkedHashMap<>();
        if (context == null) return limits;
        try {
            String raw = prefs(context).getString(KEY_LIMITS, null);
            if (raw == null) return limits;
            JSONObject obj = new JSONObject(raw);
            Iterator<String> keys = obj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                int minutes = obj.optInt(key, 0);
                if (minutes > 0) limits.put(key, minutes);
            }
        } catch (JSONException ignored) {
            // Corrupt store — start over with an empty (never crashing) map.
        }
        return limits;
    }

    /** Persists the budget map as a flat JSON object in SharedPreferences. */
    public static void saveLimitsMap(Context context, Map<String, Integer> limits) {
        if (context == null || limits == null) return;
        try {
            JSONObject obj = new JSONObject();
            for (Map.Entry<String, Integer> entry : limits.entrySet()) {
                if (entry.getValue() != null && entry.getValue() > 0) {
                    obj.put(entry.getKey(), entry.getValue().intValue());
                }
            }
            prefs(context).edit().putString(KEY_LIMITS, obj.toString()).apply();
        } catch (JSONException ignored) {
            // Only thrown for null keys — impossible here.
        }
    }

    /** Display label for a package (falls back to the raw package name). */
    public static String getAppLabel(Context context, String packageName) {
        if (context == null || packageName == null) return packageName == null ? "" : packageName;
        try {
            PackageManager pm = context.getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            CharSequence label = pm.getApplicationLabel(info);
            if (label != null && label.length() > 0) return label.toString();
        } catch (PackageManager.NameNotFoundException | RuntimeException ignored) {
        }
        return packageName;
    }

    // ── Internals ────────────────────────────────────────────────────────

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /**
     * Scales a launcher icon into a ≤48px ARGB bitmap and returns it as a
     * base64-encoded PNG (data-URI-ready, no data: prefix — the web layer adds
     * it). Adaptive icons are drawn across their full 108dp canvas, so they
     * arrive slightly padded — acceptable at this size. Returns null whenever
     * anything fails or the PNG is unusually heavy; the contract marks icon
     * as nullable precisely for this.
     */
    private String encodeLauncherIcon(PackageManager pm, String packageName) {
        Bitmap bmp = null;
        try {
            Drawable drawable = pm.getApplicationIcon(packageName);
            if (drawable == null) return null;
            bmp = Bitmap.createBitmap(ICON_PX, ICON_PX, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            drawable.setBounds(0, 0, ICON_PX, ICON_PX);
            drawable.draw(canvas);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 90, bos);
            byte[] bytes = bos.toByteArray();
            if (bytes.length > MAX_ICON_BYTES) return null;
            return Base64.encodeToString(bytes, Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        } finally {
            if (bmp != null) bmp.recycle();
        }
    }

    /** Case-insensitive label sort (package name as tiebreaker). */
    private static void sortApps(List<JSObject> apps) {
        Collections.sort(apps, new Comparator<JSObject>() {
            @Override
            public int compare(JSObject a, JSObject b) {
                String la = a.getString("label");
                String lb = b.getString("label");
                if (la == null) la = "";
                if (lb == null) lb = "";
                int byLabel = la.compareToIgnoreCase(lb);
                if (byLabel != 0) return byLabel;
                String pa = a.getString("packageName");
                String pb = b.getString("packageName");
                return pa != null && pb != null ? pa.compareTo(pb) : 0;
            }
        });
    }

    /**
     * Reads an integer that the JS side may have serialized as 30 or 30.0 —
     * Capacitor's getInt() is strictly Integer, so fall back to getDouble()
     * and round. Returns null when the key is absent.
     */
    private static Integer intArg(PluginCall call, String key) {
        Integer exact = call.getInt(key);
        if (exact != null) return exact;
        Double loose = call.getDouble(key);
        if (loose != null) return (int) Math.round(loose);
        return null;
    }
}
