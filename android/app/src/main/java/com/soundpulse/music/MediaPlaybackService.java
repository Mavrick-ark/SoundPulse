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
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
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
    public static final String ACTION_PLAY_STREAM = "com.soundpulse.music.ACTION_PLAY_STREAM";
    public static final String ACTION_SEEK = "com.soundpulse.music.ACTION_SEEK";

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private MediaSession mediaSession;
    private AudioTrack silentAudioTrack;
    private MediaPlayer mediaPlayer;
    private Handler progressHandler;
    private Runnable progressRunnable;

    private String currentTitle = "SoundPulse Music";
    private String currentArtist = "Ready to Play";
    private String currentStreamUrl = null;
    private boolean isPlaying = false;
    private boolean isNativeStreaming = false;

    @Override
    public void onCreate() {
        super.onCreate();
        progressHandler = new Handler(Looper.getMainLooper());
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
                        handlePlay();
                    }

                    @Override
                    public void onPause() {
                        handlePause();
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
                    public void onSeekTo(long pos) {
                        handleSeek(pos);
                    }

                    @Override
                    public void onStop() {
                        handleStop();
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

    private void handlePlay() {
        isPlaying = true;
        acquireLocks();
        requestAudioFocus();
        if (isNativeStreaming && mediaPlayer != null) {
            try {
                mediaPlayer.start();
                startProgressReporting();
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            startNativeAudioKeepAlive();
        }
        updateNotification();
        updateMediaSessionState(true);
        MainActivity.dispatchMediaAction("play");
    }

    private void handlePause() {
        isPlaying = false;
        if (isNativeStreaming && mediaPlayer != null) {
            try {
                mediaPlayer.pause();
                stopProgressReporting();
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            stopNativeAudioKeepAlive();
        }
        updateNotification();
        updateMediaSessionState(false);
        MainActivity.dispatchMediaAction("pause");
    }

    private void handleSeek(long posMs) {
        if (isNativeStreaming && mediaPlayer != null) {
            try {
                mediaPlayer.seekTo((int) posMs);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        MainActivity.dispatchMediaAction("seek:" + (posMs / 1000.0));
    }

    private void handleStop() {
        isPlaying = false;
        releaseLocks();
        abandonAudioFocus();
        stopProgressReporting();
        stopNativeAudioKeepAlive();
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.reset();
            } catch (Exception e) {}
        }
        isNativeStreaming = false;
        updateMediaSessionState(false);
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        stopForeground(true);
        stopSelf();
    }

    private void updateMediaSessionState(boolean playing) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && mediaSession != null) {
            try {
                long pos = PlaybackState.PLAYBACK_POSITION_UNKNOWN;
                if (isNativeStreaming && mediaPlayer != null) {
                    try {
                        pos = mediaPlayer.getCurrentPosition();
                    } catch (Exception e) {}
                }
                PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                    .setActions(
                        PlaybackState.ACTION_PLAY |
                        PlaybackState.ACTION_PAUSE |
                        PlaybackState.ACTION_SKIP_TO_NEXT |
                        PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackState.ACTION_PLAY_PAUSE |
                        PlaybackState.ACTION_SEEK_TO |
                        PlaybackState.ACTION_STOP
                    )
                    .setState(
                        playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        pos,
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
                        .setOnAudioFocusChangeListener(focusChange -> {
                            // Maintain focus
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

    private void startNativeAudioKeepAlive() {
        try {
            if (silentAudioTrack == null) {
                int sampleRate = 44100;
                int bufferSize = AudioTrack.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                );
                if (bufferSize <= 0) bufferSize = 4096;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    silentAudioTrack = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build())
                        .setAudioFormat(new AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build())
                        .setBufferSizeInBytes(bufferSize)
                        .setTransferMode(AudioTrack.MODE_STREAM)
                        .build();
                } else {
                    silentAudioTrack = new AudioTrack(
                        AudioManager.STREAM_MUSIC,
                        sampleRate,
                        AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize,
                        AudioTrack.MODE_STREAM
                    );
                }

                silentAudioTrack.play();
                final byte[] silentBuffer = new byte[bufferSize];
                new Thread(() -> {
                    while (isPlaying && silentAudioTrack != null) {
                        try {
                            silentAudioTrack.write(silentBuffer, 0, silentBuffer.length);
                            Thread.sleep(150);
                        } catch (Exception e) {
                            break;
                        }
                    }
                }).start();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopNativeAudioKeepAlive() {
        try {
            if (silentAudioTrack != null) {
                silentAudioTrack.stop();
                silentAudioTrack.release();
                silentAudioTrack = null;
            }
        } catch (Exception e) {}
    }

    private void playStream(String url, String title, String artist, final long seekMs) {
        currentStreamUrl = url;
        currentTitle = title != null ? title : "SoundPulse Music";
        currentArtist = artist != null ? artist : "Playing";
        isNativeStreaming = true;
        isPlaying = true;

        acquireLocks();
        requestAudioFocus();
        stopNativeAudioKeepAlive();

        try {
            if (mediaPlayer == null) {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            } else {
                mediaPlayer.reset();
            }

            mediaPlayer.setDataSource(url);
            mediaPlayer.setOnPreparedListener(mp -> {
                if (seekMs > 0) {
                    mp.seekTo((int) seekMs);
                }
                mp.start();
                isPlaying = true;
                updateNotification();
                updateMediaSessionState(true);
                startProgressReporting();
            });

            mediaPlayer.setOnCompletionListener(mp -> {
                stopProgressReporting();
                MainActivity.dispatchMediaAction("next");
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                isNativeStreaming = false;
                stopProgressReporting();
                return false;
            });

            mediaPlayer.prepareAsync();
            updateNotification();
        } catch (Exception e) {
            e.printStackTrace();
            isNativeStreaming = false;
        }
    }

    private void startProgressReporting() {
        stopProgressReporting();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (isNativeStreaming && mediaPlayer != null && isPlaying) {
                    try {
                        double cur = mediaPlayer.getCurrentPosition() / 1000.0;
                        double dur = mediaPlayer.getDuration() / 1000.0;
                        MainActivity.dispatchTimeUpdate(cur, dur);
                        progressHandler.postDelayed(this, 300);
                    } catch (Exception e) {}
                }
            }
        };
        progressHandler.post(progressRunnable);
    }

    private void stopProgressReporting() {
        if (progressHandler != null && progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
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

            if (ACTION_PLAY_STREAM.equals(action)) {
                String url = intent.getStringExtra("url");
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                long seekMs = intent.getLongExtra("seekMs", 0);
                if (url != null) {
                    playStream(url, title, artist, seekMs);
                }
            } else if (ACTION_SEEK.equals(action)) {
                long seekMs = intent.getLongExtra("seekMs", 0);
                handleSeek(seekMs);
            } else if (ACTION_UPDATE_STATE.equals(action)) {
                isPlaying = intent.getBooleanExtra("isPlaying", false);
                if (isPlaying) {
                    acquireLocks();
                    requestAudioFocus();
                    if (!isNativeStreaming) {
                        startNativeAudioKeepAlive();
                    }
                } else {
                    releaseLocks();
                    stopNativeAudioKeepAlive();
                }
                updateMediaSessionState(isPlaying);
            } else if (ACTION_PLAY.equals(action)) {
                handlePlay();
            } else if (ACTION_PAUSE.equals(action)) {
                handlePause();
            } else if (ACTION_NEXT.equals(action)) {
                MainActivity.dispatchMediaAction("next");
            } else if (ACTION_PREV.equals(action)) {
                MainActivity.dispatchMediaAction("prev");
            } else if (ACTION_STOP.equals(action)) {
                handleStop();
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
        abandonAudioFocus();
        stopProgressReporting();
        stopNativeAudioKeepAlive();
        if (mediaPlayer != null) {
            try {
                mediaPlayer.release();
                mediaPlayer = null;
            } catch (Exception e) {}
        }
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
