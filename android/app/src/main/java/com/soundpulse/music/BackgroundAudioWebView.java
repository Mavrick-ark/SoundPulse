package com.soundpulse.music;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.webkit.WebView;

public class BackgroundAudioWebView extends WebView {

    public BackgroundAudioWebView(Context context) {
        super(context);
    }

    public BackgroundAudioWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public BackgroundAudioWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        // Intercept Android's hide/gone signal so Chromium does not suspend audio decoders when screen locks
        if (visibility == View.GONE || visibility == View.INVISIBLE) {
            super.onWindowVisibilityChanged(View.VISIBLE);
        } else {
            super.onWindowVisibilityChanged(visibility);
        }
    }

    @Override
    public void onPause() {
        // Prevent Chromium from freezing media decoders and pausing iframes on activity pause
    }

    @Override
    public void pauseTimers() {
        // Keep JavaScript timers running continuously for audio playback and watchdog loops
    }
}
