// Optional: import lots of real games from RAWG (https://rawg.io/apidocs).
// Needs a free API key.
//   Windows (PowerShell):  $env:RAWG_KEY="yourkey"; node scripts/import-rawg.js 10
//   Mac/Linux:             RAWG_KEY=yourkey node scripts/import-rawg.js 10
// The argument is the number of pages of 40 games to fetch (default 5 = 200 games).
// Needs Node 18+. Existing titles are skipped.
const db = require('../database');

const key = process.env.RAWG_KEY;
if (!key) { console.error('Set RAWG_KEY first (see top of this file).'); process.exit(1); }
const pages = Number(process.argv[2]) || 5;

async function main() {
    let added = 0;
    for (let page = 1; page <= pages; page++) {
        const url = `https://api.rawg.io/api/games?key=${key}&page_size=40&page=${page}&ordering=-added`;
        const res = await fetch(url);
        if (!res.ok) { console.error('RAWG error', res.status); break; }
        const data = await res.json();
        for (const g of data.results) {
            const genre = (g.genres && g.genres[0] && g.genres[0].name) || 'Other';
            const platform = (g.platforms || []).map(p => p.platform.name).join(', ') || 'Unknown';
            const info = [
                g.genres && g.genres.length ? 'Genres: ' + g.genres.map(x => x.name).join(', ') : '',
                g.rating ? `Rated ${g.rating}/5 by RAWG users.` : '',
                g.metacritic ? `Metacritic ${g.metacritic}.` : ''
            ].filter(Boolean).join(' ');
            await new Promise(r => db.run(
                "INSERT OR IGNORE INTO games (title, genre, release_date, platform, information) VALUES (?, ?, ?, ?, ?)",
                [g.name, genre, g.released || '1970-01-01', platform, info],
                function () { if (this.changes) added++; r(); }
            ));
        }
        console.log(`Page ${page}/${pages} done (${added} added so far)`);
    }
    console.log(`Finished: ${added} new games.`);
    db.close();
}
main();
