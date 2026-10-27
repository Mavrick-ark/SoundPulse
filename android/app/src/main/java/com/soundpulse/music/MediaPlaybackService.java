package com.soundpulse.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import java.util.HashMap;
import java.util.Map;

public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "soundpulse_media_playback";
    public static final int NOTIFICATION_ID = 2026;

    public static final String ACTION_PLAY = "com.soundpulse.music.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.soundpulse.music.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.soundpulse.music.ACTION_NEXT";
    public static final String ACTION_PREV = "com.soundpulse.music.ACTION_PREV";
    public static final String ACTION_STOP = "com.soundpulse.music.ACTION_STOP";
    public static final String ACTION_UPDATE_STATE = "com.soundpulse.music.ACTION_UPDATE_STATE";
    public static final String ACTION_PLAY_TRACK = "com.soundpulse.music.ACTION_PLAY_TRACK";

    private static MediaPlaybackService instance;

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private MediaSession mediaSession;
    private MediaPlayer mediaPlayer;

    private String currentTitle = "SoundPulse Music";
    private String currentArtist = "Ready to Play";
    private String currentVideoId = "";
    private boolean isPlaying = false;

    public static MediaPlaybackService getInstance() {
        return instance;
    }

    public int getCurrentPosition() {
        try {
            if (mediaPlayer != null) {
                return mediaPlayer.getCurrentPosition();
            }
        } catch (Exception e) {}
        return 0;
    }

    public int getDuration() {
        try {
            if (mediaPlayer != null) {
                return mediaPlayer.getDuration();
            }
        } catch (Exception e) {}
        return 0;
    }

    public void seekTo(int positionMs) {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.seekTo(positionMs);
            }
        } catch (Exception e) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
        setupMediaSession();
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

    private void setupMediaSession() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                mediaSession = new MediaSession(this, "SoundPulseSession");
                mediaSession.setCallback(new MediaSession.Callback() {
                    @Override
                    public void onPlay() {
                        resumePlayback();
                    }

                    @Override
                    public void onPause() {
                        pausePlayback();
                    }

                    @Override
                    public void onSkipToNext() {
                        MainActivity.dispatchMediaAction("next");
                    }

                    @Override
                    public void onSkipToPrevious() {
                        MainActivity.dispatchMediaAction("prev");
                    }

                    @Override
                    public void onStop() {
                        pausePlayback();
                    }
                });
                mediaSession.setFlags(
                    MediaSession.FLAG_HANDLES_MEDIA_BUTTONS |
                    MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
                );
                mediaSession.setActive(true);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void updateMediaSessionState(boolean playing) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && mediaSession != null) {
            try {
                PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                    .setActions(
                        PlaybackState.ACTION_PLAY |
                        PlaybackState.ACTION_PAUSE |
                        PlaybackState.ACTION_SKIP_TO_NEXT |
                        PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackState.ACTION_PLAY_PAUSE |
                        PlaybackState.ACTION_STOP
                    )
                    .setState(
                        playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        getCurrentPosition(),
                        1.0f
                    );
                mediaSession.setPlaybackState(stateBuilder.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void requestAudioFocus() {
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(new AudioManager.OnAudioFocusChangeListener() {
                            @Override
                            public void onAudioFocusChange(int focusChange) {
                                if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
                                    pausePlayback();
                                }
                            }
                        })
                        .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void abandonAudioFocus() {
        try {
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void acquireLocks() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SoundPulse::PlaybackWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
            }

            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null && (wifiLock == null || !wifiLock.isHeld())) {
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "SoundPulse::PlaybackWifiLock");
                wifiLock.setReferenceCounted(false);
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

    public void playNativeTrack(final String title, final String artist, final String youtubeId, final String audioUrl) {
        currentTitle = title;
        currentArtist = artist;
        currentVideoId = youtubeId != null ? youtubeId : "";
        isPlaying = true;
        acquireLocks();
        requestAudioFocus();
        updateNotification();
        updateMediaSessionState(true);

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String streamUrl = audioUrl;
                    if (streamUrl == null || streamUrl.isEmpty() || !streamUrl.startsWith("http")) {
                        if (youtubeId != null && !youtubeId.isEmpty()) {
                            streamUrl = NativeStreamExtractor.getAudioStreamUrl(youtubeId);
                        }
                    }

                    if (streamUrl != null && !streamUrl.isEmpty()) {
                        initMediaPlayer(streamUrl);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

    private void initMediaPlayer(String streamUrl) {
        try {
            if (mediaPlayer == null) {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            } else {
                mediaPlayer.reset();
            }

            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());

            Map<String, String> headers = new HashMap<>();
            headers.put("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0");
            mediaPlayer.setDataSource(getApplicationContext(), Uri.parse(streamUrl), headers);

            mediaPlayer.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
                @Override
                public void onPrepared(MediaPlayer mp) {
                    mp.start();
                    isPlaying = true;
                    updateNotification();
                    updateMediaSessionState(true);
                }
            });

            mediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    MainActivity.dispatchMediaAction("next");
                }
            });

            mediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    return true;
                }
            });

            mediaPlayer.prepareAsync();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void pausePlayback() {
        isPlaying = false;
        try {
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                mediaPlayer.pause();
            }
        } catch (Exception e) {}
        updateNotification();
        updateMediaSessionState(false);
        MainActivity.dispatchMediaAction("pause");
    }

    public void resumePlayback() {
        isPlaying = true;
        acquireLocks();
        requestAudioFocus();
        try {
            if (mediaPlayer != null) {
                mediaPlayer.start();
            }
        } catch (Exception e) {}
        updateNotification();
        updateMediaSessionState(true);
        MainActivity.dispatchMediaAction("play");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();

            if (ACTION_PLAY_TRACK.equals(action)) {
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                String youtubeId = intent.getStringExtra("youtubeId");
                String audioUrl = intent.getStringExtra("audioUrl");
                playNativeTrack(title, artist, youtubeId, audioUrl);
            } else if (ACTION_PLAY.equals(action)) {
                resumePlayback();
            } else if (ACTION_PAUSE.equals(action)) {
                pausePlayback();
            } else if (ACTION_NEXT.equals(action)) {
                MainActivity.dispatchMediaAction("next");
            } else if (ACTION_PREV.equals(action)) {
                MainActivity.dispatchMediaAction("prev");
            } else if (ACTION_STOP.equals(action)) {
                isPlaying = false;
                try {
                    if (mediaPlayer != null) {
                        mediaPlayer.stop();
                        mediaPlayer.release();
                        mediaPlayer = null;
                    }
                } catch (Exception e) {}
                releaseLocks();
                abandonAudioFocus();
                updateMediaSessionState(false);
                if (mediaSession != null) {
                    mediaSession.setActive(false);
                }
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
        if (instance == this) {
            instance = null;
        }
        try {
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception e) {}
        releaseLocks();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
