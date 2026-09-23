package bd.abhyas.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * BootReceiver — the reboot-survival guarantee.
 *
 * AlarmManager alarms are wiped when the phone powers off. This receiver
 * rebuilds EVERYTHING from the AlarmStore on:
 *   • BOOT_COMPLETED   — phone restarted
 *   • MY_PACKAGE_REPLACED — app updated
 *   • TIME_SET / TIMEZONE_CHANGED — manual clock or zone change
 *
 * 100% offline: habit specs come from the store, prayer times from the
 * native PrayerTimesCalc engine. No network, no webview, no user action —
 * the next ওয়াক্ত rings exactly on time after a restart.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();

        boolean relevant =
                Intent.ACTION_BOOT_COMPLETED.equals(action)
                        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                        || Intent.ACTION_TIME_CHANGED.equals(action)
                        || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
        if (!relevant) return;

        try {
            AlarmScheduler.rescheduleAll(context.getApplicationContext());
        } catch (Exception ignored) {
            // a failed reschedule must never crash the boot path
        }
    }
}
