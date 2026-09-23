package bd.abhyas.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.HashMap;
import java.util.Map;

/**
 * AppInterceptor — "সময় শেষ হলে অ্যাপ খুললেই থামানোর স্ক্রিন।"
 *
 * The Phase-2 flagship: when an app whose daily budget is already crossed is
 * opened, a calm full-screen overlay appears over it — pulling the user back
 * to their habits instead of an endless scroll. This is the industry-standard
 * app-blocker pattern (Opal / AppBlock family):
 *
 *   • The watchdog ({@link UsageGuardService}) polls the foreground app every
 *     few seconds; when a LIMITED + OVER-BUDGET app is in the foreground and
 *     no cooldown is active, this class shows the overlay.
 *   • The overlay is a TYPE_APPLICATION_OVERLAY window — requires the user to
 *     grant "Display over other apps" (SYSTEM_ALERT_WINDOW special access,
 *     never granted silently). Without it the interceptor degrades honestly
 *     to the existing once-per-day notification.
 *   • COOLDOWNS (all per app, per day, persisted in SharedPreferences):
 *       – "৫ মিনিট বিরতি" button → 5-minute kitty-break (নিজের ইচ্ছায়)।
 *       – Tapping the scrim / auto-dismiss after 90 s → 60-second grace.
 *       – "অভ্যাসে ফিরে আসুন" → NO cooldown: coming back to the blocked app
 *         afterwards is exactly the moment worth intercepting again.
 *   • Every shown overlay bumps a per-day counter ("আজ কতবার থামানো হলো")
 *     which the স্ক্রিন-টাইম report celebrates.
 *
 * ── Trust model ─────────────────────────────────────────────────────────
 * The overlay always offers a visible way out, auto-dismisses after 90 s,
 * and only ever covers apps the user THEMSELVES put a budget on. It is a
 * nudge with an open door — never a lock.
 *
 * ── UI ──────────────────────────────────────────────────────────────────
 * Views are built programmatically (no XML resources) so this file is
 * self-contained; sizes use sp/dp so they respect the user's font scale.
 */
public final class AppInterceptor {

    private AppInterceptor() {
        // static utility
    }

    static final String KEY_INTERCEPT_ENABLED = "interception_enabled";
    private static final String KEY_COOLDOWN_PREFIX = "cooldown_"; // + date + "_" + pkg
    private static final String KEY_BLOCKED_PREFIX = "blocked_";   // + date

    /** "৫ মিনিট বিরতি" — the intentional kitty-break. */
    private static final long BREAK_COOLDOWN_MS = 5 * 60_000L;
    /** Scrim tap / auto-dismiss grace — never fight the user. */
    private static final long GRACE_COOLDOWN_MS = 60_000L;
    /** An unattended overlay must never trap the phone. */
    private static final long AUTO_DISMISS_MS = 90_000L;

    private static final int COLOR_SCRIM = 0xF20A0F0D;
    private static final int COLOR_CARD = 0xFF101913;
    private static final int COLOR_PRIMARY = 0xFF059669;
    private static final int COLOR_EMERALD_SOFT = 0xFFA7F3D0;
    private static final int COLOR_TEXT_MAIN = 0xFFF3F4F6;
    private static final int COLOR_TEXT_DIM = 0xFF9CA3AF;
    private static final int COLOR_TEXT_FAINT = 0xFF6B7280;

    /** The currently visible overlay (touched only on the main thread). */
    private static volatile View overlay;
    /** The package the current overlay is about (for cooldown writes). */
    private static volatile String overlayPkg;
    /** Main-thread handler for view work. */
    private static volatile Handler main;

    // =========================================================================
    // Config + permission
    // =========================================================================

    /** Interception armed by the user from the নিয়ন্ত্রণ কেন্দ্র? */
    public static boolean isEnabled(Context ctx) {
        return prefs(ctx).getBoolean(KEY_INTERCEPT_ENABLED, false);
    }

    public static void setEnabled(Context ctx, boolean enabled) {
        prefs(ctx).edit().putBoolean(KEY_INTERCEPT_ENABLED, enabled).apply();
    }

    /**
     * "Display over other apps" special access granted? (API 26+ only —
     * TYPE_APPLICATION_OVERLAY does not exist below; older devices degrade
     * to the watchdog notification.)
     */
    public static boolean isOverlayGranted(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        try {
            return Settings.canDrawOverlays(ctx);
        } catch (Exception e) {
            return false;
        }
    }

    /** Overlays shown today — the "কতবার থামানো হলো" celebration number. */
    public static int blockedToday(Context ctx) {
        return prefs(ctx).getInt(KEY_BLOCKED_PREFIX + UsageGuardPlugin.todayKey(), 0);
    }

    // =========================================================================
    // The interception check — called from the watchdog's fast loop
    // =========================================================================

    /**
     * Shows the overlay when the CURRENT foreground app is one the user put a
     * budget on, that budget is already crossed, and no cooldown is active.
     * Cheap no-op otherwise (one usage-events walk; the service only calls
     * this while interception is enabled).
     */
    public static void maybeIntercept(Context ctx) {
        if (overlay != null) return; // already advising
        if (!isOverlayGranted(ctx)) return;
        if (!UsageGuardPlugin.hasUsageAccess(ctx)) return;

        String pkg = currentForegroundApp(ctx);
        if (pkg == null || pkg.equals(ctx.getPackageName())) return;

        Map<String, Integer> limits = UsageGuardPlugin.getLimitsMap(ctx);
        Integer limitMin = limits.get(pkg);
        if (limitMin == null || limitMin <= 0) return;

        Map<String, Long> used = UsageGuardPlugin.foregroundMillisSince(
                ctx, UsageGuardPlugin.midnightToday());
        long usedMs = used.containsKey(pkg) ? used.get(pkg) : 0L;
        if (usedMs < limitMin * 60_000L) return; // still within budget

        if (inCooldown(ctx, pkg)) return;

        int usedMin = (int) Math.round(usedMs / 60000.0);
        showOverlay(ctx.getApplicationContext(), pkg, usedMin, limitMin);
    }

    /**
     * The app currently in the foreground, from today's UsageEvents stream:
     * the still-open interval (ACTIVITY_RESUMED without a matching
     * ACTIVITY_PAUSED) with the LATEST resume timestamp. Mirrors the pairing
     * logic of UsageGuardPlugin.foregroundMillisSince so the interceptor and
     * the scoreboard can never disagree.
     */
    private static String currentForegroundApp(Context ctx) {
        try {
            android.app.usage.UsageStatsManager usm =
                    (android.app.usage.UsageStatsManager)
                            ctx.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return null;
            long now = System.currentTimeMillis();
            android.app.usage.UsageEvents events =
                    usm.queryEvents(UsageGuardPlugin.midnightToday(), now);
            if (events == null) return null;

            android.app.usage.UsageEvents.Event e = new android.app.usage.UsageEvents.Event();
            Map<String, Long> openSince = new HashMap<>();
            while (events.hasNextEvent()) {
                events.getNextEvent(e);
                String p = e.getPackageName();
                if (p == null) continue;
                int t = e.getEventType();
                if (t == android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED) {
                    openSince.put(p, e.getTimeStamp());
                } else if (t == android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED) {
                    openSince.remove(p);
                }
            }
            String fg = null;
            long fgTs = 0L;
            for (Map.Entry<String, Long> en : openSince.entrySet()) {
                if (en.getValue() != null && en.getValue() > fgTs) {
                    fgTs = en.getValue();
                    fg = en.getKey();
                }
            }
            return fg;
        } catch (RuntimeException e) {
            return null; // access revoked mid-read — nothing measurable
        }
    }

    // =========================================================================
    // Cooldown bookkeeping (per app, per day)
    // =========================================================================

    private static boolean inCooldown(Context ctx, String pkg) {
        SharedPreferences p = prefs(ctx);
        long until = p.getLong(cooldownKey(pkg), 0L);
        return System.currentTimeMillis() < until;
    }

    private static void setCooldown(Context ctx, String pkg, long ms) {
        SharedPreferences p = prefs(ctx);
        p.edit().putLong(cooldownKey(pkg), System.currentTimeMillis() + ms).apply();
        purgeStale(p);
    }

    private static String cooldownKey(String pkg) {
        return KEY_COOLDOWN_PREFIX + UsageGuardPlugin.todayKey() + "_" + pkg;
    }

    /** Deletes cooldown/blocked keys from previous days (cheap hygiene). */
    private static void purgeStale(SharedPreferences p) {
        String today = UsageGuardPlugin.todayKey();
        SharedPreferences.Editor editor = null;
        for (String key : p.getAll().keySet()) {
            boolean stale = (key.startsWith(KEY_COOLDOWN_PREFIX) || key.startsWith(KEY_BLOCKED_PREFIX))
                    && !key.contains(today);
            if (stale) {
                if (editor == null) editor = p.edit();
                editor.remove(key);
            }
        }
        if (editor != null) editor.apply();
    }

    private static void bumpBlockedCount(Context ctx) {
        SharedPreferences p = prefs(ctx);
        String key = KEY_BLOCKED_PREFIX + UsageGuardPlugin.todayKey();
        p.edit().putInt(key, p.getInt(key, 0) + 1).apply();
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(UsageGuardPlugin.PREFS_NAME, Context.MODE_PRIVATE);
    }

    // =========================================================================
    // The overlay itself
    // =========================================================================

    private static void showOverlay(Context ctx, String pkg, int usedMin, int limitMin) {
        handler().post(new Runnable() {
            @Override
            public void run() {
                if (overlay != null) return;
                WindowManager wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
                if (wm == null) return;
                try {
                    View v = buildOverlayView(ctx, pkg, usedMin, limitMin);
                    WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
                    lp.type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
                    lp.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
                    lp.gravity = Gravity.CENTER;
                    lp.width = ViewGroup.LayoutParams.MATCH_PARENT;
                    lp.height = ViewGroup.LayoutParams.MATCH_PARENT;
                    wm.addView(v, lp);
                    overlay = v;
                    overlayPkg = pkg;
                    bumpBlockedCount(ctx);
                    // Never a trap: auto-dismiss with a grace period.
                    handler().postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            if (overlay == v) dismissOverlay(ctx, GRACE_COOLDOWN_MS);
                        }
                    }, AUTO_DISMISS_MS);
                } catch (Exception ignored) {
                    // Overlay permission revoked mid-flight / window hiccup —
                    // the notification watchdog still covers the user.
                }
            }
        });
    }

    /** Removes the overlay (main thread) and applies a cooldown. */
    private static void dismissOverlay(Context ctx, long cooldownMs) {
        handler().post(new Runnable() {
            @Override
            public void run() {
                if (overlay == null) return;
                try {
                    WindowManager wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
                    if (wm != null) wm.removeView(overlay);
                } catch (Exception ignored) {
                    // window already gone — nothing to clean
                }
                String pkg = overlayPkg;
                overlay = null;
                overlayPkg = null;
                if (cooldownMs > 0 && pkg != null) setCooldown(ctx, pkg, cooldownMs);
            }
        });
    }

    /** Touchable scrim → dismiss with grace (the open door). */
    private static View.OnClickListener dismissWithGrace(Context ctx) {
        return new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismissOverlay(ctx, GRACE_COOLDOWN_MS);
            }
        };
    }

    /** "অভ্যাসে ফিরে আসুন" — opens the app, no cooldown (own choice path). */
    private static View.OnClickListener returnToAbhyas(Context ctx) {
        return new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    Intent launch = new Intent(ctx, MainActivity.class);
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    PendingIntent pi = PendingIntent.getActivity(
                            ctx, 0, launch,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    pi.send(); // PendingIntent starts are always allowed
                } catch (Exception ignored) {
                    // fall back to just removing the overlay
                }
                dismissOverlay(ctx, 0L);
            }
        };
    }

    /** "৫ মিনিট বিরতি" — the user's own kitty-break. */
    private static View.OnClickListener takeBreak(Context ctx) {
        return new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismissOverlay(ctx, BREAK_COOLDOWN_MS);
            }
        };
    }

    // =========================================================================
    // Programmatic UI — dark card, emerald accent, Bengali copy
    // =========================================================================

    private static View buildOverlayView(Context ctx, String pkg, int usedMin, int limitMin) {
        String label = UsageGuardPlugin.getAppLabel(ctx, pkg);

        FrameLayout root = new FrameLayout(ctx);
        root.setBackgroundColor(COLOR_SCRIM);
        root.setOnClickListener(dismissWithGrace(ctx));

        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(COLOR_CARD);
        cardBg.setCornerRadius(dp(ctx, 28));
        card.setBackground(cardBg);
        int pad = dp(ctx, 28);
        card.setPadding(pad, pad, pad, dp(ctx, 24));
        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        int margin = dp(ctx, 28);
        cardLp.setMargins(margin, margin, margin, margin);
        // Card must not swallow scrim taps outside itself — root handles those.
        root.addView(card, cardLp);

        // App icon (raw bitmap; adaptive icons draw padded — fine at this size)
        Bitmap icon = loadAppIcon(ctx, pkg);
        if (icon != null) {
            ImageView iv = new ImageView(ctx);
            iv.setImageBitmap(icon);
            LinearLayout.LayoutParams ivLp = new LinearLayout.LayoutParams(
                    dp(ctx, 64), dp(ctx, 64));
            ivLp.gravity = Gravity.CENTER_HORIZONTAL;
            ivLp.bottomMargin = dp(ctx, 14);
            card.addView(iv, ivLp);
        }

        card.addView(text(ctx, "সময় শেষ", 22, COLOR_TEXT_MAIN, true, Gravity.CENTER_HORIZONTAL));
        card.addView(marginView(ctx, 4));
        card.addView(text(ctx, label, 15, COLOR_EMERALD_SOFT, false, Gravity.CENTER_HORIZONTAL));

        String usageLine = "আজ " + AlarmScheduler.toBn(usedMin) + " মিনিট চলেছে — সীমা ছিল "
                + AlarmScheduler.toBn(limitMin) + " মিনিট";
        card.addView(marginView(ctx, 6));
        card.addView(text(ctx, usageLine, 13, COLOR_TEXT_DIM, false, Gravity.CENTER_HORIZONTAL));

        card.addView(marginView(ctx, 14));
        card.addView(text(ctx, encouragement(), 14, COLOR_TEXT_MAIN, false, Gravity.CENTER_HORIZONTAL));

        card.addView(marginView(ctx, 22));

        // Primary: অভ্যাসে ফিরে আসুন
        Button back = new Button(ctx);
        back.setText("অভ্যাসে ফিরে আসুন");
        back.setTextColor(0xFFFFFFFF);
        back.setTypeface(Typeface.DEFAULT_BOLD);
        back.setTextSize(15);
        GradientDrawable backBg = new GradientDrawable();
        backBg.setColor(COLOR_PRIMARY);
        backBg.setCornerRadius(dp(ctx, 16));
        back.setBackground(backBg);
        back.setPadding(dp(ctx, 18), dp(ctx, 12), dp(ctx, 18), dp(ctx, 12));
        back.setOnClickListener(returnToAbhyas(ctx));
        LinearLayout.LayoutParams backLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        card.addView(back, backLp);

        // Secondary: ৫ মিনিট বিরতি
        Button rest = new Button(ctx);
        rest.setText("৫ মিনিট বিরতি");
        rest.setTextColor(COLOR_EMERALD_SOFT);
        rest.setTextSize(14);
        GradientDrawable restBg = new GradientDrawable();
        restBg.setColor(0x00000000);
        restBg.setCornerRadius(dp(ctx, 16));
        restBg.setStroke(dp(ctx, 1), COLOR_PRIMARY);
        rest.setBackground(restBg);
        rest.setPadding(dp(ctx, 18), dp(ctx, 10), dp(ctx, 18), dp(ctx, 10));
        rest.setOnClickListener(takeBreak(ctx));
        LinearLayout.LayoutParams restLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        restLp.topMargin = dp(ctx, 10);
        card.addView(rest, restLp);

        card.addView(marginView(ctx, 14));
        card.addView(text(ctx, "সিদ্ধান্ত সবসময় আপনার — এটা শুধু একটা মনে করিয়ে দেওয়া।",
                11, COLOR_TEXT_FAINT, false, Gravity.CENTER_HORIZONTAL));

        return root;
    }

    /** Rotating encouragement (deterministic per day; no attributed quotes). */
    private static String encouragement() {
        int day = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_YEAR);
        switch (Math.floorMod(day, 3)) {
            case 0:
                return "একটু থামুন। আজকের যা দরকার তা এমনিতেই হয়ে গেছে।";
            case 1:
                return "সময় জীবনের পুঁজি — এইটুকু বাঁচিয়ে রাখুন নিজের জন্য।";
            default:
                return "নিজেকে জিততে চাইলে এই মুহূর্তটাই সুযোগ।";
        }
    }

    private static TextView text(Context ctx, String s, float sp, int color,
                                 boolean bold, int gravity) {
        TextView tv = new TextView(ctx);
        tv.setText(s);
        tv.setTextSize(sp);
        tv.setTextColor(color);
        tv.setGravity(gravity);
        if (bold) tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setLineSpacing(dp(ctx, 2), 1f);
        return tv;
    }

    private static View marginView(Context ctx, int dp) {
        View v = new View(ctx);
        v.setLayoutParams(new LinearLayout.LayoutParams(1, dp(ctx, 1)));
        return v;
    }

    /** px for dp — respects the user's display density. */
    private static int dp(Context ctx, int dp) {
        return (int) Math.round(dp * ctx.getResources().getDisplayMetrics().density);
    }

    private static Bitmap loadAppIcon(Context ctx, String pkg) {
        Bitmap bmp = null;
        try {
            android.graphics.drawable.Drawable d = ctx.getPackageManager().getApplicationIcon(pkg);
            if (d == null) return null;
            int size = dp(ctx, 64);
            bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            d.setBounds(0, 0, size, size);
            d.draw(canvas);
            return bmp;
        } catch (Exception e) {
            if (bmp != null) bmp.recycle();
            return null;
        }
    }

    /** The one main-thread handler (lazy, safe from any thread). */
    private static Handler handler() {
        Handler h = main;
        if (h == null) {
            synchronized (AppInterceptor.class) {
                if (main == null) main = new Handler(Looper.getMainLooper());
                h = main;
            }
        }
        return h;
    }
}
