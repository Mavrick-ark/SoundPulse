const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "music_dbms.db");
const db = new sqlite3.Database(DB_PATH);

const spotifyUrls = [
  "https://open.spotify.com/track/4YMBXgTCuJte3k4cf41a1H",
  "https://open.spotify.com/track/28DBPgLD7pUjGA561yzd8X",
  "https://open.spotify.com/track/0XYALktGbnHJ1TdW0Oz5KN",
  "https://open.spotify.com/track/4dTmQfqA75KrfynUF1TUX9",
  "https://open.spotify.com/track/1LomCMl5wD3MPVlC6smUHe",
  "https://open.spotify.com/track/6a9Z1jUms915w4O7N1PxjY",
  "https://open.spotify.com/track/5xdVqHtFS0eLuNp4Z8Wbpa",
  "https://open.spotify.com/track/3eR23VReFzcdmS7TYCrhCe",
  "https://open.spotify.com/track/1ZEOIhSn6BKErV59bIgn76",
  "https://open.spotify.com/track/5XUB5h1kZcFrgLa9RZda3Y"
];

// Map playlist_songs position to spotifyUrls index or update matching tracks
db.serialize(() => {
    db.all("SELECT ps.song_id, ps.position FROM playlist_songs ps JOIN playlists p ON ps.playlist_id = p.playlist_id WHERE p.title = 'My Spotify Liked Songs'", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Found ${rows.length} playlist songs to link with Spotify URLs`);
        const fs = require('fs');
        const code = fs.readFileSync(path.join(__dirname, 'import_spotify.js'), 'utf8');
        const urlMatch = code.match(/https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/g);
        
        if (urlMatch) {
            console.log(`Extracted ${urlMatch.length} Spotify URLs from import script`);
            db.run("BEGIN TRANSACTION");
            let count = 0;
            rows.forEach((row) => {
                const url = urlMatch[row.position - 1];
                if (url) {
                    db.run("UPDATE songs SET spotify_url = ? WHERE song_id = ?", [url, row.song_id]);
                    count++;
                }
            });
            db.run("COMMIT", () => {
                console.log(`✅ Updated ${count} songs with their exact Spotify URLs!`);
                db.close();
            });
        }
    });
});
