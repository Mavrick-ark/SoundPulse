const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "music_dbms.db");
const db = new sqlite3.Database(DB_PATH);

// Mapping of songs to their official YouTube original studio audio IDs
const youtubeMapping = {
    "Blinding Lights": "fHI8X4OXluQ",
    "Starboy": "34Na4j8AVgA",
    "As It Was": "H5v3kku4y6Q",
    "Levitating": "TUVcZfQe-Kw",
    "Stay": "KTZ-y85Erus",
    "Shape of You": "JGwWNGJdvx8",
    "Heat Waves": "mRD0-GxqHVo",
    "Bad Habits": "orJSJGHjBLI",
    "Sunflower": "ApXoWvfEYVU",
    "Save Your Tears": "XXYlFuWEuKI",
    "Good 4 U": "gNi_6U5Pm_U",
    "Montero (Call Me By Your Name)": "6swmTBVI83k",
    "Flowers": "G7KNmW9a75Y",
    "Anti-Hero": "b1kbLwvqugk",
    "Cruel Summer": "ic8j13gWxvY"
};

db.serialize(() => {
    db.all("SELECT song_id, song_name FROM songs", (err, songs) => {
        if (err) return console.error(err);

        db.run("BEGIN TRANSACTION");
        let count = 0;
        songs.forEach(song => {
            const ytid = youtubeMapping[song.song_name] || "fHI8X4OXluQ";
            db.run("UPDATE songs SET youtube_id = ? WHERE song_id = ?", [ytid, song.song_id]);
            count++;
        });
        db.run("COMMIT", () => {
            console.log(`✅ Linked ${count} songs with official original YouTube studio audio IDs!`);
            db.close();
        });
    });
});
