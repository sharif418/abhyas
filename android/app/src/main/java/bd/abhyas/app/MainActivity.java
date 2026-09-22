package bd.abhyas.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Native capability plugins must be registered BEFORE super.onCreate.
        // FocusMode   → system-wide Do-Not-Disturb for the floating focus button.
        // UsageGuard  → per-app daily time budgets (UsageStatsManager + watchdog service).
        // ContentGuard → DNS-level content filtering VPN (family/security/ads/custom).
        registerPlugin(FocusModePlugin.class);
        registerPlugin(UsageGuardPlugin.class);
        registerPlugin(ContentGuardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
