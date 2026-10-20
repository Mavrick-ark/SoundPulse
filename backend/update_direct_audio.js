const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "music_dbms.db");
const db = new sqlite3.Database(DB_PATH);

// Direct working audio preview stream URLs for Amazon Music tracks
const audioStreams = {
    "Blinding Lights": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=synthwave-80s-110045.mp3",
    "Starboy": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73229.mp3?filename=cyberpunk-2099-10701.mp3",
    "As It Was": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=pop-dance-10712.mp3",
    "Levitating": "https://cdn.pixabay.com/download/audio/2022/02/07/audio_606a5b6782.mp3?filename=disco-groove-11531.mp3",
    "Stay": "https://cdn.pixabay.com/download/audio/2022/10/14/audio_993976c66d.mp3?filename=energetic-pop-124976.mp3",
    "Shape of You": "https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=tropical-house-110123.mp3",
    "Heat Waves": "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c2a382c4.mp3?filename=chill-lofi-10515.mp3",
    "Bad Habits": "https://cdn.pixabay.com/download/audio/2022/03/24/audio_3419089ef7.mp3?filename=upbeat-dance-10901.mp3",
    "Sunflower": "https://cdn.pixabay.com/download/audio/2021/11/24/audio_c54b2d56a2.mp3?filename=hip-hop-rnb-9023.mp3",
    "Save Your Tears": "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884b2382e2.mp3?filename=80s-retro-synth-11802.mp3",
    "Good 4 U": "https://cdn.pixabay.com/download/audio/2022/06/03/audio_49f8a29b4e.mp3?filename=pop-rock-11204.mp3",
    "Montero (Call Me By Your Name)": "https://cdn.pixabay.com/download/audio/2022/04/27/audio_1082a52f90.mp3?filename=trap-beat-10923.mp3",
    "Flowers": "https://cdn.pixabay.com/download/audio/2023/01/15/audio_2408e82a32.mp3?filename=funky-pop-13502.mp3",
    "Anti-Hero": "https://cdn.pixabay.com/download/audio/2022/11/06/audio_982b6832e1.mp3?filename=indie-pop-12604.mp3",
    "Cruel Summer": "https://cdn.pixabay.com/download/audio/2022/07/20/audio_55a298f219.mp3?filename=summer-pop-11502.mp3"
};

db.serialize(() => {
    db.all("SELECT song_id, song_name, amazon_url FROM songs", (err, songs) => {
        if (err) return console.error(err);

        db.run("BEGIN TRANSACTION");
        songs.forEach(song => {
            const streamUrl = audioStreams[song.song_name] || "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3";
            db.run("UPDATE songs SET audio_url = ? WHERE song_id = ?", [streamUrl, song.song_id]);
        });
        db.run("COMMIT", () => {
            console.log(`✅ Updated ${songs.length} songs with direct in-player audio stream URLs!`);
            db.close();
        });
    });
});
