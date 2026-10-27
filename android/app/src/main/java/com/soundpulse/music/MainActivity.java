package com.soundpulse.music;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static MainActivity instance;

    public static MainActivity getInstance() {
        return instance;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);

            // Strip "Mobile Safari" to avoid mobile sleep heuristics
            try {
                String ua = settings.getUserAgentString();
                if (ua != null && ua.contains("Mobile")) {
                    settings.setUserAgentString(ua.replace("Mobile Safari", "Safari"));
                }
            } catch (Exception e) {}

            webView.addJavascriptInterface(new AudioBridge(), "NativeAudioBridge");
        }
    }

    @Override
    public void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    @Override
    public void onPause() {
        super.onPause();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().onResume();
            bridge.getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().onResume();
            bridge.getWebView().resumeTimers();
        }
    }

    public static void dispatchMediaAction(final String action) {
        if (instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
            instance.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String js = "if (window.__soundpulse_media_action) { window.__soundpulse_media_action('" + action + "'); }";
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                            instance.bridge.getWebView().evaluateJavascript(js, null);
                        } else {
                            instance.bridge.getWebView().loadUrl("javascript:" + js);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }

    public class AudioBridge {
        @JavascriptInterface
        public void playTrack(String title, String artist, String youtubeId, String audioUrl) {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_PLAY_TRACK);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
                intent.putExtra("youtubeId", youtubeId);
                intent.putExtra("audioUrl", audioUrl);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent);
                } else {
                    startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void pauseTrack() {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_PAUSE);
                startService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void resumeTrack() {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_PLAY);
                startService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public int getCurrentPosition() {
            MediaPlaybackService s = MediaPlaybackService.getInstance();
            return s != null ? s.getCurrentPosition() : 0;
        }

        @JavascriptInterface
        public int getDuration() {
            MediaPlaybackService s = MediaPlaybackService.getInstance();
            return s != null ? s.getDuration() : 0;
        }

        @JavascriptInterface
        public void seekTo(int positionMs) {
            MediaPlaybackService s = MediaPlaybackService.getInstance();
            if (s != null) {
                s.seekTo(positionMs);
            }
        }
    }
}
