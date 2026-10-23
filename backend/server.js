const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure public/uploads directory exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    }
});
const upload = multer({ 
    storage, 
    limits: { 
        fileSize: 200 * 1024 * 1024, // 200 MB per audio file
        files: 500 // Up to 500 files per upload batch
    } 
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// SQLITE DATABASE CONNECTION & INITIALIZATION
// ============================================================
const DB_PATH = path.join(__dirname, "music_dbms.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("❌ Failed to connect to SQLite database:", err.message);
    } else {
        console.log("✅ Connected to SQLite database:", DB_PATH);
        initDatabase();
    }
});

// Helper for db query promises with SQL logging capability
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Database schema and seed initializer
async function initDatabase() {
    try {
        db.serialize(async () => {
            // Enable foreign keys in SQLite
            db.run("PRAGMA foreign_keys = ON;");

            const schemaSql = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
            const seedSql = fs.readFileSync(path.join(__dirname, "db", "seed.sql"), "utf8");

            // Split and run DDL statements
            const schemaStatements = schemaSql.split(";").map(s => s.trim()).filter(s => s.length > 0);
            for (const stmt of schemaStatements) {
                await dbRun(stmt);
            }

            // Migration check: Ensure lyrics and synced_lyrics columns exist in songs table
            try {
                const songCols = await dbAll("PRAGMA table_info(songs);");
                const colNames = songCols.map(c => c.name);
                if (!colNames.includes("lyrics")) {
                    await dbRun("ALTER TABLE songs ADD COLUMN lyrics TEXT;");
                }
                if (!colNames.includes("synced_lyrics")) {
                    await dbRun("ALTER TABLE songs ADD COLUMN synced_lyrics TEXT;");
                }
                if (!colNames.includes("lyrics_offset")) {
                    await dbRun("ALTER TABLE songs ADD COLUMN lyrics_offset REAL DEFAULT 0.0;");
                }
            } catch (migErr) {
                console.warn("Migration warning:", migErr.message);
            }

            // Check if seed data exists
            const songCount = await dbGet("SELECT COUNT(*) AS count FROM songs");
            if (songCount.count === 0) {
                console.log("🌱 Database is empty. Seeding initial data...");
                const seedStatements = seedSql.split(";").map(s => s.trim()).filter(s => s.length > 0);
                for (const stmt of seedStatements) {
                    try {
                        await dbRun(stmt);
                    } catch (e) {
                        // ignore duplicate key errors if any
                    }
                }
                console.log("✨ Seed data loaded successfully!");
            }
        });
    } catch (err) {
        console.error("❌ Database initialization error:", err);
    }
}

// Middleware to log executed SQL queries for frontend DBMS inspection
let sqlLogHistory = [];
function logSql(query, params = [], executionTimeMs = 0) {
    const formattedQuery = query.replace(/\s+/g, " ").trim();
    const entry = {
        id: Date.now() + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        query: formattedQuery,
        params,
        timeMs: executionTimeMs
    };
    sqlLogHistory.unshift(entry);
    if (sqlLogHistory.length > 50) sqlLogHistory.pop();
}

// ============================================================
// YOUTUBE FILENAME CLEANER (Extracts true Artist & Song Title)
// ============================================================
function cleanYouTubeTitle(rawName) {
    if (!rawName) return { song_name: "Uploaded Song", artist_name: "Custom Artist" };

    let str = rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, "").trim();

    // Replace unicode dash variants (en-dash, em-dash, tilde, corrupted UTF-8 \uFFFD, double dashes)
    str = str.replace(/[\u2013\u2014\uFFFD~]/g, " - ");
    str = str.replace(/_/g, " ");

    // Strip common YouTube clutters
    str = str.replace(/\[\s*(?:official\s*)?(?:music\s*)?(?:video|audio|lyrics|hd|4k|the album|soundtrack|visualizer).*?\]/gi, " ");
    str = str.replace(/\(\s*(?:official\s*)?(?:music\s*)?(?:video|video oficial|audio|lyric|lyrics|directed by|soundtrack|prod\.|remix).*?\)/gi, " ");
    str = str.replace(/\b(?:official\s*video|official\s*music\s*video|official\s*audio|lyric\s*video|video\s*oficial|full\s*song|new\s*punjabi\s*songs?\s*\d*|gaana\s*originals|m[\/_]v)\b/gi, " ");
    str = str.replace(/\s*-\s*-\s*/g, " - ");
    str = str.replace(/\s+/g, " ").trim();

    let artist = "Custom Artist";
    let title = str;

    // Check for " - " delimiter
    if (str.includes(" - ")) {
        const parts = str.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    } else if (str.toLowerCase().includes(" featuring ")) {
        const parts = str.split(/ featuring /i);
        artist = parts[0].trim();
        title = parts.slice(1).join(" ").trim();
    }

    // Clean up leading/trailing punctuation or quotes
    artist = artist.replace(/^['"\s]+|['"\s]+$/g, "").trim() || "Custom Artist";
    title = title.replace(/^['"\s]+|['"\s]+$/g, "").trim() || str;

    // Fallback if title became empty
    if (!title) {
        title = rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
    }

    return { song_name: title, artist_name: artist };
}

// ============================================================
// ONLINE POSTER & LYRICS AUTO-FETCHER (iTunes & LRCLIB)
// ============================================================
async function fetchSongMetadataOnline(title, artist = "") {
    const result = {
        cover_url: null,
        lyrics: null,
        synced_lyrics: null,
        official_title: null,
        official_artist: null,
        official_album: null
    };

    // Robust cleaning of title & artist
    let cleanTitle = (title || "")
        .replace(/\.[a-zA-Z0-9]{2,5}$/, "") // strip extension
        .replace(/\s*\[.*?\]\s*/g, " ") // strip [Official Video], [The Album], etc.
        .replace(/\s*\(.*?(?:official|audio|video|lyrics|hd|4k|remix|version).*?\)\s*/gi, " ")
        .replace(/[_\ufffd]/g, " ")
        .trim();

    let cleanArtist = (artist && artist !== "Custom Artist" && artist !== "Local" && artist !== "Custom Upload Artist") ? artist.trim() : "";

    // 1. Fetch Official Artwork from iTunes Search API (3s timeout)
    try {
        const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
        const res = await fetch(itunesUrl, { 
            headers: { "User-Agent": "AntigravityMusicSystem/1.0" },
            signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const track = data.results[0];
                if (track.artworkUrl100) {
                    result.cover_url = track.artworkUrl100.replace("100x100bb", "600x600bb");
                }
                result.official_title = track.trackName;
                result.official_artist = track.artistName;
                result.official_album = track.collectionName;
            }
        }
    } catch (e) {
        // iTunes search error or timeout
    }

    // 2. Fetch Lyrics from LRCLIB API (3s timeout)
    try {
        const searchArtist = result.official_artist || cleanArtist;
        const searchTitle = result.official_title || cleanTitle;
        let lrcUrl = "";
        if (searchArtist) {
            lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(searchArtist)}&track_name=${encodeURIComponent(searchTitle)}`;
        } else {
            lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchTitle)}`;
        }
        const res = await fetch(lrcUrl, { 
            headers: { "User-Agent": "AntigravityMusicSystem/1.0" },
            signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
            const data = await res.json();
            const item = Array.isArray(data) ? data[0] : data;
            if (item) {
                result.lyrics = item.plainLyrics || null;
                result.synced_lyrics = item.syncedLyrics || null;
            }
        }
    } catch (e) {
        // LRCLIB search error or timeout
    }

    return result;
}

// Background metadata enrichment queue (fast batch processing without blocking upload responses)
let enrichmentQueue = [];
let isEnriching = false;

async function processEnrichmentQueue() {
    if (isEnriching || enrichmentQueue.length === 0) return;
    isEnriching = true;

    while (enrichmentQueue.length > 0) {
        const item = enrichmentQueue.shift();
        try {
            const online = await fetchSongMetadataOnline(item.song_name, item.artist_name);
            if (online.lyrics || online.synced_lyrics) {
                await dbRun(
                    "UPDATE songs SET lyrics = COALESCE(?, lyrics), synced_lyrics = COALESCE(?, synced_lyrics) WHERE song_id = ?",
                    [online.lyrics, online.synced_lyrics, item.song_id]
                );
            }
            if (online.cover_url && item.album_id) {
                await dbRun(
                    "UPDATE albums SET cover_url = ? WHERE album_id = ? AND (cover_url IS NULL OR cover_url LIKE '%unsplash%')",
                    [online.cover_url, item.album_id]
                );
            }
        } catch (e) {
            console.warn("Background enrichment error for song", item.song_id, e.message);
        }
        // Small delay to be polite to LRCLIB and iTunes APIs
        await new Promise(r => setTimeout(r, 250));
    }

    isEnriching = false;
}

function queueForMetadataEnrichment(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    enrichmentQueue.push(...items);
    processEnrichmentQueue();
}

// ============================================================
// API ENDPOINTS
// ============================================================

// 1. GET ALL SONGS (WITH JOINs & LYRICS)
app.get("/api/songs", async (req, res) => {
    const startTime = Date.now();
    const sql = `
        SELECT
            s.song_id,
            s.song_name,
            s.duration,
            s.likes,
            s.play_count,
            s.bpm,
            s.spotify_url,
            s.audio_url,
            s.amazon_url,
            s.youtube_id,
            s.lyrics,
            s.synced_lyrics,
            s.lyrics_offset,
            a.artist_name,
            a.artist_id,
            al.album_name,
            al.album_id,
            al.cover_url,
            g.genre_name,
            g.genre_id
        FROM songs s
        JOIN artists a ON s.artist_id = a.artist_id
        JOIN albums al ON s.album_id = al.album_id
        JOIN genres g ON s.genre_id = g.genre_id
        ORDER BY s.song_id DESC
    `;
    try {
        const songs = await dbAll(sql);
        logSql(sql, [], Date.now() - startTime);
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch songs", details: err.message });
    }
});

// 2. GET ALL ARTISTS (WITH GROUP BY & COUNT)
app.get("/api/artists", async (req, res) => {
    const startTime = Date.now();
    const sql = `
        SELECT
            a.artist_id,
            a.artist_name,
            a.country,
            a.debut_year,
            a.bio,
            COUNT(s.song_id) AS total_songs,
            COALESCE(SUM(s.play_count), 0) AS total_plays
        FROM artists a
        LEFT JOIN songs s ON a.artist_id = s.artist_id
        GROUP BY a.artist_id, a.artist_name, a.country, a.debut_year, a.bio
        ORDER BY a.artist_name ASC
    `;
    try {
        const artists = await dbAll(sql);
        logSql(sql, [], Date.now() - startTime);
        res.json(artists);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch artists", details: err.message });
    }
});

// 3. GET ALL ALBUMS
app.get("/api/albums", async (req, res) => {
    const startTime = Date.now();
    const sql = `
        SELECT
            al.album_id,
            al.album_name,
            al.release_year,
            al.cover_url,
            a.artist_name,
            COUNT(s.song_id) AS total_songs
        FROM albums al
        JOIN artists a ON al.artist_id = a.artist_id
        LEFT JOIN songs s ON al.album_id = s.album_id
        GROUP BY al.album_id, al.album_name, al.release_year, al.cover_url, a.artist_name
        ORDER BY al.release_year DESC
    `;
    try {
        const albums = await dbAll(sql);
        logSql(sql, [], Date.now() - startTime);
        res.json(albums);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch albums", details: err.message });
    }
});

// 4. GET ALL GENRES
app.get("/api/genres", async (req, res) => {
    const startTime = Date.now();
    const sql = `SELECT * FROM genres ORDER BY genre_name ASC`;
    try {
        const genres = await dbAll(sql);
        logSql(sql, [], Date.now() - startTime);
        res.json(genres);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch genres", details: err.message });
    }
});

// 5. GET ALL PLAYLISTS
app.get("/api/playlists", async (req, res) => {
    const startTime = Date.now();
    const sql = `
        SELECT
            p.playlist_id,
            p.title,
            p.description,
            p.cover_color,
            p.created_at,
            u.username AS creator_name,
            COUNT(ps.song_id) AS total_songs,
            COALESCE(SUM(s.duration), 0) AS total_duration
        FROM playlists p
        JOIN users u ON p.user_id = u.user_id
        LEFT JOIN playlist_songs ps ON p.playlist_id = ps.playlist_id
        LEFT JOIN songs s ON ps.song_id = s.song_id
        GROUP BY p.playlist_id, p.title, p.description, p.cover_color, p.created_at, u.username
        ORDER BY p.playlist_id DESC
    `;
    try {
        const playlists = await dbAll(sql);
        logSql(sql, [], Date.now() - startTime);
        res.json(playlists);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch playlists", details: err.message });
    }
});

// 6. GET SINGLE PLAYLIST WITH ORDERED SONGS
app.get("/api/playlists/:id", async (req, res) => {
    const startTime = Date.now();
    const playlistId = req.params.id;

    const playlistSql = `
        SELECT p.*, u.username AS creator_name
        FROM playlists p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.playlist_id = ?
    `;

    const songsSql = `
        SELECT
            s.song_id,
            s.song_name,
            s.duration,
            s.likes,
            s.bpm,
            s.spotify_url,
            s.audio_url,
            s.amazon_url,
            s.youtube_id,
            s.lyrics,
            s.synced_lyrics,
            s.lyrics_offset,
            a.artist_name,
            al.album_name,
            al.cover_url,
            g.genre_name,
            ps.position,
            ps.added_at
        FROM playlist_songs ps
        JOIN songs s ON ps.song_id = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        JOIN albums al ON s.album_id = al.album_id
        JOIN genres g ON s.genre_id = g.genre_id
        WHERE ps.playlist_id = ?
        ORDER BY ps.position ASC
    `;

    try {
        const playlist = await dbGet(playlistSql, [playlistId]);
        if (!playlist) return res.status(404).json({ error: "Playlist not found" });

        const songs = await dbAll(songsSql, [playlistId]);
        logSql(playlistSql + " | " + songsSql, [playlistId], Date.now() - startTime);

        res.json({ ...playlist, playlist, songs });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch playlist details", details: err.message });
    }
});

// 7. CREATE NEW PLAYLIST
app.post("/api/playlists", async (req, res) => {
    const startTime = Date.now();
    const { title, description, cover_color, user_id = 1 } = req.body;

    if (!title) return res.status(400).json({ error: "Playlist title is required" });

    const sql = `
        INSERT INTO playlists (user_id, title, description, cover_color)
        VALUES (?, ?, ?, ?)
    `;
    const params = [user_id, title, description || "", cover_color || "#6366f1"];

    try {
        const result = await dbRun(sql, params);
        logSql(sql, params, Date.now() - startTime);
        res.json({ message: "Playlist created", playlist_id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: "Failed to create playlist", details: err.message });
    }
});

// 8. ADD SONG TO PLAYLIST (JUNCTION TABLE INSERT)
app.post("/api/playlists/:id/songs", async (req, res) => {
    const startTime = Date.now();
    const playlistId = req.params.id;
    const { song_id } = req.body;

    if (!song_id) return res.status(400).json({ error: "Song ID is required" });

    try {
        // Calculate next position
        const posRow = await dbGet(`SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM playlist_songs WHERE playlist_id = ?`, [playlistId]);
        const nextPos = posRow ? posRow.next_pos : 1;

        const sql = `
            INSERT INTO playlist_songs (playlist_id, song_id, position)
            VALUES (?, ?, ?)
        `;
        const params = [playlistId, song_id, nextPos];
        await dbRun(sql, params);

        logSql(sql, params, Date.now() - startTime);
        res.json({ message: "Song added to playlist", position: nextPos });
    } catch (err) {
        if (err.message.includes("UNIQUE constraint failed") || err.message.includes("PRIMARY KEY")) {
            return res.status(400).json({ error: "Song is already in this playlist" });
        }
        res.status(500).json({ error: "Failed to add song to playlist", details: err.message });
    }
});

// 9. REMOVE SONG FROM PLAYLIST
app.delete("/api/playlists/:id/songs/:songId", async (req, res) => {
    const startTime = Date.now();
    const { id: playlistId, songId } = req.params;

    const sql = `DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?`;
    const params = [playlistId, songId];

    try {
        await dbRun(sql, params);
        logSql(sql, params, Date.now() - startTime);
        res.json({ message: "Song removed from playlist" });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove song from playlist", details: err.message });
    }
});

// 10. REORDER PLAYLIST SONGS
app.put("/api/playlists/:id/reorder", async (req, res) => {
    const startTime = Date.now();
    const playlistId = req.params.id;
    const { songOrders } = req.body; // Array of { song_id, position }

    if (!Array.isArray(songOrders)) return res.status(400).json({ error: "Invalid reorder payload" });

    try {
        for (const item of songOrders) {
            await dbRun(
                `UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?`,
                [item.position, playlistId, item.song_id]
            );
        }
        logSql(`UPDATE playlist_songs SET position = ? WHERE playlist_id = ${playlistId}...`, [], Date.now() - startTime);
        res.json({ message: "Playlist songs reordered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to reorder playlist", details: err.message });
    }
});

// 11. DELETE PLAYLIST
app.delete("/api/playlists/:id", async (req, res) => {
    const startTime = Date.now();
    const playlistId = req.params.id;

    const sql = `DELETE FROM playlists WHERE playlist_id = ?`;
    try {
        await dbRun(sql, [playlistId]);
        logSql(sql, [playlistId], Date.now() - startTime);
        res.json({ message: "Playlist deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete playlist", details: err.message });
    }
});

// 12. ADD NEW SONG (Supports ID or New Artist/Album Name)
app.post("/api/songs", async (req, res) => {
    const startTime = Date.now();
    let { song_name, artist_id, artist_name, album_id, album_name, genre_id, duration, bpm = 120 } = req.body;

    if (!song_name || !genre_id || !duration) {
        return res.status(400).json({ error: "Song title, genre, and duration are required" });
    }

    try {
        // Auto-create artist if name provided instead of ID
        if (!artist_id && artist_name) {
            const existingArtist = await dbGet(`SELECT artist_id FROM artists WHERE artist_name = ?`, [artist_name.trim()]);
            if (existingArtist) {
                artist_id = existingArtist.artist_id;
            } else {
                const artRes = await dbRun(`INSERT INTO artists (artist_name, country, debut_year) VALUES (?, 'Unknown', 2024)`, [artist_name.trim()]);
                artist_id = artRes.lastID;
            }
        }

        // Default artist if none provided
        if (!artist_id) {
            const defaultArt = await dbGet(`SELECT artist_id FROM artists LIMIT 1`);
            if (defaultArt) artist_id = defaultArt.artist_id;
            else {
                const newArt = await dbRun(`INSERT INTO artists (artist_name) VALUES ('Independent Artist')`);
                artist_id = newArt.lastID;
            }
        }

        // Auto-create album if name provided instead of ID
        if (!album_id && album_name) {
            const existingAlbum = await dbGet(`SELECT album_id FROM albums WHERE album_name = ? AND artist_id = ?`, [album_name.trim(), artist_id]);
            if (existingAlbum) {
                album_id = existingAlbum.album_id;
            } else {
                const albRes = await dbRun(`INSERT INTO albums (album_name, artist_id, release_year) VALUES (?, ?, 2024)`, [album_name.trim(), artist_id]);
                album_id = albRes.lastID;
            }
        }

        // Default album if none provided
        if (!album_id) {
            const defaultAlb = await dbGet(`SELECT album_id FROM albums WHERE artist_id = ? LIMIT 1`, [artist_id]);
            if (defaultAlb) album_id = defaultAlb.album_id;
            else {
                const newAlb = await dbRun(`INSERT INTO albums (album_name, artist_id, release_year) VALUES ('Single Release', ?, 2024)`, [artist_id]);
                album_id = newAlb.lastID;
            }
        }

        const sql = `
            INSERT INTO songs (song_name, artist_id, album_id, genre_id, duration, bpm, audio_url, spotify_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [song_name, artist_id, album_id, genre_id, duration, bpm, req.body.audio_url || "", req.body.spotify_url || ""];
        const result = await dbRun(sql, params);
        logSql(sql, params, Date.now() - startTime);

        res.json({ message: "Song added successfully", song_id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: "Failed to add song", details: err.message });
    }
});

// 12B. UPLOAD CUSTOM SONG & MP3 AUDIO FILE
app.post("/api/songs/upload", upload.fields([
    { name: "audio_file", maxCount: 1 },
    { name: "cover_file", maxCount: 1 }
]), async (req, res) => {
    const startTime = Date.now();
    let { song_name, artist_name, album_name, genre_id, duration, bpm = 120 } = req.body;

    if (!req.files || !req.files.audio_file || req.files.audio_file.length === 0) {
        return res.status(400).json({ error: "Please select an audio file (MP3, WAV, M4A) to upload" });
    }

    const audioFile = req.files.audio_file[0];
    const audio_url = `/uploads/${audioFile.filename}`;

    // Clean YouTube clutter if title/artist not specified or defaults
    const cleaned = cleanYouTubeTitle(audioFile.originalname);
    if (!song_name || song_name === "Uploaded Song") song_name = cleaned.song_name;
    if (!artist_name || artist_name === "Custom Upload Artist" || artist_name === "Custom Artist") artist_name = cleaned.artist_name;

    let cover_url = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400";
    if (req.files.cover_file && req.files.cover_file.length > 0) {
        cover_url = `/uploads/${req.files.cover_file[0].filename}`;
    }

    artist_name = (artist_name || "Custom Artist").trim();
    album_name = (album_name || "My Uploaded Songs").trim();
    duration = parseInt(duration) || 180;
    genre_id = parseInt(genre_id) || 1;

    try {
        let artist_id;
        const existingArtist = await dbGet(`SELECT artist_id FROM artists WHERE artist_name = ?`, [artist_name]);
        if (existingArtist) {
            artist_id = existingArtist.artist_id;
        } else {
            const artRes = await dbRun(`INSERT INTO artists (artist_name, country, debut_year) VALUES (?, 'Local', 2024)`, [artist_name]);
            artist_id = artRes.lastID;
        }

        let album_id;
        const existingAlbum = await dbGet(`SELECT album_id FROM albums WHERE album_name = ? AND artist_id = ?`, [album_name, artist_id]);
        if (existingAlbum) {
            album_id = existingAlbum.album_id;
            if (cover_url && !cover_url.includes("unsplash")) {
                await dbRun(`UPDATE albums SET cover_url = ? WHERE album_id = ?`, [cover_url, album_id]);
            }
        } else {
            const albRes = await dbRun(`INSERT INTO albums (album_name, artist_id, release_year, cover_url) VALUES (?, ?, 2024, ?)`, [album_name, artist_id, cover_url]);
            album_id = albRes.lastID;
        }

        // Fast insert
        const sql = `
            INSERT INTO songs (song_name, artist_id, album_id, genre_id, duration, bpm, audio_url, lyrics, synced_lyrics, lyrics_offset)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0.0)
        `;
        const params = [song_name, artist_id, album_id, genre_id, duration, bpm, audio_url];
        const result = await dbRun(sql, params);
        const song_id = result.lastID;

        logSql(sql, params, Date.now() - startTime);

        // Queue metadata enrichment in background
        queueForMetadataEnrichment([{
            song_id,
            song_name,
            artist_name,
            album_id
        }]);

        res.json({
            message: "Audio file uploaded and added to library successfully!",
            song_id,
            audio_url,
            cover_url,
            song_name,
            artist_name
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Failed to upload song file", details: err.message });
    }
});

// 12B-2. BATCH UPLOAD MULTIPLE SONGS (LIGHTNING FAST INSERT + BACKGROUND METADATA ENRICHMENT)
app.post("/api/songs/upload-multiple", upload.array("audio_files", 500), async (req, res) => {
    const startTime = Date.now();
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No audio files uploaded. Please select one or more files." });
    }

    let metaMap = {};
    if (req.body.metadata) {
        try {
            const parsed = JSON.parse(req.body.metadata);
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    if (item && item.filename) {
                        metaMap[item.filename] = item;
                    }
                });
            }
        } catch (e) {
            console.warn("Could not parse metadata JSON:", e);
        }
    }

    // Default genre fallback (ensure genre_id exists)
    const defaultGenre = await dbGet(`SELECT genre_id FROM genres LIMIT 1`);
    const fallbackGenreId = defaultGenre ? defaultGenre.genre_id : 1;

    const insertedSongs = [];
    const enrichmentBatch = [];

    try {
        for (const file of req.files) {
            const meta = metaMap[file.originalname] || {};
            
            // Clean YouTube clutter (extract clean song title & artist)
            const cleaned = cleanYouTubeTitle(file.originalname);
            let song_name = (meta.song_name && meta.song_name !== "Uploaded Song") ? meta.song_name.trim() : cleaned.song_name;
            let artist_name = (meta.artist_name && meta.artist_name !== "Custom Artist") ? meta.artist_name.trim() : cleaned.artist_name;
            let album_name = (meta.album_name || "My Uploaded Songs").trim();
            const genre_id = parseInt(meta.genre_id) || fallbackGenreId;
            const duration = parseInt(meta.duration) || 180;
            const bpm = parseInt(meta.bpm) || 120;
            const audio_url = `/uploads/${file.filename}`;
            let cover_url = meta.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400";

            // Find or create artist
            let artist_id;
            const existingArtist = await dbGet(`SELECT artist_id FROM artists WHERE artist_name = ?`, [artist_name]);
            if (existingArtist) {
                artist_id = existingArtist.artist_id;
            } else {
                const artRes = await dbRun(`INSERT INTO artists (artist_name, country, debut_year) VALUES (?, 'Local', 2024)`, [artist_name]);
                artist_id = artRes.lastID;
            }

            // Find or create album
            let album_id;
            const existingAlbum = await dbGet(`SELECT album_id FROM albums WHERE album_name = ? AND artist_id = ?`, [album_name, artist_id]);
            if (existingAlbum) {
                album_id = existingAlbum.album_id;
                if (cover_url && !cover_url.includes("unsplash")) {
                    await dbRun(`UPDATE albums SET cover_url = ? WHERE album_id = ?`, [cover_url, album_id]);
                }
            } else {
                const albRes = await dbRun(`INSERT INTO albums (album_name, artist_id, release_year, cover_url) VALUES (?, ?, 2024, ?)`, [album_name, artist_id, cover_url]);
                album_id = albRes.lastID;
            }

            // Fast SQLite insert (lyrics enriched asynchronously)
            const insertSql = `
                INSERT INTO songs (song_name, artist_id, album_id, genre_id, duration, bpm, audio_url, lyrics, synced_lyrics, lyrics_offset)
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0.0)
            `;
            const params = [song_name, artist_id, album_id, genre_id, duration, bpm, audio_url];
            const songRes = await dbRun(insertSql, params);

            const insertedItem = {
                song_id: songRes.lastID,
                song_name,
                artist_name,
                album_name,
                album_id,
                cover_url,
                duration,
                audio_url,
                lyrics_offset: 0.0
            };

            insertedSongs.push(insertedItem);
            enrichmentBatch.push({
                song_id: songRes.lastID,
                song_name,
                artist_name,
                album_id
            });
        }

        logSql(`BATCH INSERT ${insertedSongs.length} uploaded songs INTO songs`, [], Date.now() - startTime);

        // Immediate HTTP response prevents browser timeouts or UI freeze
        res.json({
            message: `Successfully uploaded and added ${insertedSongs.length} song(s)! Official artwork and lyrics are enriching in the background.`,
            count: insertedSongs.length,
            songs: insertedSongs
        });

        // Trigger background metadata & lyrics enrichment
        queueForMetadataEnrichment(enrichmentBatch);

    } catch (err) {
        console.error("Batch upload error:", err);
        res.status(500).json({ error: "Batch upload failed", details: err.message });
    }
});

// 12D. GET LYRICS FOR A SONG
app.get("/api/songs/:id/lyrics", async (req, res) => {
    const songId = req.params.id;
    try {
        const song = await dbGet(`
            SELECT s.song_id, s.song_name, s.lyrics, s.synced_lyrics, s.lyrics_offset, a.artist_name, al.cover_url, al.album_name
            FROM songs s
            JOIN artists a ON s.artist_id = a.artist_id
            JOIN albums al ON s.album_id = al.album_id
            WHERE s.song_id = ?
        `, [songId]);
        if (!song) return res.status(404).json({ error: "Song not found" });

        // If lyrics missing in DB, try live fetch and cache
        if (!song.lyrics) {
            const online = await fetchSongMetadataOnline(song.song_name, song.artist_name);
            if (online.lyrics) {
                song.lyrics = online.lyrics;
                song.synced_lyrics = online.synced_lyrics;
                await dbRun(`UPDATE songs SET lyrics = ?, synced_lyrics = ? WHERE song_id = ?`, [online.lyrics, online.synced_lyrics, songId]);
            }
            if (online.cover_url && (!song.cover_url || song.cover_url.includes("unsplash"))) {
                await dbRun(`UPDATE albums SET cover_url = ? WHERE album_id = (SELECT album_id FROM songs WHERE song_id = ?)`, [online.cover_url, songId]);
                song.cover_url = online.cover_url;
            }
        }

        res.json({
            song_id: song.song_id,
            song_name: song.song_name,
            artist_name: song.artist_name,
            album_name: song.album_name,
            cover_url: song.cover_url,
            lyrics: song.lyrics || "No lyrics found online for this track.",
            synced_lyrics: song.synced_lyrics || null,
            lyrics_offset: song.lyrics_offset || 0.0
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch lyrics", details: err.message });
    }
});

// 12E. REFRESH METADATA & POSTER FOR A SONG
app.post("/api/songs/:id/refresh-metadata", async (req, res) => {
    const songId = req.params.id;
    try {
        const song = await dbGet(`
            SELECT s.song_id, s.song_name, a.artist_name, s.album_id
            FROM songs s
            JOIN artists a ON s.artist_id = a.artist_id
            WHERE s.song_id = ?
        `, [songId]);
        if (!song) return res.status(404).json({ error: "Song not found" });

        const online = await fetchSongMetadataOnline(song.song_name, song.artist_name);
        if (online.cover_url) {
            await dbRun(`UPDATE albums SET cover_url = ? WHERE album_id = ?`, [online.cover_url, song.album_id]);
        }
        if (online.lyrics) {
            await dbRun(`UPDATE songs SET lyrics = ?, synced_lyrics = ? WHERE song_id = ?`, [online.lyrics, online.synced_lyrics, songId]);
        }

        res.json({
            message: "Metadata and poster refreshed successfully!",
            cover_url: online.cover_url,
            lyrics: online.lyrics,
            synced_lyrics: online.synced_lyrics
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to refresh metadata", details: err.message });
    }
});

// 12F. UPDATE LYRICS OFFSET (FOR YOUTUBE VIDEO INTROS / SILENCE SYNC)
app.put("/api/songs/:id/lyrics-offset", async (req, res) => {
    const songId = req.params.id;
    const { offset } = req.body;
    const offsetVal = parseFloat(offset) || 0.0;
    try {
        await dbRun("UPDATE songs SET lyrics_offset = ? WHERE song_id = ?", [offsetVal, songId]);
        res.json({ message: "Lyrics offset updated successfully", song_id: songId, lyrics_offset: offsetVal });
    } catch (err) {
        res.status(500).json({ error: "Failed to update lyrics offset", details: err.message });
    }
});

// 12G. SEARCH LYRICS ONLINE (LRCLIB API)
app.get("/api/lyrics/search", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Query parameter 'q' is required" });
    try {
        const lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const r = await fetch(lrcUrl, {
            headers: { "User-Agent": "AntigravityMusicSystem/1.0" },
            signal: AbortSignal.timeout(4000)
        });
        if (r.ok) {
            const data = await r.json();
            return res.json(Array.isArray(data) ? data : [data]);
        }
        res.json([]);
    } catch (err) {
        res.status(500).json({ error: "Lyrics search failed", details: err.message });
    }
});

// 12H. UPDATE SONG LYRICS MANUALLY / OVERRIDE
app.put("/api/songs/:id/lyrics", async (req, res) => {
    const songId = req.params.id;
    const { lyrics, synced_lyrics, lyrics_offset } = req.body;
    try {
        await dbRun(
            "UPDATE songs SET lyrics = ?, synced_lyrics = ?, lyrics_offset = COALESCE(?, lyrics_offset) WHERE song_id = ?",
            [lyrics || null, synced_lyrics || null, lyrics_offset !== undefined ? parseFloat(lyrics_offset) : null, songId]
        );
        res.json({ message: "Lyrics updated successfully", song_id: songId });
    } catch (err) {
        res.status(500).json({ error: "Failed to update lyrics", details: err.message });
    }
});

// 12C. BULK IMPORT SONGS (SPOTIFY / TEXT PASTE IMPORT)
app.post("/api/songs/bulk-import", async (req, res) => {
    const startTime = Date.now();
    const { tracks } = req.body; // Array of { title, artist, album, genre_id, duration }

    if (!Array.isArray(tracks) || tracks.length === 0) {
        return res.status(400).json({ error: "Tracks array is required" });
    }

    let insertedCount = 0;
    try {
        for (const track of tracks) {
            const song_name = (track.title || track.song_name || "Unknown Track").trim();
            const artist_name = (track.artist || track.artist_name || "Unknown Artist").trim();
            const album_name = (track.album || track.album_name || "Single Release").trim();
            const duration = parseInt(track.duration) || Math.floor(Math.random() * 60) + 180;
            const bpm = parseInt(track.bpm) || Math.floor(Math.random() * 40) + 100;
            const genre_id = parseInt(track.genre_id) || 1;

            // Find or create artist
            let artist_id;
            const existingArtist = await dbGet(`SELECT artist_id FROM artists WHERE artist_name = ?`, [artist_name]);
            if (existingArtist) {
                artist_id = existingArtist.artist_id;
            } else {
                const artRes = await dbRun(`INSERT INTO artists (artist_name, country, debut_year) VALUES (?, 'Unknown', 2024)`, [artist_name]);
                artist_id = artRes.lastID;
            }

            // Find or create album
            let album_id;
            const existingAlbum = await dbGet(`SELECT album_id FROM albums WHERE album_name = ? AND artist_id = ?`, [album_name, artist_id]);
            if (existingAlbum) {
                album_id = existingAlbum.album_id;
            } else {
                const albRes = await dbRun(`INSERT INTO albums (album_name, artist_id, release_year) VALUES (?, ?, 2024)`, [album_name, artist_id]);
                album_id = albRes.lastID;
            }

            // Insert song
            await dbRun(
                `INSERT INTO songs (song_name, artist_id, album_id, genre_id, duration, bpm) VALUES (?, ?, ?, ?, ?, ?)`,
                [song_name, artist_id, album_id, genre_id, duration, bpm]
            );
            insertedCount++;
        }

        logSql(`BULK INSERT INTO songs (${insertedCount} tracks imported from Spotify list)...`, [], Date.now() - startTime);
        res.json({ message: `Successfully imported ${insertedCount} songs into the database!`, count: insertedCount });
    } catch (err) {
        res.status(500).json({ error: "Failed to bulk import songs", details: err.message });
    }
});

// 13. LIKE SONG & INCREMENT PLAY COUNT
app.put("/api/songs/:id/like", async (req, res) => {
    const startTime = Date.now();
    const songId = req.params.id;
    const sql = `UPDATE songs SET likes = likes + 1 WHERE song_id = ?`;

    try {
        await dbRun(sql, [songId]);
        logSql(sql, [songId], Date.now() - startTime);
        res.json({ message: "Song liked" });
    } catch (err) {
        res.status(500).json({ error: "Failed to like song", details: err.message });
    }
});

app.put("/api/songs/:id/play", async (req, res) => {
    const startTime = Date.now();
    const songId = req.params.id;
    const sql = `UPDATE songs SET play_count = play_count + 1 WHERE song_id = ?`;

    try {
        await dbRun(sql, [songId]);
        logSql(sql, [songId], Date.now() - startTime);
        res.json({ message: "Play count incremented" });
    } catch (err) {
        res.status(500).json({ error: "Failed to increment play count" });
    }
});

// 14. DELETE SONG
app.delete("/api/songs/:id", async (req, res) => {
    const startTime = Date.now();
    const songId = req.params.id;
    const sql = `DELETE FROM songs WHERE song_id = ?`;

    try {
        await dbRun(sql, [songId]);
        logSql(sql, [songId], Date.now() - startTime);
        res.json({ message: "Song deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete song", details: err.message });
    }
});

// 14B. CLEAR ALL MUSIC, PLAYLISTS & UPLOADED FILES
const handleClearAllMusic = async (req, res) => {
    const startTime = Date.now();
    try {
        await dbRun("DELETE FROM playlist_songs");
        await dbRun("DELETE FROM playlists");
        await dbRun("DELETE FROM songs");
        await dbRun("DELETE FROM albums");
        await dbRun("DELETE FROM artists");

        // Remove files from public/uploads
        const uploadsDir = path.join(__dirname, "public", "uploads");
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(uploadsDir, file));
                } catch (e) {
                    console.warn("Could not delete upload file:", file, e.message);
                }
            }
        }

        logSql("DELETE FROM playlist_songs; DELETE FROM playlists; DELETE FROM songs; DELETE FROM albums; DELETE FROM artists;", [], Date.now() - startTime);
        res.json({ message: "All music, playlists, and uploaded files cleared successfully!" });
    } catch (err) {
        console.error("Failed to clear music database:", err);
        res.status(500).json({ error: "Failed to clear music database", details: err.message });
    }
};

app.post("/api/music/clear", handleClearAllMusic);
app.delete("/api/music/clear", handleClearAllMusic);


// 15. SEARCH API
app.get("/api/search", async (req, res) => {
    const startTime = Date.now();
    const query = req.query.q || "";
    const value = `%${query}%`;

    const sql = `
        SELECT
            s.song_id,
            s.song_name,
            s.duration,
            s.likes,
            s.bpm,
            s.spotify_url,
            s.audio_url,
            s.amazon_url,
            s.youtube_id,
            a.artist_name,
            al.album_name,
            al.cover_url,
            g.genre_name
        FROM songs s
        JOIN artists a ON s.artist_id = a.artist_id
        JOIN albums al ON s.album_id = al.album_id
        JOIN genres g ON s.genre_id = g.genre_id
        WHERE s.song_name LIKE ?
           OR a.artist_name LIKE ?
           OR al.album_name LIKE ?
           OR g.genre_name LIKE ?
        ORDER BY s.likes DESC
    `;

    try {
        const results = await dbAll(sql, [value, value, value, value]);
        logSql(sql, [value, value, value, value], Date.now() - startTime);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Search query failed", details: err.message });
    }
});

// 16. DBMS DASHBOARD STATS
app.get("/api/stats", async (req, res) => {
    const startTime = Date.now();
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM songs) AS total_songs,
            (SELECT COUNT(*) FROM artists) AS total_artists,
            (SELECT COUNT(*) FROM albums) AS total_albums,
            (SELECT COUNT(*) FROM playlists) AS total_playlists,
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COALESCE(SUM(likes), 0) FROM songs) AS total_likes,
            (SELECT COALESCE(SUM(play_count), 0) FROM songs) AS total_plays
    `;

    try {
        const stats = await dbGet(sql);
        logSql(sql, [], Date.now() - startTime);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch DBMS stats", details: err.message });
    }
});

// 17. GET RECENT EXECUTED SQL LOGS
app.get("/api/sql/logs", (req, res) => {
    res.json(sqlLogHistory);
});

// 18. EXPORT DDL + SEED SQL FILE (FOR DBMS PROJECT SUBMISSION)
app.get("/api/sql/export", (req, res) => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
        const seed = fs.readFileSync(path.join(__dirname, "db", "seed.sql"), "utf8");
        const fullDump = `-- DBMS PROJECT COMPLETE SQL SCRIPT DUMP\n-- Exported on: ${new Date().toLocaleString()}\n\n` + schema + "\n\n" + seed;

        res.setHeader("Content-Type", "application/sql");
        res.setHeader("Content-Disposition", "attachment; filename=music_dbms_export.sql");
        res.send(fullDump);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate SQL export", details: err.message });
    }
});

// 19. ER DIAGRAM SCHEMA METADATA
app.get("/api/sql/er-data", async (req, res) => {
    const erSchema = [
        {
            table: "users",
            columns: [
                { name: "user_id", type: "INTEGER", pk: true },
                { name: "username", type: "VARCHAR(50)", unique: true },
                { name: "email", type: "VARCHAR(100)", unique: true },
                { name: "created_at", type: "TIMESTAMP" }
            ],
            relations: []
        },
        {
            table: "artists",
            columns: [
                { name: "artist_id", type: "INTEGER", pk: true },
                { name: "artist_name", type: "VARCHAR(100)" },
                { name: "country", type: "VARCHAR(50)" },
                { name: "debut_year", type: "INT" },
                { name: "bio", type: "TEXT" }
            ],
            relations: []
        },
        {
            table: "genres",
            columns: [
                { name: "genre_id", type: "INTEGER", pk: true },
                { name: "genre_name", type: "VARCHAR(50)", unique: true },
                { name: "description", type: "TEXT" }
            ],
            relations: []
        },
        {
            table: "albums",
            columns: [
                { name: "album_id", type: "INTEGER", pk: true },
                { name: "album_name", type: "VARCHAR(100)" },
                { name: "artist_id", type: "INT", fk: "artists.artist_id" },
                { name: "release_year", type: "INT" },
                { name: "cover_url", type: "TEXT" }
            ],
            relations: [{ target: "artists", foreignKey: "artist_id" }]
        },
        {
            table: "songs",
            columns: [
                { name: "song_id", type: "INTEGER", pk: true },
                { name: "song_name", type: "VARCHAR(120)" },
                { name: "artist_id", type: "INT", fk: "artists.artist_id" },
                { name: "album_id", type: "INT", fk: "albums.album_id" },
                { name: "genre_id", type: "INT", fk: "genres.genre_id" },
                { name: "duration", type: "INT" },
                { name: "likes", type: "INT" },
                { name: "play_count", type: "INT" },
                { name: "bpm", type: "INT" }
            ],
            relations: [
                { target: "artists", foreignKey: "artist_id" },
                { target: "albums", foreignKey: "album_id" },
                { target: "genres", foreignKey: "genre_id" }
            ]
        },
        {
            table: "playlists",
            columns: [
                { name: "playlist_id", type: "INTEGER", pk: true },
                { name: "user_id", type: "INT", fk: "users.user_id" },
                { name: "title", type: "VARCHAR(100)" },
                { name: "description", type: "TEXT" },
                { name: "cover_color", type: "VARCHAR(30)" },
                { name: "created_at", type: "TIMESTAMP" }
            ],
            relations: [{ target: "users", foreignKey: "user_id" }]
        },
        {
            table: "playlist_songs",
            columns: [
                { name: "playlist_id", type: "INT", pk: true, fk: "playlists.playlist_id" },
                { name: "song_id", type: "INT", pk: true, fk: "songs.song_id" },
                { name: "position", type: "INT" },
                { name: "added_at", type: "TIMESTAMP" }
            ],
            relations: [
                { target: "playlists", foreignKey: "playlist_id" },
                { target: "songs", foreignKey: "song_id" }
            ]
        }
    ];

    res.json(erSchema);
});

// 20. CUSTOM SQL RUNNER (FOR LIVE DEMO / PROJECT VIVA)
app.post("/api/sql/execute", async (req, res) => {
    const startTime = Date.now();
    const { query } = req.body;

    if (!query) return res.status(400).json({ error: "Query parameter is required" });

    // Allow SELECT queries safely for demo
    const cleanQuery = query.trim();
    if (!cleanQuery.toUpperCase().startsWith("SELECT")) {
        return res.status(403).json({ error: "For safety, only SELECT queries can be executed directly in the demo console." });
    }

    try {
        const rows = await dbAll(cleanQuery);
        logSql(cleanQuery, [], Date.now() - startTime);
        res.json({ success: true, count: rows.length, rows });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 21. CLEAR ALL DATA ROUTE
app.post("/api/db/clear-all", async (req, res) => {
    const startTime = Date.now();
    try {
        await dbRun("DELETE FROM playlist_songs");
        await dbRun("DELETE FROM playlists");
        await dbRun("DELETE FROM songs");
        await dbRun("DELETE FROM albums");
        await dbRun("DELETE FROM artists");
        logSql("DELETE FROM playlist_songs; DELETE FROM playlists; DELETE FROM songs; DELETE FROM albums; DELETE FROM artists;", [], Date.now() - startTime);
        res.json({ message: "All music, playlists, albums, and artists have been deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear database", details: err.message });
    }
});

// Multer & Server Error Handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
    next();
});

// Fallback route
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
    console.log(`
==================================================
🎵 DBMS MUSIC PLAYLIST MANAGEMENT SYSTEM SERVER
==================================================

🚀 Server is running live at:
👉 http://localhost:${PORT}

--------------------------------------------------
Connected Engine: SQLite (music_dbms.db)
SQL Dump Export:  http://localhost:${PORT}/api/sql/export
==================================================
    `);
});