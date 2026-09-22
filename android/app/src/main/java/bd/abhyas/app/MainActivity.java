package bd.abhyas.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Native capability plugins must be registered BEFORE super.onCreate.
        // FocusMode → system-wide Do-Not-Disturb for the floating focus button.
        registerPlugin(FocusModePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
