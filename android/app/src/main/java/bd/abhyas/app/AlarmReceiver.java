package bd.abhyas.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * AlarmReceiver — where every scheduled alarm LANDS.
 *
 * Responsibilities per fire:
 *   1. Post the notification (Bengali copy from the spec, rich actions:
 *      prayer → [✓ হয়ে গেছে] [১৫ মিনিট ফোকাস]; habit → [✓ সম্পন্ন]
 *      [১০ মিনিট পর]).
 *   2. Prayer auto-silence: when enabled + DND access granted, switch the
 *      phone to real total silence and schedule the automatic restore —
 *      the "system-level interception at prayer time" flagship.
 *   3. Self-extension: every fired PRAYER alarm re-extends the horizon for
 *      the coming days (offline recalculation), so the engine keeps
 *      ringing after months without opening the app.
 *
 * Also handles the internal ACTION_RESTORE_DND one-shot (auto-DND expiry).
 */
public class AlarmReceiver extends BroadcastReceiver {

    public static final String CHANNEL_PRAYERS = "abhyas_prayers";
    public static final String CHANNEL_HABITS = "abhyas_habits";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        Context ctx = context.getApplicationContext();

        String action = intent.getAction();

        if (AlarmScheduler.ACTION_RESTORE_DND.equals(action)) {
            DndControl.disable(ctx);
            return;
        }

        if (!AlarmScheduler.ACTION_ALARM.equals(action)) return;

        AlarmStore.Spec spec = AlarmScheduler.specFromExtras(intent);
        ensureChannels(ctx);

        if ("prayer".equals(spec.kind)) {
            postPrayerNotification(ctx, spec);
            maybeAutoSilence(ctx);
            // Self-extension: keep the offline horizon alive indefinitely.
            AlarmStore.PrayerConfig cfg = AlarmStore.loadPrayerConfig(ctx);
            if (cfg != null) {
                AlarmScheduler.schedulePrayerAlarms(ctx, cfg);
            }
        } else {
            postHabitNotification(ctx, spec);
        }
    }

    // =========================================================================
    // Notifications
    // =========================================================================

    private void postPrayerNotification(Context ctx, AlarmStore.Spec spec) {
        PendingIntent done = actionPendingIntent(ctx, AlarmActionReceiver.ACTION_PRAYER_DONE,
                spec, /* copyAll */ false);
        PendingIntent focus = actionPendingIntent(ctx, AlarmActionReceiver.ACTION_FOCUS_15,
                spec, /* copyAll */ false);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_PRAYERS)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setColor(0xFF059669)
                .setContentTitle(spec.title)
                .setContentText(spec.body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(spec.body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(contentIntent(ctx))
                .addAction(0, "✓ হয়ে গেছে", done)
                .addAction(0, "১৫ মিনিট ফোকাস", focus);

        notifySafely(ctx, spec.id.hashCode(), b);
    }

    private void postHabitNotification(Context ctx, AlarmStore.Spec spec) {
        PendingIntent done = actionPendingIntent(ctx, AlarmActionReceiver.ACTION_HABIT_DONE,
                spec, /* copyAll */ false);
        PendingIntent snooze = actionPendingIntent(ctx, AlarmActionReceiver.ACTION_SNOOZE,
                spec, /* copyAll */ true); // snooze needs the whole spec to reschedule

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_HABITS)
                .setSmallIcon(android.R.drawable.ic_menu_agenda)
                .setColor(0xFF059669)
                .setContentTitle(spec.title)
                .setContentText(spec.body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(spec.body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(contentIntent(ctx))
                .addAction(0, "✓ সম্পন্ন", done)
                .addAction(0, "১০ মিনিট পর", snooze);

        notifySafely(ctx, spec.id.hashCode(), b);
    }

    /** App-launch intent for notification taps (singleTask MainActivity). */
    private PendingIntent contentIntent(Context ctx) {
        Intent launch = new Intent(ctx, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
                ctx,
                0,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** PendingIntent into the action receiver; optionally carrying the spec. */
    private PendingIntent actionPendingIntent(Context ctx, String action,
                                              AlarmStore.Spec spec, boolean copyAll) {
        Intent intent = new Intent(ctx, AlarmActionReceiver.class);
        intent.setAction(action);
        // The spec id lets the action receiver cancel this notification.
        intent.putExtra(AlarmActionReceiver.EXTRA_SPEC_ID, spec.id);
        if (spec.prayerKey != null) intent.putExtra(AlarmActionReceiver.EXTRA_PRAYER_KEY, spec.prayerKey);
        if (spec.prayerDate != null) intent.putExtra(AlarmActionReceiver.EXTRA_DATE, spec.prayerDate);
        if (spec.habitId != null) intent.putExtra(AlarmActionReceiver.EXTRA_HABIT_ID, spec.habitId);
        if (spec.habitDate != null) intent.putExtra(AlarmActionReceiver.EXTRA_DATE, spec.habitDate);
        if (spec.streak != 0) intent.putExtra(AlarmActionReceiver.EXTRA_STREAK, spec.streak);
        if (copyAll) {
            AlarmScheduler.putSpecExtras(intent, spec);
        }
        return PendingIntent.getBroadcast(
                ctx,
                (action + ":" + spec.id).hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** POST_NOTIFICATIONS-aware posting (silent degrade on API 33+ denial). */
    private void notifySafely(Context ctx, int id, NotificationCompat.Builder builder) {
        try {
            NotificationManagerCompat manager = NotificationManagerCompat.from(ctx);
            if (!manager.areNotificationsEnabled()) return; // honest degrade
            manager.notify(id, builder.build());
        } catch (SecurityException e) {
            // runtime permission revoked between check and post
        } catch (Exception ignored) {
            // a failed notification must never crash the alarm path
        }
    }

    // =========================================================================
    // Channels
    // =========================================================================

    /** Idempotent channel creation (called from every fire + plugin load). */
    public static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            NotificationManager nm = (NotificationManager)
                    ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationChannel prayers = new NotificationChannel(
                    CHANNEL_PRAYERS,
                    "নামাজের ওয়াক্ত",
                    NotificationManager.IMPORTANCE_HIGH
            );
            prayers.setDescription("ওয়াক্ত শুরুর নিখুঁত রিমাইন্ডার — নিখুঁত সময়ে বাজে");
            nm.createNotificationChannel(prayers);

            NotificationChannel habits = new NotificationChannel(
                    CHANNEL_HABITS,
                    "অভ্যাস রিমাইন্ডার",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            habits.setDescription("অভ্যাসের সময় হলে মনে করিয়ে দেয়");
            nm.createNotificationChannel(habits);
        } catch (Exception ignored) {
            // channel creation must never crash
        }
    }

    // =========================================================================
    // Prayer auto-silence (opt-in): real DND for the configured minutes
    // =========================================================================

    private void maybeAutoSilence(Context ctx) {
        AlarmStore.PrayerConfig cfg = AlarmStore.loadPrayerConfig(ctx);
        if (cfg == null || !cfg.autoSilence) return;
        if (!DndControl.hasPolicyAccess(ctx)) return; // honest degrade
        if (DndControl.isTotalSilence(ctx)) {
            // already silenced (e.g. user's own DND or a running focus
            // session) — just refresh the restore timer.
            AlarmScheduler.scheduleDndRestore(ctx, Math.max(1, cfg.silenceMinutes));
            return;
        }
        if (DndControl.enable(ctx)) {
            AlarmScheduler.scheduleDndRestore(ctx, Math.max(1, cfg.silenceMinutes));
        }
    }
}
