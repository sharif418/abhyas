package bd.abhyas.app;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * NativeAlarm — the Capacitor bridge of the native alarm engine.
 *
 * "Brain in Web, Muscle in Native": the web layer owns WHAT/WHEN (settings,
 * Bengali copy, habit data) and calls {@code syncAlarms} with a complete
 * plan; this plugin owns DELIVERY — exact AlarmManager scheduling, boot
 * persistence (BootReceiver), offline prayer recalculation
 * (PrayerTimesCalc) and notification action buttons
 * (AlarmActionReceiver).
 *
 * JS contract: src/lib/native/alarm-plugin.ts (mirrored 1:1).
 */
@CapacitorPlugin(
        name = "NativeAlarm",
        permissions = {
                @Permission(
                        alias = "notifications",
                        strings = { Manifest.permission.POST_NOTIFICATIONS }
                )
        }
)
public class NativeAlarmPlugin extends Plugin {

    static final String ERR_UNSUPPORTED = "UNSUPPORTED";

    /** Live-event channel (foreground notification-button presses). */
    private static final String EVENT_ALARM_ACTION = "alarmAction";

    /** Process-wide reference for receivers to emit live events (guarded). */
    private static volatile NativeAlarmPlugin instance;

    @Override
    public void load() {
        instance = this;
        AlarmReceiver.ensureChannels(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    /** Called by AlarmActionReceiver when the webview may be alive. */
    static void emitAction(AlarmStore.PendingAction action) {
        NativeAlarmPlugin plugin = instance;
        if (plugin == null) return;
        try {
            JSObject a = new JSObject();
            a.put("type", action.type);
            if (action.prayerKey != null) a.put("prayerKey", action.prayerKey);
            if (action.habitId != null) a.put("habitId", action.habitId);
            if (action.date != null) a.put("date", action.date);
            a.put("at", action.at);
            JSObject data = new JSObject();
            data.put("action", a);
            plugin.notifyListeners(EVENT_ALARM_ACTION, data);
        } catch (Exception ignored) {
            // bridge gone — the pending queue still carries the action
        }
    }

    // =========================================================================
    // Status & permissions
    // =========================================================================

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("supported", true);
        ret.put("exactAlarms", AlarmScheduler.canScheduleExact(ctx));
        boolean notifications;
        try {
            notifications = NotificationManagerCompat.from(ctx).areNotificationsEnabled();
        } catch (Exception e) {
            notifications = false;
        }
        ret.put("notifications", notifications);
        ret.put("dndAccess", DndControl.hasPolicyAccess(ctx));
        ret.put("pendingActions", AlarmStore.loadPending(ctx).size());
        call.resolve(ret);
    }

    /**
     * Opens the system "Alarms & reminders" special-access screen (Android
     * 12+ without USE_EXACT_ALARM auto-grant). On Android 13+ USE_EXACT_ALARM
     * covers us — this resolves without opening anything.
     */
    @PluginMethod
    public void requestExactAlarmAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT < 31) {
            JSObject ret = new JSObject();
            ret.put("opened", false); // exact by default below S
            call.resolve(ret);
            return;
        }
        try {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (am != null && am.canScheduleExactAlarms()) {
                JSObject ret = new JSObject();
                ret.put("opened", false);
                call.resolve(ret);
                return;
            }
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("সেটিংস স্ক্রিন খোলা যায়নি", "SETTINGS_UNAVAILABLE");
        }
    }

    /** Runtime POST_NOTIFICATIONS request (Android 13+). */
    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33) {
            JSObject ret = new JSObject();
            ret.put("granted", notificationsEnabled());
            call.resolve(ret);
            return;
        }
        if (notificationsEnabled()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("notifications", call, "requestNotificationPermissionResult");
    }

    @PermissionCallback
    private void requestNotificationPermissionResult(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", notificationsEnabled());
        call.resolve(ret);
    }

    private boolean notificationsEnabled() {
        try {
            return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    // =========================================================================
    // Plan sync — the core entry point from the web layer
    // =========================================================================

    /**
     * Replaces the whole alarm plan:
     *   • habit specs — diff-cancel removed, schedule future ones
     *   • prayer cfg — null DISABLES prayer alarms (cancels + clears);
     *     otherwise persist + regenerate the offline horizon
     */
    @PluginMethod
    public void syncAlarms(PluginCall call) {
        try {
            Context ctx = getContext();
            List<AlarmStore.Spec> newPlan = parseSpecs(call.getArray("alarms", new JSArray()));
            JSONObject cfgJson = call.getObject("prayerConfig");

            // ---- habit plan diff ----
            List<AlarmStore.Spec> oldPlan = AlarmStore.loadHabitPlan(ctx);
            Set<String> newIds = new HashSet<>();
            for (AlarmStore.Spec s : newPlan) newIds.add(s.id);

            int cancelled = 0;
            for (AlarmStore.Spec old : oldPlan) {
                if (!newIds.contains(old.id)) {
                    AlarmScheduler.cancel(ctx, old.id);
                    cancelled++;
                }
            }
            int scheduled = 0;
            for (AlarmStore.Spec spec : newPlan) {
                AlarmScheduler.schedule(ctx, spec); // future-only inside
                if (spec.at > System.currentTimeMillis()) scheduled++;
            }
            AlarmStore.saveHabitPlan(ctx, newPlan);

            // ---- prayer engine ----
            if (cfgJson == null) {
                // Prayer alarms disabled → cancel whatever was scheduled.
                AlarmStore.PrayerConfig previous = AlarmStore.loadPrayerConfig(ctx);
                if (previous != null) {
                    AlarmScheduler.cancelPrayerAlarms(ctx, previous);
                }
                AlarmStore.savePrayerConfig(ctx, null);
            } else {
                AlarmStore.PrayerConfig cfg = parsePrayerConfig(cfgJson);
                AlarmScheduler.cancelPrayerAlarms(ctx, cfg); // disabled prayers
                AlarmStore.savePrayerConfig(ctx, cfg);
                scheduled += AlarmScheduler.schedulePrayerAlarms(ctx, cfg);
            }

            JSObject ret = new JSObject();
            ret.put("scheduled", scheduled);
            ret.put("cancelled", cancelled);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("অ্যালার্ম সিঙ্ক করা যায়নি: " + e.getMessage(), "SYNC_FAILED");
        }
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        try {
            Context ctx = getContext();
            for (AlarmStore.Spec spec : AlarmStore.loadHabitPlan(ctx)) {
                AlarmScheduler.cancel(ctx, spec.id);
            }
            AlarmStore.PrayerConfig cfg = AlarmStore.loadPrayerConfig(ctx);
            if (cfg != null) {
                AlarmScheduler.cancelPrayerAlarms(ctx, cfg);
            }
            AlarmScheduler.cancelDndRestore(ctx);
            AlarmStore.clearAll(ctx);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("বাতিল করা যায়নি", "CANCEL_FAILED");
        }
    }

    // =========================================================================
    // Pending actions queue
    // =========================================================================

    /** Read + clear the queued notification-button actions. */
    @PluginMethod
    public void getPendingActions(PluginCall call) {
        try {
            List<AlarmStore.PendingAction> actions =
                    AlarmStore.drainPending(getContext());
            JSArray arr = new JSArray();
            for (AlarmStore.PendingAction a : actions) {
                JSObject o = new JSObject();
                o.put("type", a.type);
                if (a.prayerKey != null) o.put("prayerKey", a.prayerKey);
                if (a.habitId != null) o.put("habitId", a.habitId);
                if (a.date != null) o.put("date", a.date);
                o.put("at", a.at);
                arr.put(o);
            }
            JSObject ret = new JSObject();
            ret.put("actions", arr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("সারি পড়া যায়নি", "PENDING_FAILED");
        }
    }

    // =========================================================================
    // Test alarm
    // =========================================================================

    @PluginMethod
    public void testAlarm(PluginCall call) {
        Integer seconds = call.getInt("seconds", 20);
        if (seconds == null) seconds = 20;
        int safeSeconds = Math.max(5, Math.min(120, seconds));

        AlarmStore.Spec spec = new AlarmStore.Spec();
        spec.id = "test-alarm-" + System.currentTimeMillis();
        spec.kind = "habit";
        spec.at = System.currentTimeMillis() + safeSeconds * 1000L;
        spec.title = "অভ্যাস পরীক্ষা";
        spec.body = "নোটিফিকেশন ইঞ্জিন কাজ করছে ✓";
        spec.channel = "habits";
        AlarmScheduler.schedule(getContext(), spec);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("at", spec.at);
        call.resolve(ret);
    }

    // =========================================================================
    // JSON → domain parsing
    // =========================================================================

    private static List<AlarmStore.Spec> parseSpecs(JSONArray arr) {
        List<AlarmStore.Spec> out = new ArrayList<>();
        if (arr == null) return out;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            out.add(AlarmStore.Spec.fromJson(o));
        }
        return out;
    }

    private static AlarmStore.PrayerConfig parsePrayerConfig(JSONObject o) {
        AlarmStore.PrayerConfig cfg = new AlarmStore.PrayerConfig();
        cfg.city = o.optString("city", cfg.city);
        cfg.lat = o.optDouble("lat", cfg.lat);
        cfg.lng = o.optDouble("lng", cfg.lng);
        cfg.offsetMin = o.optInt("offsetMin", 0);
        cfg.autoSilence = o.optBoolean("autoSilence", false);
        cfg.silenceMinutes = o.optInt("silenceMinutes", 15);
        cfg.horizonDays = o.optInt("horizonDays", 3);
        JSONArray prayers = o.optJSONArray("prayers");
        if (prayers != null) {
            for (int i = 0; i < prayers.length(); i++) {
                String key = prayers.optString(i);
                if (key != null) cfg.prayers.add(key);
            }
        }
        JSONObject t = o.optJSONObject("todayTimes");
        if (t != null) {
            cfg.todayDate = t.optString("date", null);
            cfg.tFajr = t.optString("fajr", null);
            cfg.tDhuhr = t.optString("dhuhr", null);
            cfg.tAsr = t.optString("asr", null);
            cfg.tMaghrib = t.optString("maghrib", null);
            cfg.tIsha = t.optString("isha", null);
        }
        return cfg;
    }
}
