package bd.abhyas.app;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * DndControl — the ONE owner of system-wide Do-Not-Disturb switching.
 *
 * Extracted from FocusModePlugin so the floating focus button, the prayer
 * auto-silence (AlarmReceiver) and the notification's [১৫ মিনিট ফোকাস]
 * action all share a single previous-filter bookkeeping: whoever silenced
 * the phone, the same stored filter is restored — they can never fight or
 * clobber each other's "before" state.
 *
 * Permission model unchanged: the user grants
 * Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS once; this access can
 * switch DND on/off but can NEVER read notification contents.
 */
public final class DndControl {

    private DndControl() {
        // static utility
    }

    /** Same prefs file the original FocusModePlugin used (state continuity). */
    private static final String PREFS_NAME = "abhyas_focus_mode";
    private static final String KEY_PREVIOUS_FILTER = "previous_filter";

    private static NotificationManager nm(Context ctx) {
        return (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** DND policy access granted? (always false below Android 6.0) */
    public static boolean hasPolicyAccess(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        try {
            return nm(ctx).isNotificationPolicyAccessGranted();
        } catch (SecurityException e) {
            return false;
        }
    }

    /** True only while the phone is in total silence (our focus state). */
    public static boolean isTotalSilence(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        try {
            return nm(ctx).getCurrentInterruptionFilter()
                    == NotificationManager.INTERRUPTION_FILTER_NONE;
        } catch (SecurityException e) {
            return false;
        }
    }

    /**
     * Enable total silence. Remembers the phone's current interruption
     * filter (once — repeated calls while already silenced keep the original
     * "before" state) so disable() restores exactly what the user had.
     *
     * @return true when the switch actually happened.
     */
    public static boolean enable(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        if (!hasPolicyAccess(ctx)) return false;
        try {
            NotificationManager manager = nm(ctx);
            int current = manager.getCurrentInterruptionFilter();
            if (current != NotificationManager.INTERRUPTION_FILTER_NONE) {
                // Only remember a real "before" filter; UNKNOWN → sensible ALL.
                int previous = current == NotificationManager.INTERRUPTION_FILTER_UNKNOWN
                        ? NotificationManager.INTERRUPTION_FILTER_ALL
                        : current;
                prefs(ctx).edit().putInt(KEY_PREVIOUS_FILTER, previous).apply();
            }
            manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Restore the interruption filter the phone had before silencing
     * (defaults to "all notifications" when unknown).
     *
     * @return true when the switch actually happened.
     */
    public static boolean disable(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        if (!hasPolicyAccess(ctx)) return false;
        try {
            int previous = prefs(ctx).getInt(KEY_PREVIOUS_FILTER,
                    NotificationManager.INTERRUPTION_FILTER_ALL);
            nm(ctx).setInterruptionFilter(previous);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
