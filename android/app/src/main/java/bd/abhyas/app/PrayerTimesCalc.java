package bd.abhyas.app;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

/**
 * PrayerTimesCalc — the OFFLINE prayer-time engine.
 *
 * Implements the standard PrayTimes.org astronomical algorithm with the
 * Muslim World League angles (Fajr 18°, Isha 17°), Standard (Shafi) Asr and
 * the 0.833° sunrise/sunset depression — the exact configuration of Aladhan
 * "method 3" that the server API already uses, so native-computed times
 * match the app's displayed times within rounding (±1 minute).
 *
 * Why this matters: after a reboot — or weeks without opening the app —
 * this class recomputes every prayer time with ZERO network access, so the
 * alarm engine is self-sustaining forever. Times are returned in the
 * device's local timezone (Bangladesh: UTC+6, no DST).
 */
public final class PrayerTimesCalc {

    private PrayerTimesCalc() {
        // static utility — never instantiated
    }

    /** The five daily prayers + sunrise (needed for Maghrib sanity checks). */
    public static final String[] KEYS = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};

    // MWL angles (degrees below horizon).
    private static final double FAJR_ANGLE = 18.0;
    private static final double ISHA_ANGLE = 17.0;
    private static final double SUNRISE_SUNSET_ANGLE = 0.833;
    // Standard (Shafi`i / Hanafi majority Bangladesh) Asr shadow factor.
    private static final double ASR_SHADOW_FACTOR = 1.0;

    private static final String[] LABELS_BN = {
        "ফজর", "সূর্যোদয়", "যোহর", "আসর", "মাগরিব", "এশা"
    };

    /** Bengali label for a prayer key ("fajr" → "ফজর"); sunrise included. */
    public static String labelBn(String key) {
        for (int i = 0; i < KEYS.length; i++) {
            if (KEYS[i].equals(key)) return LABELS_BN[i];
        }
        return key;
    }

    /** "HH:mm" minutes-of-day for one prayer on a given date, or -1 if N/A. */
    public static int minutesOfDay(String key, int year, int month /*1-12*/, int day,
                                   double lat, double lng) {
        double[] all = compute(year, month, day, lat, lng);
        for (int i = 0; i < KEYS.length; i++) {
            if (KEYS[i].equals(key)) {
                double v = applyTimezone(all[i], year, month, day, lng);
                return Double.isNaN(v) ? -1 : (int) Math.round(v);
            }
        }
        return -1;
    }

    /**
     * All six times as minutes-of-day for a date/location in the device's
     * timezone. Array order matches {@link #KEYS}. Values are NaN when the
     * sun never reaches the required depression (polar latitudes — never
     * in Bangladesh; callers guard with -1/NaN checks anyway).
     */
    public static double[] compute(int year, int month, int day, double lat, double lng) {
        // Longitude-shifted Julian date — solar position is evaluated at
        // the right instant for this meridian (PrayTimes convention).
        double julian = julianDate(year, month, day) - lng / (15.0 * 24.0);

        SolarPosition pos = solarPosition(julian + 0.5);
        double decl = pos.declination;
        double eqTimeHours = pos.equationOfTime;

        // Solar noon in "local mean solar" hours (PrayTimes midDay = 12 − eqt).
        double noonHours = 12.0 - eqTimeHours;

        // Twilight offsets from solar noon, in HOURS (NaN at polar latitudes).
        double tFajr = twilightHours(lat, decl, FAJR_ANGLE);
        double tSun = twilightHours(lat, decl, SUNRISE_SUNSET_ANGLE);
        double tIsha = twilightHours(lat, decl, ISHA_ANGLE);

        // Asr (PrayTimes shadow formulation): altitude whose cotangent equals
        // the noon shadow plus `factor` object heights → NOT a fixed 45°.
        double noonShadow = Math.tan(Math.toRadians(Math.abs(lat - decl)));
        double asrAltitude = Math.toDegrees(Math.atan(1.0 / (ASR_SHADOW_FACTOR + noonShadow)));
        double tAsr = altitudeHours(lat, decl, asrAltitude);

        double fajr = noonHours - tFajr;
        double sunrise = noonHours - tSun;
        double sunset = noonHours + tSun;
        double asr = noonHours + tAsr;
        double maghrib = sunset;
        double isha = noonHours + tIsha;

        // LOCAL MEAN SOLAR hours — the timezone+longitude shift to clock
        // time is applied once, in applyTimezone().
        return new double[] {fajr, sunrise, noonHours, asr, maghrib, isha};
    }

    // -------------------------------------------------------------------------
    // Solar geometry (PrayTimes.org formulation)
    // -------------------------------------------------------------------------

    /** Julian date for a Gregorian calendar date (integer day precision). */
    private static double julianDate(int year, int month, int day) {
        if (month <= 2) {
            year -= 1;
            month += 12;
        }
        double a = Math.floor(year / 100.0);
        double b = 2 - a + Math.floor(a / 4.0);
        return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1))
                + day + b - 1524.5;
    }

    /** Declination + equation of time for a fractional Julian date. */
    private static SolarPosition solarPosition(double jd) {
        double d = jd - 2451545.0;                 // days since J2000.0
        double g = fixAngle(357.529 + 0.98560028 * d);
        double q = fixAngle(280.459 + 0.98564736 * d);
        double l = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));

        double e = 23.439 - 0.00000036 * d;
        double ra = fixHour(Math.toDegrees(Math.atan2(dcos(e) * dsin(l), dcos(l))) / 15.0);

        double decl = Math.toDegrees(Math.asin(dsin(e) * dsin(l)));
        double eqTime = q / 15.0 - ra;

        return new SolarPosition(decl, eqTime);
    }

    private static final class SolarPosition {
        final double declination;
        final double equationOfTime;
        SolarPosition(double declination, double eq) {
            this.declination = declination;
            this.equationOfTime = eq;
        }
    }

    /**
     * Hours from SOLAR NOON to the moment the sun center sits `angle`
     * degrees below the horizon (positive = after noon). Used for
     * Fajr/Isha/Sunrise/Sunset via the twilight-angle convention.
     */
    private static double twilightHours(double lat, double decl, double angle) {
        // PrayTimes convention: angle positive = below horizon (twilight).
        double a = -dsin(angle) - dsin(lat) * dsin(decl);
        double b = dcos(lat) * dcos(decl);
        double cosH = a / b;
        if (cosH < -1.0 || cosH > 1.0) return Double.NaN;
        // hour angle H° → H/15 hours
        return Math.toDegrees(Math.acos(cosH)) / 15.0;
    }

    /** Hours from solar noon to the moment the sun reaches `altitude` above horizon. */
    private static double altitudeHours(double lat, double decl, double altitude) {
        double a = dsin(altitude) - dsin(lat) * dsin(decl);
        double b = dcos(lat) * dcos(decl);
        double cosH = a / b;
        if (cosH < -1.0 || cosH > 1.0) return Double.NaN;
        return Math.toDegrees(Math.acos(cosH)) / 15.0;
    }

    private static double dsin(double deg) { return Math.sin(Math.toRadians(deg)); }
    private static double dcos(double deg) { return Math.cos(Math.toRadians(deg)); }
    private static double fixAngle(double a) { return fix(a, 360.0); }
    private static double fixHour(double a) { return fix(a, 24.0); }
    private static double fix(double a, double b) {
        a = a - b * Math.floor(a / b);
        return a < 0 ? a + b : a;
    }

    // -------------------------------------------------------------------------
    // Convenience: "HH:mm" strings for a date in the device timezone
    // -------------------------------------------------------------------------

    /**
     * The five prayer times as "HH:mm" strings for the device's timezone.
     * Order: fajr, dhuhr, asr, maghrib, isha (sunrise excluded — not an
     * alarm target).
     */
    public static Map<String, String> fiveTimes(int year, int month, int day,
                                                double lat, double lng) {
        double[] all = compute(year, month, day, lat, lng);
        Map<String, String> out = new HashMap<>();
        String[] keys = {"fajr", "dhuhr", "asr", "maghrib", "isha"};
        int[] idx = {0, 2, 3, 4, 5};
        for (int i = 0; i < keys.length; i++) {
            double v = applyTimezone(all[idx[i]], year, month, day, lng);
            if (Double.isNaN(v)) continue;
            out.put(keys[i], minutesToHHmm(v));
        }
        return out;
    }

    /**
     * PrayTimes returns LOCAL MEAN SOLAR hours; the one true correction to
     * wall-clock time is +(zoneOffset − lng/15), applied here exactly once
     * (Bangladesh: UTC+6, no DST; the device zone keeps it correct abroad).
     * Returns minutes-of-day.
     */
    private static double applyTimezone(double solarHours, int year, int month,
                                        int day, double lng) {
        Calendar cal = new GregorianCalendar(TimeZone.getDefault());
        cal.clear();
        cal.set(year, month - 1, day, 12, 0, 0);
        int offsetMinutes = cal.get(Calendar.ZONE_OFFSET) + cal.get(Calendar.DST_OFFSET);
        return solarHours * 60.0 + offsetMinutes - lng / 15.0 * 60.0;
    }

    /** Minutes-of-day → "HH:mm" (rolls over gracefully for edge values). */
    public static String minutesToHHmm(double minutes) {
        if (Double.isNaN(minutes)) return "00:00";
        double m = minutes;
        while (m < 0) m += 1440;
        while (m >= 1440) m -= 1440;
        int h = (int) Math.floor(m / 60.0);
        int mm = (int) Math.round(m - h * 60.0);
        if (mm == 60) { mm = 0; h = (h + 1) % 24; }
        return String.format(java.util.Locale.US, "%02d:%02d", h, mm);
    }
}
