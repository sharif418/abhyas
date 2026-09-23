package bd.abhyas.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

/**
 * UsageGuardService — the background budget watchdog for অভ্যাস.
 *
 * A START_STICKY foreground service with TWO loops:
 *
 *   • budget sweep (every 60 s) — fires ONE high-importance Bengali
 *     notification per app per day when its daily budget is crossed:
 *
 *      সময় শেষ: {অ্যাপের নাম}
 *      আজকের নির্ধারিত সময় পার হয়েছে — অভ্যাসে ফিরে আসুন।
 *
 *   • interception sweep (every 4 s, only while the user armed the block
 *     screen) — when an over-budget app is OPEN RIGHT NOW, AppInterceptor
 *     shows the calm full-screen “অভ্যাসে ফিরে আসুন” overlay over it.
 *     When interception is off the tick costs one SharedPreferences read.
 *
 * Tapping it opens অভ্যাস itself. The service measures nothing the plugin
 * cannot already see: it reuses UsageGuardPlugin.foregroundMillisSince(), so
 * the "scoreboard" the user reads and the enforcement can never disagree.
 *
 * ── Foreground-service design ────────────────────────────────────────────
 * Running as a LOW-importance foreground service (channel "অ্যাপ ব্যবহার
 * নিয়ন্ত্রণ") is deliberate: Android would kill a background service within
 * minutes, and an invisible enforcement that silently stops is a lie. The
 * persistent notification says exactly what is happening; the actual ALERTS go
 * through a separate IMPORTANCE_HIGH channel so a budget crossing rings while
 * the heartbeat stays quiet.
 *
 * ── Notification permission (API 33+) ────────────────────────────────────
 * POST_NOTIFICATIONS is a runtime permission we cannot request from inside a
 * service. When it is denied the watchdog degrades SILENTLY but keeps
 * enforcing (usage is still measured, budgets still tracked, the persistent
 * channel simply is not shown) — checked via
 * NotificationManagerCompat.areNotificationsEnabled() before each alert.
 *
 * ── Per-day notification memory ──────────────────────────────────────────
 * Each crossed budget notifies exactly once per calendar day. The
 * "already alerted" set is a JSON object stored under a date-stamped key
 * ("notified_yyyy-MM-dd") in SharedPreferences, so a new day starts with a
 * clean slate automatically; stale keys from previous days are purged on the
 * next check (cheap hygiene so the file never grows).
 *
 * ── Honesty ──────────────────────────────────────────────────────────────
 * If the user revokes Usage access while the watchdog runs, the checks simply
 * stop producing data (the service keeps running and re-arms itself the
 * moment access returns). Nothing is inferred, nothing leaves the device.
 */
public class UsageGuardService extends Service {

    /** Quiet heartbeat channel for the persistent foreground notification. */
    public static final String CHANNEL_ID = "abhyas_usage_guard";
    /** Loud channel for the "সময় শেষ" budget-crossed alerts. */
    public static final String CHANNEL_ALERTS_ID = "abhyas_usage_guard_alerts";

    static final String KEY_NOTIFIED_PREFIX = "notified_";

    private static final int PERSISTENT_NOTIFICATION_ID = 0x5501;
    private static final long CHECK_INTERVAL_MS = 60_000L;
    /** Interception reacts in seconds — the industry app-blocker cadence. */
    private static final long INTERCEPT_INTERVAL_MS = 4_000L;
    /** Small first delay so the service settles before its first sweep. */
    private static final long FIRST_CHECK_DELAY_MS = 1_200L;
    private static final int ALERT_ICON_SIZE = 64;

    /** Volatile because the plugin reads it from the Capacitor bridge thread. */
    private static volatile boolean running = false;

    /** True while the watchdog service is alive (plugin reports this as enforcementActive). */
    public static boolean isRunning() {
        return running;
    }

    private Handler handler;
    private final Runnable checkRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                checkLimits();
            } catch (Exception e) {
                // One bad sweep must never kill the watchdog — the next tick retries.
            }
            if (handler != null) {
                handler.postDelayed(this, CHECK_INTERVAL_MS);
            }
        }
    };

    /** The fast block-screen loop — cheap no-op unless interception is armed. */
    private final Runnable interceptRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                // Re-read the preference every tick so the নিয়ন্ত্রণ কেন্দ্র
                // switch takes effect without restarting the service.
                if (AppInterceptor.isEnabled(UsageGuardService.this)) {
                    AppInterceptor.maybeIntercept(UsageGuardService.this);
                }
            } catch (Exception e) {
                // one bad tick never kills the loop
            }
            if (handler != null) {
                handler.postDelayed(this, INTERCEPT_INTERVAL_MS);
            }
        }
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        createChannels();
        // Promote to foreground immediately (mandatory within 5s when started
        // via startForegroundService on API 26+; harmless below).
        startForeground(PERSISTENT_NOTIFICATION_ID, buildPersistentNotification());
        handler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // (Re)schedule the sweeps — also covers START_STICKY restarts where
        // intent is null: the loops re-read limits + usage from scratch.
        if (handler != null) {
            handler.removeCallbacks(checkRunnable);
            handler.removeCallbacks(interceptRunnable);
            handler.postDelayed(checkRunnable, FIRST_CHECK_DELAY_MS);
            handler.postDelayed(interceptRunnable, FIRST_CHECK_DELAY_MS);
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        // Started, never bound.
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // The app task being swiped away must NOT stop enforcement — that is
        // the whole point of a watchdog. Re-schedule defensively (START_STICKY
        // already covers process death).
        super.onTaskRemoved(rootIntent);
        if (handler != null) {
            handler.removeCallbacks(checkRunnable);
            handler.removeCallbacks(interceptRunnable);
            handler.postDelayed(checkRunnable, CHECK_INTERVAL_MS);
            handler.postDelayed(interceptRunnable, INTERCEPT_INTERVAL_MS);
        }
    }

    @Override
    public void onDestroy() {
        if (handler != null) {
            handler.removeCallbacks(checkRunnable);
            handler.removeCallbacks(interceptRunnable);
            handler = null;
        }
        running = false;
        super.onDestroy();
    }

    // ── The watchdog loop ────────────────────────────────────────────────

    /**
     * One sweep: aggregate today's foreground time, compare against the
     * stored budgets and notify for each newly-crossed app (once per day).
     */
    private void checkLimits() {
        if (!UsageGuardPlugin.hasUsageAccess(this)) {
            return; // nothing measurable until the user re-grants Usage access
        }
        Map<String, Long> millis =
                UsageGuardPlugin.foregroundMillisSince(this, UsageGuardPlugin.midnightToday());
        if (millis.isEmpty()) {
            return;
        }
        Map<String, Integer> limits = UsageGuardPlugin.getLimitsMap(this);
        if (limits.isEmpty()) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(UsageGuardPlugin.PREFS_NAME, MODE_PRIVATE);
        String today = UsageGuardPlugin.todayKey();
        JSONObject notified = readNotified(prefs, today);
        boolean changed = false;

        for (Map.Entry<String, Integer> entry : limits.entrySet()) {
            String pkg = entry.getKey();
            int limitMinutes = entry.getValue();
            if (limitMinutes <= 0) continue;

            long usedMillis = millis.containsKey(pkg) ? millis.get(pkg) : 0L;
            int todayMinutes = (int) Math.round(usedMillis / 60000.0);
            if (todayMinutes < limitMinutes) continue;    // still within budget
            if (notified.has(pkg)) continue;              // already alerted today

            notifyLimitReached(pkg, todayMinutes, limitMinutes);
            try {
                notified.put(pkg, true);
                changed = true;
            } catch (JSONException ignored) {
                // put() on a plain string key cannot fail.
            }
        }

        if (changed) {
            prefs.edit().putString(KEY_NOTIFIED_PREFIX + today, notified.toString()).apply();
        }
        purgeStaleNotifiedKeys(prefs, today);
    }

    /** Parses the day-scoped "already alerted" set (empty on a fresh day). */
    private JSONObject readNotified(SharedPreferences prefs, String today) {
        try {
            String raw = prefs.getString(KEY_NOTIFIED_PREFIX + today, null);
            if (raw != null) return new JSONObject(raw);
        } catch (JSONException ignored) {
            // Corrupt entry — treat as a fresh day.
        }
        return new JSONObject();
    }

    /** Deletes notified_* keys from previous days (a new day resets itself). */
    private void purgeStaleNotifiedKeys(SharedPreferences prefs, String today) {
        String keepKey = KEY_NOTIFIED_PREFIX + today;
        SharedPreferences.Editor editor = null;
        for (String key : prefs.getAll().keySet()) {
            if (key.startsWith(KEY_NOTIFIED_PREFIX) && !key.equals(keepKey)) {
                if (editor == null) editor = prefs.edit();
                editor.remove(key);
            }
        }
        if (editor != null) editor.apply();
    }

    // ── Notifications ────────────────────────────────────────────────────

    /**
     * Fires the high-importance "সময় শেষ" alert for one app. Tapping opens
     * অভ্যাস (MainActivity) so the user lands on their habits, not on a
     * block screen — this is a nudge, not a lock.
     */
    private void notifyLimitReached(String packageName, int todayMinutes, int limitMinutes) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        // API 33+ runtime permission: silently keep enforcing when denied.
        if (!nm.areNotificationsEnabled()) {
            return;
        }

        String label = UsageGuardPlugin.getAppLabel(this, packageName);
        String title = "সময় শেষ: " + label;
        String body = "আজকের নির্ধারিত সময় পার হয়েছে — অভ্যাসে ফিরে আসুন।";

        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent content = PendingIntent.getActivity(
                this, packageName.hashCode(), open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ALERTS_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(content);

        Bitmap largeIcon = loadAppIcon(packageName);
        if (largeIcon != null) builder.setLargeIcon(largeIcon);

        try {
            // Tag = package → one notification per app, re-notifying replaces.
            nm.notify(packageName, PERSISTENT_NOTIFICATION_ID, builder.build());
        } catch (RuntimeException ignored) {
            // Permission flipped mid-flight (SecurityException) or a
            // notification-service hiccup — never let a notification failure
            // kill the watchdog.
        }
    }

    /** The quiet persistent "I am watching budgets" foreground notification. */
    private Notification buildPersistentNotification() {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent content = PendingIntent.getActivity(
                this, 0, open, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                // The app ships no dense white status icons; a system
                // "manage/settings" glyph is the honest lightweight stand-in.
                .setSmallIcon(android.R.drawable.ic_menu_manage)
                .setContentTitle("অ্যাপ নিয়ন্ত্রণ চালু")
                .setContentText("সময়সীমা নজরে রাখা হচ্ছে")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setOnlyAlertOnce(true)
                .setContentIntent(content)
                .build();
    }

    /** Creates the two channels (no-op below Android 8.0). */
    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel heartbeat = new NotificationChannel(
                CHANNEL_ID, "অ্যাপ ব্যবহার নিয়ন্ত্রণ", NotificationManager.IMPORTANCE_LOW);
        heartbeat.setDescription("নিয়ন্ত্রণ সেবা চালু থাকার নীরব নোটিফিকেশন");
        nm.createNotificationChannel(heartbeat);

        NotificationChannel alerts = new NotificationChannel(
                CHANNEL_ALERTS_ID, "সময় শেষ সতর্কতা", NotificationManager.IMPORTANCE_HIGH);
        alerts.setDescription("কোনো অ্যাপের দৈনিক সময়সীমা পার হলে সতর্কতা");
        alerts.enableVibration(true);
        nm.createNotificationChannel(alerts);
    }

    /** Small launcher-icon bitmap for the alert's large icon (nullable). */
    private Bitmap loadAppIcon(String packageName) {
        Bitmap bmp = null;
        try {
            Drawable drawable = getPackageManager().getApplicationIcon(packageName);
            if (drawable == null) return null;
            bmp = Bitmap.createBitmap(ALERT_ICON_SIZE, ALERT_ICON_SIZE, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            drawable.setBounds(0, 0, ALERT_ICON_SIZE, ALERT_ICON_SIZE);
            drawable.draw(canvas);
            return bmp;
        } catch (Exception e) {
            if (bmp != null) bmp.recycle();
            return null;
        }
    }
}
