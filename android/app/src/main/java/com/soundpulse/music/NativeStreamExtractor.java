package com.soundpulse.music;

import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class NativeStreamExtractor {
    private static volatile boolean initialized = false;
    private static OkHttpClient httpClient;

    private static synchronized void init() {
        if (!initialized) {
            httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build();

            NewPipe.init(new OkHttpDownloader(httpClient), new Localization("US", "en"));
            initialized = true;
        }
    }

    public static String getAudioStreamUrl(String videoId) throws Exception {
        init();
        String url = "https://www.youtube.com/watch?v=" + videoId;
        StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube, url);
        List<AudioStream> streams = info.getAudioStreams();
        if (streams == null || streams.isEmpty()) {
            throw new IOException("No audio streams found for " + videoId);
        }

        // Prefer m4a (aac) or opus (webm) with highest bitrate
        AudioStream best = streams.get(0);
        for (AudioStream s : streams) {
            if (s.getFormat() != null && s.getFormat().getName().equalsIgnoreCase("m4a")) {
                best = s;
                break;
            }
        }
        return best.getContent();
    }

    private static class OkHttpDownloader extends Downloader {
        private final OkHttpClient client;

        public OkHttpDownloader(OkHttpClient client) {
            this.client = client;
        }

        @Override
        public Response execute(Request request) throws IOException {
            okhttp3.Request.Builder builder = new okhttp3.Request.Builder()
                .url(request.url());

            byte[] dataToSend = request.dataToSend();
            if (dataToSend != null) {
                builder.method(request.httpMethod(), RequestBody.create(dataToSend, MediaType.parse("application/json; charset=utf-8")));
            } else if ("POST".equalsIgnoreCase(request.httpMethod())) {
                builder.method("POST", RequestBody.create(new byte[0], null));
            } else {
                builder.method(request.httpMethod(), null);
            }

            Map<String, List<String>> headers = request.headers();
            if (headers != null) {
                for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                    for (String val : entry.getValue()) {
                        builder.addHeader(entry.getKey(), val);
                    }
                }
            }

            builder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0");
            builder.header("Accept-Language", "en-US,en;q=0.9");

            try (okhttp3.Response response = client.newCall(builder.build()).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                Map<String, List<String>> responseHeaders = new HashMap<>();
                for (String name : response.headers().names()) {
                    responseHeaders.put(name, response.headers().values(name));
                }
                return new Response(
                    response.code(),
                    response.message(),
                    responseHeaders,
                    responseBody,
                    response.request().url().toString()
                );
            }
        }
    }
}
