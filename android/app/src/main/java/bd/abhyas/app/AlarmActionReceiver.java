package bd.abhyas.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * AlarmActionReceiver — notification ACTION BUTTONS that work with the app
 * closed.
 *
 *   [✓ হয়ে গেছে]  (prayer) → queued prayer-log action
 *   [✓ সম্পন্ন]    (habit)  → queued habit-toggle action
 *   [১০ মিনিট পর] (snooze) → reschedules the same alarm +10 minutes
 *   [১৫ মিনিট ফোকাস]        → real DND via DndControl + auto-restore
 *
 * Queued actions live in AlarmStore until the webview drains them on resume
 * (or live via the plugin's "alarmAction" event when the app is foreground).
 * Nothing here needs network, storage permissions or the app process — a
 * BroadcastReceiver on the default process wakes us just long enough.
 */
public class AlarmActionReceiver extends BroadcastReceiver {

    public static final String ACTION_PRAYER_DONE = "bd.abhyas.app.action.PRAYER_DONE";
    public static final String ACTION_HABIT_DONE = "bd.abhyas.app.action.HABIT_DONE";
    public static final String ACTION_SNOOZE = "bd.abhyas.app.action.SNOOZE";
    public static final String ACTION_FOCUS_15 = "bd.abhyas.app.action.FOCUS_15";

    static final String EXTRA_PRAYER_KEY = "bd.abhyas.app.extra.prayerKey";
    static final String EXTRA_HABIT_ID = "bd.abhyas.app.extra.habitId";
    static final String EXTRA_DATE = "bd.abhyas.app.extra.date";
    static final String EXTRA_STREAK = "bd.abhyas.app.extra.streak";
    /** Same extra key AlarmScheduler uses for the spec id (notification cancel). */
    static final String EXTRA_SPEC_ID = "bd.abhyas.app.extra.id";

    /** Snooze delay (minutes). */
    private static final int SNOOZE_MINUTES = 10;
    /** Focus length for the notification's focus action (minutes). */
    private static final int FOCUS_MINUTES = 15;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        Context ctx = context.getApplicationContext();
        String action = intent.getAction();

        switch (action) {
            case ACTION_PRAYER_DONE: {
                String key = intent.getStringExtra(EXTRA_PRAYER_KEY);
                String date = intent.getStringExtra(EXTRA_DATE);
                if (key == null || date == null) return;

                AlarmStore.PendingAction a = new AlarmStore.PendingAction();
                a.type = "prayer-done";
                a.prayerKey = key;
                a.date = date;
                a.at = System.currentTimeMillis();
                AlarmStore.appendPendingAction(ctx, a);

                cancelNotification(ctx, intent);
                notifyWebview(a);
                break;
            }
            case ACTION_HABIT_DONE: {
                String habitId = intent.getStringExtra(EXTRA_HABIT_ID);
                String date = intent.getStringExtra(EXTRA_DATE);
                if (habitId == null || date == null) return;

                AlarmStore.PendingAction a = new AlarmStore.PendingAction();
                a.type = "habit-done";
                a.habitId = habitId;
                a.date = date;
                a.at = System.currentTimeMillis();
                AlarmStore.appendPendingAction(ctx, a);

                cancelNotification(ctx, intent);
                notifyWebview(a);
                break;
            }
            case ACTION_SNOOZE: {
                AlarmStore.Spec spec = AlarmScheduler.specFromExtras(intent);
                spec.at = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000L;
                AlarmScheduler.schedule(ctx, spec);

                cancelNotification(ctx, intent);
                postQuietNotice(ctx, spec,
                        AlarmScheduler.toBn(SNOOZE_MINUTES) + " মিনিট পর আবার মনে করানো হবে");
                break;
            }
            case ACTION_FOCUS_15: {
                if (DndControl.hasPolicyAccess(ctx) && DndControl.enable(ctx)) {
                    AlarmScheduler.scheduleDndRestore(ctx, FOCUS_MINUTES);
                }
                cancelNotification(ctx, intent);
                break;
            }
            default:
                // unknown action — ignore
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /** Cancel the notification the button belonged to (same id space). */
    private void cancelNotification(Context ctx, Intent intent) {
        try {
            String id = intent.getStringExtra(EXTRA_SPEC_ID);
            if (id == null) return;
            NotificationManagerCompat.from(ctx).cancel(id.hashCode());
        } catch (Exception ignored) {
            // never crash
        }
    }

    /** Small heads-down confirmation for snooze. */
    private void postQuietNotice(Context ctx, AlarmStore.Spec spec, String text) {
        try {
            AlarmReceiver.ensureChannels(ctx);
            NotificationManagerCompat manager = NotificationManagerCompat.from(ctx);
            if (!manager.areNotificationsEnabled()) return;

            NotificationCompat.Builder b = new NotificationCompat.Builder(
                    ctx, AlarmReceiver.CHANNEL_HABITS)
                    .setSmallIcon(android.R.drawable.ic_menu_agenda)
                    .setColor(0xFF059669)
                    .setContentTitle(spec.title)
                    .setContentText(text)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setAutoCancel(true);
            manager.notify(("snooze-" + spec.id).hashCode(), b.build());
        } catch (Exception ignored) {
            // never crash
        }
    }

    /**
     * Live event into the webview when the app process happens to be alive
     * (the queue drain on resume remains the source of truth — this only
     * lowers latency for foreground use).
     */
    private void notifyWebview(AlarmStore.PendingAction action) {
        try {
            NativeAlarmPlugin.emitAction(action);
        } catch (Exception ignored) {
            // plugin not loaded / no webview — the queue still has it
        }
    }
}
