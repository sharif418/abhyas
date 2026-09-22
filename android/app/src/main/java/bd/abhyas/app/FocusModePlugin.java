package bd.abhyas.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * FocusMode — system-wide notification suppression for অভ্যাস.
 *
 * Powers the global floating focus button: while the user reads Quran, does
 * Zikr or deep work, EVERY notification from EVERY app (WhatsApp, Messenger,
 * Facebook, …), plus calls and ringtones, is silenced at the Android OS level
 * through the Do-Not-Disturb "total silence" interruption filter.
 *
 * ── Permission model ─────────────────────────────────────────────────────
 * Android gates DND control behind a special app access:
 * `Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS`. The user grants it
 * once from a system screen; nothing is granted silently at install time.
 * IMPORTANT privacy note (mirrored in the app UI): this access lets the app
 * switch DND on/off — it can NEVER read notification contents.
 *
 * ── Truthfulness ─────────────────────────────────────────────────────────
 * `getStatus()` reports the phone's REAL current filter, so the JS layer can
 * re-sync on app resume and the floating button never lies (e.g. if the user
 * toggles DND from quick settings, or the app was killed mid-session).
 *
 * ── Roadmap hooks ────────────────────────────────────────────────────────
 * This plugin is the first of the phone-control family. Planned siblings:
 * UsageStatsManager (per-app social-media time budgets) and an app-blocking
 * service — both follow the same pattern: explicit user permission, honest
 * status reporting, graceful degradation.
 */
@CapacitorPlugin(name = "FocusMode")
public class FocusModePlugin extends Plugin {

    /** Rejected whenever DND access has not been granted yet. */
    static final String ERR_DND_ACCESS_REQUIRED = "DND_ACCESS_REQUIRED";
    static final String ERR_UNSUPPORTED = "UNSUPPORTED";
    static final String ERR_SETTINGS_UNAVAILABLE = "SETTINGS_UNAVAILABLE";

    private static final String PREFS_NAME = "abhyas_focus_mode";
    private static final String KEY_PREVIOUS_FILTER = "previous_filter";

    private NotificationManager notificationManager() {
        return (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** DND access granted? (always false below Android 6.0) */
    private boolean hasPolicyAccess() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        try {
            return notificationManager().isNotificationPolicyAccessGranted();
        } catch (SecurityException e) {
            return false;
        }
    }

    /** True only while the phone is in "total silence" (our focus state). */
    private boolean isTotalSilence() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        try {
            return notificationManager().getCurrentInterruptionFilter()
                    == NotificationManager.INTERRUPTION_FILTER_NONE;
        } catch (SecurityException e) {
            return false;
        }
    }

    // ── JS API ────────────────────────────────────────────────────────────

    @PluginMethod
    public void isAccessGranted(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasPolicyAccess());
        call.resolve(ret);
    }

    /**
     * Opens the system "Do Not Disturb access" settings screen where the
     * user grants the one-time permission. Resolves immediately with
     * `opened: true`; the JS layer re-checks status when the user returns.
     */
    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.reject("এই ফিচারটি Android 6.0+ প্রয়োজন", ERR_UNSUPPORTED);
            return;
        }
        if (hasPolicyAccess()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("opened", false);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
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

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasPolicyAccess());
        ret.put("active", isTotalSilence());
        call.resolve(ret);
    }

    /**
     * Enables focus: remembers the phone's current interruption filter,
     * then switches to total silence (all apps' notifications + calls +
     * ringtones suppressed). Persists the "previous" filter so a later
     * `disable()` — even after an app restart — restores exactly what the
     * user had before.
     */
    @PluginMethod
    public void enable(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.reject("এই ফিচারটি Android 6.0+ প্রয়োজন", ERR_UNSUPPORTED);
            return;
        }
        if (!hasPolicyAccess()) {
            call.reject("Do Not Disturb অনুমতি দরকার", ERR_DND_ACCESS_REQUIRED);
            return;
        }
        try {
            NotificationManager nm = notificationManager();
            int current = nm.getCurrentInterruptionFilter();
            if (current != NotificationManager.INTERRUPTION_FILTER_NONE) {
                int previous = current == NotificationManager.INTERRUPTION_FILTER_UNKNOWN
                        ? NotificationManager.INTERRUPTION_FILTER_ALL
                        : current;
                prefs().edit().putInt(KEY_PREVIOUS_FILTER, previous).apply();
            }
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE);

            JSObject ret = new JSObject();
            ret.put("active", true);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Do Not Disturb অনুমতি দরকার", ERR_DND_ACCESS_REQUIRED);
        } catch (Exception e) {
            call.reject("ফোকাস মোড চালু করা যায়নি", "ENABLE_FAILED");
        }
    }

    /**
     * Disables focus: restores the interruption filter the phone had before
     * focus was enabled (defaults to "all notifications" if unknown).
     */
    @PluginMethod
    public void disable(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.reject("এই ফিচারটি Android 6.0+ প্রয়োজন", ERR_UNSUPPORTED);
            return;
        }
        if (!hasPolicyAccess()) {
            call.reject("Do Not Disturb অনুমতি দরকার", ERR_DND_ACCESS_REQUIRED);
            return;
        }
        try {
            NotificationManager nm = notificationManager();
            int previous = prefs().getInt(KEY_PREVIOUS_FILTER,
                    NotificationManager.INTERRUPTION_FILTER_ALL);
            nm.setInterruptionFilter(previous);

            JSObject ret = new JSObject();
            ret.put("active", previous == NotificationManager.INTERRUPTION_FILTER_NONE);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Do Not Disturb অনুমতি দরকার", ERR_DND_ACCESS_REQUIRED);
        } catch (Exception e) {
            call.reject("ফোকাস মোড বন্ধ করা যায়নি", "DISABLE_FAILED");
        }
    }
}
