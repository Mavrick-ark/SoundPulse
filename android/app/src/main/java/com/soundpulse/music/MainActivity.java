package com.soundpulse.music;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
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

        // Request POST_NOTIFICATIONS runtime permission for Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    1001
                );
            }
        }

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

    public static void dispatchTimeUpdate(final double current, final double duration) {
        if (instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
            instance.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String js = "if (window.__soundpulse_time_update) { window.__soundpulse_time_update(" + current + ", " + duration + "); }";
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
        public void notifyPlayback(String title, String artist, boolean isPlaying) {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_UPDATE_STATE);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
                intent.putExtra("isPlaying", isPlaying);
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
        public void playStream(String url, String title, String artist, double seekSeconds) {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_PLAY_STREAM);
                intent.putExtra("url", url);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
                intent.putExtra("seekMs", (long)(seekSeconds * 1000));
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
        public void pauseStream() {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_PAUSE);
                startService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void resumeStream() {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_PLAY);
                startService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void seekStream(double seekSeconds) {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_SEEK);
                intent.putExtra("seekMs", (long)(seekSeconds * 1000));
                startService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void stopPlayback() {
            try {
                Intent intent = new Intent(MainActivity.this, MediaPlaybackService.class);
                intent.setAction(MediaPlaybackService.ACTION_STOP);
                startService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getYouTubeMusicCookies() {
            try {
                android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                String c1 = cm.getCookie("https://music.youtube.com");
                String c2 = cm.getCookie("https://www.youtube.com");
                if (c1 != null && !c1.isEmpty()) return c1;
                if (c2 != null && !c2.isEmpty()) return c2;
            } catch (Exception e) {}
            return "";
        }

        @JavascriptInterface
        public void clearYouTubeMusicCookies() {
            try {
                android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                cm.removeAllCookies(null);
                cm.flush();
            } catch (Exception e) {}
        }
    }
}
