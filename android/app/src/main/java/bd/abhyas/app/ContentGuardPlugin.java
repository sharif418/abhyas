package bd.abhyas.app;

import android.content.Context;
import android.content.Intent;
import android.net.VpnService;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * ContentGuard — DNS-level content filtering for অভ্যাস.
 *
 * The bridge half of the DNS-filter VPN (the pattern used by Blokada /
 * personalDNSfilter / RethinkDNS). The heavy lifting lives in
 * {@link DnsVpnService}; this plugin is the honest switchboard:
 *
 *   • `start(mode, rules?)` — persists the mode + rules, then walks the
 *     system VPN-consent flow. Android shows the user the official "this app
 *     wants to set up a VPN connection" dialog ONCE (VpnService.prepare()).
 *     Nothing is ever granted silently; while that dialog is up we resolve
 *     `{ running:false, permissionNeeded:true }` and the web layer re-calls
 *     start() when the user returns.
 *   • `stop()` — one tap, always works. Being trivially able to turn the
 *     filter OFF is a hard product requirement (trust before control).
 *   • `getStatus()/getStats()` — real state: the service's static running
 *     flag plus the device-local day-scoped counters.
 *
 * MODES → upstream resolvers (defined in DnsVpnService):
 *   family → CleanBrowsing Family (adult-content blocking)
 *   security → Quad9 (malware/phishing blocking)
 *   ads → AdGuard DNS (ad/tracker blocking)
 *   custom → Cloudflare plain + the user's own block/allow rules
 *
 * PRIVACY: the VPN sees only DOMAIN NAMES — HTTPS contents are invisible by
 * construction. No browsing history leaves the device; the counters are plain
 * longs in SharedPreferences.
 */
@CapacitorPlugin(name = "ContentGuard")
public class ContentGuardPlugin extends Plugin {

    /** Rejected when VPN consent is required but could not be requested (matches content-plugin.ts). */
    static final String ERR_VPN_PERMISSION_REQUIRED = "VPN_PERMISSION_REQUIRED";
    static final String ERR_UNSUPPORTED = "UNSUPPORTED";
    static final String ERR_INVALID_MODE = "INVALID_MODE";
    static final String ERR_INVALID_ARGS = "INVALID_ARGS";

    private static final List<String> VALID_MODES =
            Arrays.asList("family", "security", "ads", "custom");

    // ── JS API ────────────────────────────────────────────────────────────

    /** Real current state — running flag + persisted mode + today's counters. */
    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("running", DnsVpnService.isRunning());
        String mode = DnsVpnService.getMode(ctx);
        ret.put("mode", mode == null ? JSONObject.NULL : mode);
        ret.put("blockedToday", DnsVpnService.getBlockedToday(ctx));
        ret.put("totalToday", DnsVpnService.getTotalToday(ctx));
        call.resolve(ret);
    }

    /**
     * Starts the filter in the given mode (rules optional — when omitted the
     * previously stored rules are kept). First start on a device shows the
     * system VPN-consent dialog; we resolve `permissionNeeded:true` instead
     * of pretending anything is filtering yet.
     */
    @PluginMethod
    public void start(PluginCall call) {
        String mode = call.getString("mode");
        if (mode == null || !VALID_MODES.contains(mode)) {
            call.reject("ফিল্টার মোড বৈধ নয় (family/security/ads/custom)", ERR_INVALID_MODE);
            return;
        }

        Context ctx = getContext();
        List<String> block = null;
        List<String> allow = null;
        JSObject rules = call.getObject("rules");
        if (rules != null) {
            block = stringList(rules.optJSONArray("block"));
            allow = stringList(rules.optJSONArray("allow"));
            if (block == null || allow == null) {
                call.reject("নিয়মের তালিকা বৈধ নয়", ERR_INVALID_ARGS);
                return;
            }
        }

        // Persist FIRST so a START_STICKY restart (or a start after consent)
        // re-establishes exactly what the user asked for.
        DnsVpnService.setMode(ctx, mode);
        if (block != null || allow != null) {
            if (block == null) block = DnsVpnService.getBlockList(ctx);
            if (allow == null) allow = DnsVpnService.getAllowList(ctx);
            DnsVpnService.setRules(ctx, block, allow);
        }

        try {
            // null → consent already granted (or this platform doesn't use VPN
            // consent) and we can start right away; non-null → the system
            // dialog must be answered by the human.
            Intent consent = VpnService.prepare(ctx);
            if (consent != null) {
                DnsVpnService.setPendingConsent(ctx, true);
                if (getActivity() != null) {
                    getActivity().startActivity(consent);
                } else {
                    consent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(consent);
                }
                JSObject ret = new JSObject();
                ret.put("running", false);
                ret.put("permissionNeeded", true);
                call.resolve(ret);
            } else {
                DnsVpnService.setPendingConsent(ctx, false);
                // Idempotent: a start intent while already running re-reads
                // prefs and re-establishes the tunnel ONLY if the mode changed.
                DnsVpnService.startVpn(ctx);
                JSObject ret = new JSObject();
                ret.put("running", true);
                call.resolve(ret);
            }
        } catch (android.content.ActivityNotFoundException e) {
            // No system VPN dialog available (heavily locked-down devices) —
            // the user must grant it manually from settings.
            call.reject("VPN সংযোগের অনুমতি দরকার — ফোনের সেটিংস থেকে অনুমতি দিন",
                    ERR_VPN_PERMISSION_REQUIRED);
        } catch (Exception e) {
            call.reject("সামগ্রী নিয়ন্ত্রণ চালু করা যায়নি", "START_FAILED");
        }
    }

    /** Stops the filter. Always honest: `ok:true`, always reversible. */
    @PluginMethod
    public void stop(PluginCall call) {
        DnsVpnService.stopVpn(getContext());
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    /** Today's device-local counters (date-scoped, reset at midnight). */
    @PluginMethod
    public void getStats(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("blockedToday", DnsVpnService.getBlockedToday(ctx));
        ret.put("totalToday", DnsVpnService.getTotalToday(ctx));
        call.resolve(ret);
    }

    /** Returns the persisted custom block/allow lists (for the rules editor). */
    @PluginMethod
    public void getRules(PluginCall call) {
        Context ctx = getContext();
        JSObject rules = new JSObject();
        rules.put("block", new org.json.JSONArray(new ArrayList<>(DnsVpnService.getBlockList(ctx))));
        rules.put("allow", new org.json.JSONArray(new ArrayList<>(DnsVpnService.getAllowList(ctx))));
        JSObject ret = new JSObject();
        ret.put("rules", rules);
        call.resolve(ret);
    }

    /**
     * Replaces the custom block/allow lists. Applied on the next start; when
     * the filter is running right now the lists are ALSO pushed live into the
     * service (a volatile swap on the reader thread — no tunnel restart
     * needed for rule changes).
     */
    @PluginMethod
    public void setRules(PluginCall call) {
        JSObject rules = call.getObject("rules");
        if (rules == null) {
            call.reject("নিয়ম (rules) দরকার", ERR_INVALID_ARGS);
            return;
        }
        List<String> block = stringList(rules.optJSONArray("block"));
        List<String> allow = stringList(rules.optJSONArray("allow"));
        if (block == null || allow == null) {
            call.reject("নিয়মের তালিকা বৈধ নয়", ERR_INVALID_ARGS);
            return;
        }
        Context ctx = getContext();
        DnsVpnService.setRules(ctx, block, allow);
        DnsVpnService.pushRulesIfRunning(ctx);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    // ── Internals ────────────────────────────────────────────────────────

    /**
     * Reads a JSON array of domain strings into a normalized (trimmed,
     * lowercased) List. Returns null when the array itself is absent/invalid
     * so callers can distinguish "not provided" from "empty".
     */
    private static List<String> stringList(org.json.JSONArray array) {
        if (array == null) return null;
        List<String> out = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            String item = array.optString(i, null);
            if (item == null) continue;
            String normalized = item.trim().toLowerCase(Locale.US);
            if (!normalized.isEmpty()) out.add(normalized);
        }
        return out;
    }
}
