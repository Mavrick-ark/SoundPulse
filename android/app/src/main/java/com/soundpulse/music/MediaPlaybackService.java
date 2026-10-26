package com.soundpulse.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "soundpulse_media_playback";
    public static final int NOTIFICATION_ID = 2026;

    public static final String ACTION_PLAY = "com.soundpulse.music.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.soundpulse.music.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.soundpulse.music.ACTION_NEXT";
    public static final String ACTION_PREV = "com.soundpulse.music.ACTION_PREV";
    public static final String ACTION_STOP = "com.soundpulse.music.ACTION_STOP";
    public static final String ACTION_UPDATE_STATE = "com.soundpulse.music.ACTION_UPDATE_STATE";

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private String currentTitle = "SoundPulse Music";
    private String currentArtist = "Playing in Background";
    private boolean isPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireLocks();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SoundPulse Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background Music Playback and Notification Controls");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void acquireLocks() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SoundPulse::PlaybackWakeLock");
                wakeLock.acquire();
            }

            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null && (wifiLock == null || !wifiLock.isHeld())) {
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "SoundPulse::PlaybackWifiLock");
                wifiLock.acquire();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
                wifiLock = null;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();

            if (intent.hasExtra("title")) {
                currentTitle = intent.getStringExtra("title");
            }
            if (intent.hasExtra("artist")) {
                currentArtist = intent.getStringExtra("artist");
            }

            if (ACTION_UPDATE_STATE.equals(action)) {
                isPlaying = intent.getBooleanExtra("isPlaying", false);
                if (isPlaying) {
                    acquireLocks();
                } else {
                    releaseLocks();
                }
            } else if (ACTION_PLAY.equals(action)) {
                isPlaying = true;
                acquireLocks();
                updateNotification();
                MainActivity.dispatchMediaAction("play");
            } else if (ACTION_PAUSE.equals(action)) {
                isPlaying = false;
                releaseLocks();
                updateNotification();
                MainActivity.dispatchMediaAction("pause");
            } else if (ACTION_NEXT.equals(action)) {
                MainActivity.dispatchMediaAction("next");
            } else if (ACTION_PREV.equals(action)) {
                MainActivity.dispatchMediaAction("prev");
            } else if (ACTION_STOP.equals(action)) {
                isPlaying = false;
                releaseLocks();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        updateNotification();
        return START_STICKY;
    }

    private void updateNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openAppPending = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Previous Action
        Intent prevIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_PREV);
        PendingIntent prevPending = PendingIntent.getService(
            this,
            1,
            prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Play/Pause Action
        Intent toggleIntent = new Intent(this, MediaPlaybackService.class).setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY);
        PendingIntent togglePending = PendingIntent.getService(
            this,
            2,
            toggleIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Next Action
        Intent nextIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_NEXT);
        PendingIntent nextPending = PendingIntent.getService(
            this,
            3,
            nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText("SoundPulse Music")
            .setContentIntent(openAppPending)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending)
            .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, isPlaying ? "Pause" : "Play", togglePending)
            .addAction(android.R.drawable.ic_media_next, "Next", nextPending);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, builder.build());
        }
    }

    @Override
    public void onDestroy() {
        releaseLocks();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
