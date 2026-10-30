package com.soundpulse.music;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

/**
 * YouTubeLoginActivity
 * Dedicated login activity designed after LastWave-Native (YouTubeLoginScreen.kt).
 * Opens Google's official YouTube sign-in page with a clean Chrome user-agent
 * (stripping embedded WebView tokens so Google doesn't block with "Browser or app may not be secure"),
 * monitors cookie arrival via CookieManager, and automatically captures the session
 * and finishes when SAPISID / __Secure-3PAPISID is detected.
 */
public class YouTubeLoginActivity extends AppCompatActivity {

    public static final String LOGIN_URL =
        "https://accounts.google.com/ServiceLogin?service=youtube&uilel=3&passive=true&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue%26app%3Ddesktop%26hl%3Den%26next%3Dhttps%253A%252F%252Fmusic.youtube.com%252F&hl=en";

    private WebView webView;
    private ProgressBar progressBar;
    private TextView statusTextView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean cookieCaptured = false;

    private final Runnable cookieCheckerRunnable = new Runnable() {
        @Override
        public void run() {
            if (cookieCaptured || isFinishing()) return;
            checkAndExtractCookies();
            handler.postDelayed(this, 1000);
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Build UI programmatically to avoid resource/XML dependencies
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(Color.parseColor("#0e101a"));
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Custom Top Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setBackgroundColor(Color.parseColor("#151828"));
        int padding = (int) (12 * getResources().getDisplayMetrics().density);
        topBar.setPadding(padding, padding, padding, padding);
        topBar.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        // Back / Close button
        TextView closeBtn = new TextView(this);
        closeBtn.setText("✕");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setTextSize(18);
        closeBtn.setPadding(padding / 2, padding / 4, padding, padding / 4);
        closeBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
        topBar.addView(closeBtn);

        // Title and Status
        LinearLayout textContainer = new LinearLayout(this);
        textContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1.0f
        );
        textContainer.setLayoutParams(textParams);

        TextView titleTextView = new TextView(this);
        titleTextView.setText("Sign in to YouTube Music");
        titleTextView.setTextColor(Color.WHITE);
        titleTextView.setTextSize(15);
        titleTextView.setTypeface(null, android.graphics.Typeface.BOLD);
        textContainer.addView(titleTextView);

        statusTextView = new TextView(this);
        statusTextView.setText("Waiting for sign-in...");
        statusTextView.setTextColor(Color.parseColor("#ec4899")); // Pink
        statusTextView.setTextSize(11);
        textContainer.addView(statusTextView);

        topBar.addView(textContainer);
        rootLayout.addView(topBar);

        // Progress bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            (int) (3 * getResources().getDisplayMetrics().density)
        ));
        progressBar.setMax(100);
        progressBar.setProgress(0);
        rootLayout.addView(progressBar);

        // FrameLayout for WebView
        FrameLayout webViewContainer = new FrameLayout(this);
        webViewContainer.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1.0f
        ));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webViewContainer.addView(webView);
        rootLayout.addView(webViewContainer);

        setContentView(rootLayout);

        // Configure CookieManager
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // Configure WebView settings (matching LastWave YouTubeLoginScreen.kt)
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Clean user agent: strip "; wv" and "Version/X.X" to avoid Google's "disallowed_useragent" blocker
        try {
            String originalUa = settings.getUserAgentString();
            if (originalUa != null) {
                String cleanedUa = originalUa
                    .replace("; wv", "")
                    .replaceAll("Version/\\d+\\.\\d+\\s*", "");
                settings.setUserAgentString(cleanedUa);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (progressBar != null) {
                    progressBar.setProgress(newProgress);
                    if (newProgress >= 100) {
                        progressBar.setVisibility(View.GONE);
                    } else {
                        progressBar.setVisibility(View.VISIBLE);
                    }
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                checkAndExtractCookies();
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                checkAndExtractCookies();
            }
        });

        webView.loadUrl(LOGIN_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.post(cookieCheckerRunnable);
    }

    @Override
    protected void onPause() {
        super.onPause();
        handler.removeCallbacks(cookieCheckerRunnable);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(cookieCheckerRunnable);
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private synchronized void checkAndExtractCookies() {
        if (cookieCaptured || isFinishing()) return;

        try {
            CookieManager cookieManager = CookieManager.getInstance();
            String ytmCookies = cookieManager.getCookie("https://music.youtube.com");
            String ytCookies = cookieManager.getCookie("https://www.youtube.com");
            String googleCookies = cookieManager.getCookie("https://accounts.google.com");

            String combined = "";
            if (ytmCookies != null && !ytmCookies.isEmpty()) {
                combined += ytmCookies;
            }
            if (ytCookies != null && !ytCookies.isEmpty()) {
                if (!combined.isEmpty() && !combined.endsWith("; ")) combined += "; ";
                combined += ytCookies;
            }
            if (googleCookies != null && !googleCookies.isEmpty()) {
                if (!combined.isEmpty() && !combined.endsWith("; ")) combined += "; ";
                combined += googleCookies;
            }

            // Check if user session tokens are present
            if (hasSessionTokens(combined)) {
                cookieCaptured = true;
                cookieManager.flush();

                if (statusTextView != null) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            statusTextView.setText("Session detected! Importing...");
                            statusTextView.setTextColor(Color.parseColor("#10b981")); // Emerald
                        }
                    });
                }

                // Dispatch to MainActivity to bridge into web application
                final String finalCookies = combined;
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        MainActivity.dispatchCookieCaptured(finalCookies);
                        finish();
                    }
                }, 400);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static boolean hasSessionTokens(String cookies) {
        if (cookies == null || cookies.isEmpty()) return false;
        return (cookies.contains("SAPISID=") || cookies.contains("__Secure-3PAPISID=")) &&
               (cookies.contains("SSID=") || cookies.contains("SID=") || cookies.contains("LOGIN_INFO="));
    }
}
