// database.js
const { Database } = require('./sqlite-compat');
const bcrypt = require('bcryptjs');
const db = new Database(require('path').join(__dirname, 'games.db'));

// Function to create tables if they do not exist
db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isAdmin INTEGER DEFAULT 0
    )`);

    // Create games table
    db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        genre TEXT NOT NULL,
        release_date TEXT NOT NULL,
        platform TEXT NOT NULL,
        information TEXT,
        deleted INTEGER DEFAULT 0
    )`);

    // Create reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
    )`);

    // Create user_games table
    db.run(`CREATE TABLE IF NOT EXISTS user_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        liked INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
    )`);


    // One-off cleanup of duplicate game rows (older versions re-seeded on every start).
    // Keeps the lowest id per title and repoints reviews / likes at it.
    db.run(`UPDATE reviews SET game_id = (SELECT MIN(g2.id) FROM games g2 WHERE g2.title = (SELECT title FROM games WHERE id = reviews.game_id))`);
    db.run(`UPDATE user_games SET game_id = (SELECT MIN(g2.id) FROM games g2 WHERE g2.title = (SELECT title FROM games WHERE id = user_games.game_id))`);
    db.run(`DELETE FROM games WHERE id NOT IN (SELECT MIN(id) FROM games GROUP BY title)`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_games_title ON games(title)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_game ON reviews(game_id)`);

    // Seed starter games (INSERT OR IGNORE, so no more duplicates)
    require('./addSampleGames.js')(db);

    // Hash any plaintext passwords left over from the old version
    db.all("SELECT id, password FROM users WHERE password NOT LIKE '$2%'", [], (err, rows) => {
        (rows || []).forEach(u => {
            db.run("UPDATE users SET password = ? WHERE id = ?", [bcrypt.hashSync(u.password, 10), u.id]);
        });
    });
});

// Export the database object for use in other files
module.exports = db;
