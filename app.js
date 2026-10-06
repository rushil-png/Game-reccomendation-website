const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./database');
const http = require('http');
const os = require('os');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false
});
app.use(sessionMiddleware);

// Share the login session with Socket.IO so sockets know who is connected
io.engine.use(sessionMiddleware);

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Home Page
app.get('/', (req, res) => {
    db.all("SELECT * FROM games ORDER BY RANDOM() LIMIT 8", [], (err, featuredGames) => {
        if (err) {
            console.error("Error retrieving featured games:", err);
            return res.status(500).send("Error retrieving featured games.");
        }
        res.render('index', { featuredGames });
    });
});
//search
app.post('/search', (req, res) => {
    const searchTerm = req.body.searchTerm;
    db.all("SELECT * FROM games WHERE deleted = 0 AND title LIKE ?", [`%${searchTerm}%`], (err, games) => {
        if (err) {
            return res.status(500).send("Error searching for games.");
        }
        res.render('search', { games, searchTerm });
    });
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login', { message: null });
});

// Login Handler
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (!row || !bcrypt.compareSync(String(password || ''), row.password)) {
            return res.render('login', { message: "Invalid username or password." });
        }
        req.session.user = { id: row.id, username: row.username, isAdmin: row.isAdmin === 1 };
        res.redirect('/');
    });
});

// Register Page
app.get('/register', (req, res) => {
    res.render('register', { message: null });
});

// Register Handler
app.post('/register', (req, res) => {
    const { username, password, confirm_password } = req.body;

    if (username.length < 5 || password.length <= 5) {
        return res.render('register', { message: "Username and password must be longer than 5 characters." });
    }

    if (username === password) {
        return res.render('register', { message: "Username cannot be the same as password." });
    }

    if (password !== confirm_password) {
        return res.render('register', { message: "Passwords do not match." });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            return res.render('register', { message: "Error checking username." });
        }
        if (row) {
            return res.render('register', { message: "Username already exists." });
        }

        const isAdmin = username === '23shahr2';

        const stmt = db.prepare("INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)");
        stmt.run(username, bcrypt.hashSync(password, 10), isAdmin ? 1 : 0, function(err) {
            if (err) {
                return res.render('register', { message: "Error creating account." });
            }
            res.redirect('/login');
        });
        stmt.finalize();
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Game Details
app.get('/game/:id', (req, res) => {
    const gameId = req.params.id;
    db.get("SELECT * FROM games WHERE id = ?", [gameId], (err, game) => {
        if (game) {
            db.all(`
                SELECT reviews.*, users.username
                FROM reviews
                JOIN users ON reviews.user_id = users.id
                WHERE reviews.game_id = ?
                ORDER BY reviews.id ASC
            `, [gameId], (err, reviews) => {
                reviews = reviews || [];
                const userId = req.session.user ? req.session.user.id : null;
                const isAdmin = req.session.user && req.session.user.isAdmin;
                db.all("SELECT * FROM games WHERE deleted = 0 ORDER BY RANDOM() LIMIT 8", [], (err, featuredGames) => {
                    if (err) {
                        return res.status(500).send("Error retrieving featured games.");
                    }
                    res.render('game', { game, reviews, userId, isAdmin, featuredGames });
                });
            });
        } else {
            res.status(404).send("Game not found.");
        }
    });
});



// Leave a review
app.post('/game/:id/review', isAuthenticated, (req, res) => {
    const gameId = Number(req.params.id);
    const user = req.session.user;
    const reviewText = (req.body.review || '').trim().slice(0, 2000);
    const wantsJson = (req.get('accept') || '').includes('application/json');

    if (!reviewText) {
        return wantsJson ? res.status(400).json({ error: 'Review text is required.' })
                         : res.status(400).send("Review text is required.");
    }

    db.run(
        "INSERT INTO reviews (user_id, game_id, text) VALUES (?, ?, ?)",
        [user.id, gameId, reviewText],
        function (err) {
            if (err) {
                return wantsJson ? res.status(500).json({ error: 'Error submitting review.' })
                                 : res.status(500).send("Error submitting review.");
            }
            const review = { id: this.lastID, user_id: user.id, username: user.username, text: reviewText };
            // Live update for everyone currently viewing this game, on any device
            io.to(`game:${gameId}`).emit('review:new', review);
            wantsJson ? res.json(review) : res.redirect(`/game/${gameId}`);
        }
    );
});



// edit game
app.get('/admin/edit-game/:id', isAuthenticated, (req, res) => {
    if (!req.session.user.isAdmin) {
        return res.status(403).send("You do not have permission to edit games.");
    }
    const gameId = req.params.id;
    db.get("SELECT * FROM games WHERE id = ?", [gameId], (err, game) => {
        if (err || !game) {
            return res.status(404).send("Game not found.");
        }
        res.render('edit-game', { game });
    });
});


//admin page
app.get('/admin', isAuthenticated, (req, res) => {
    // Only allow admins
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).send("Access denied. Admins only.");
    }

    // Fetch all games (not deleted)
    db.all("SELECT * FROM games WHERE deleted = 0", [], (err, games) => {
        if (err) {
            return res.status(500).send("Error retrieving games.");
        }
        // Fetch deleted games
        db.all("SELECT * FROM games WHERE deleted = 1", [], (err2, deletedGames) => {
            if (err2) {
                return res.status(500).send("Error retrieving deleted games.");
            }
            // Fetch all users
            db.all("SELECT * FROM users", [], (err3, users) => {
                if (err3) {
                    return res.status(500).send("Error retrieving users.");
                }
                // Render the admin panel with all data
                res.render('admin', {
                    games,
                    deletedGames,
                    users
                });
            });
        });
    });
});

// Add Game (Admin)
app.post('/admin/add-game', isAuthenticated, (req, res) => {
    if (!req.session.user.isAdmin) {
        return res.status(403).send("You do not have permission to add games.");
    }
    const { title, genre, release_date, platform, information } = req.body;
    const stmt = db.prepare("INSERT INTO games (title, genre, release_date, platform, information) VALUES (?, ?, ?, ?, ?)");
    stmt.run(title, genre, release_date, platform, information, function(err) {
        if (err) {
            return res.status(400).send("Error adding game.");
        }
        res.redirect('/admin');
    });
    stmt.finalize();
});
// Delete User (Admin)
app.post('/admin/delete-user/:id', isAuthenticated, (req, res) => {
    if (!req.session.user.isAdmin) {
        return res.status(403).send("You do not have permission to delete users.");
    }

    const userId = Number(req.params.id);
    if (userId === req.session.user.id) {
        return res.status(400).send("You cannot delete your own account.");
    }

    // Remove the user's reviews and likes first (they reference the user), then the user
    db.run("DELETE FROM reviews WHERE user_id = ?", [userId], err => {
        if (err) return res.status(400).send("Error deleting user's reviews.");
        db.run("DELETE FROM user_games WHERE user_id = ?", [userId], err2 => {
            if (err2) return res.status(400).send("Error deleting user's data.");
            db.run("DELETE FROM users WHERE id = ?", [userId], err3 => {
                if (err3) return res.status(400).send("Error deleting user.");
                res.redirect('/admin');
            });
        });
    });
});
// Delete game (Admin)
app.post('/admin/delete-game/:id', isAuthenticated, (req, res) => {
    if (!req.session.user.isAdmin) {
        return res.status(403).send("You do not have permission to delete games.");
    }
    const gameId = req.params.id;
    db.run("UPDATE games SET deleted = 1 WHERE id = ?", [gameId], function(err) {
        if (err) {
            return res.status(400).send("Error soft-deleting game.");
        }
        res.redirect('/admin');
    });
});
// Restore game (Admin)
app.post('/admin/restore-game/:id', isAuthenticated, (req, res) => {
    if (!req.session.user.isAdmin) {
        return res.status(403).send("You do not have permission to restore games.");
    }
    const gameId = req.params.id;
    db.run("UPDATE games SET deleted = 0 WHERE id = ?", [gameId], function(err) {
        if (err) {
            return res.status(400).send("Error restoring game.");
        }
        res.redirect('/admin');
    });
});

// Advanced search
// Platform names in the data are inconsistent ("PS4" vs "PlayStation 4"), so each
// dropdown choice maps to every spelling that should match it.
const PLATFORM_OPTIONS = {
    'PC': ['PC'],
    'PlayStation 4': ['PS4', 'PlayStation 4'],
    'PlayStation 5': ['PS5', 'PlayStation 5'],
    'Xbox': ['Xbox'],
    'Nintendo Switch': ['Nintendo Switch'],
    'Mobile': ['Mobile']
};

app.get('/advanced-search', (req, res) => {
    // Build the genre list from the data so every option can actually match something
    db.all("SELECT DISTINCT genre FROM games WHERE deleted = 0 ORDER BY genre", [], (err, rows) => {
        const genres = err ? [] : rows.map(r => r.genre);
        res.render('advanced-search', { genres, platforms: Object.keys(PLATFORM_OPTIONS) });
    });
});

app.post('/advanced-search', (req, res) => {
    const { searchTerm, genre, platform, releaseDate } = req.body;

    let sql = 'SELECT * FROM games WHERE deleted = 0';
    const params = [];

    if (genre && genre.trim() !== '') {
        sql += ' AND genre = ?';
        params.push(genre);
    }
    if (platform && PLATFORM_OPTIONS[platform]) {
        // platform column holds comma-separated lists, so match substrings
        const likes = PLATFORM_OPTIONS[platform].map(() => 'platform LIKE ?').join(' OR ');
        sql += ` AND (${likes})`;
        PLATFORM_OPTIONS[platform].forEach(p => params.push(`%${p}%`));
    }
    if (releaseDate && releaseDate.trim() !== '') {
        sql += ' AND release_date >= ?';
        params.push(releaseDate);
    }
    if (searchTerm && searchTerm.trim() !== '') {
        // Title/description only; searching genre/platform here duplicated the dropdown filters
        sql += ' AND (title LIKE ? OR information LIKE ?)';
        params.push(`%${searchTerm.trim()}%`, `%${searchTerm.trim()}%`);
    }
    sql += ' ORDER BY release_date DESC';

    // Short description of the filters used, shown on the results page
    const criteria = [];
    if (searchTerm && searchTerm.trim()) criteria.push(`"${searchTerm.trim()}"`);
    if (genre) criteria.push(genre);
    if (platform) criteria.push(platform);
    if (releaseDate) criteria.push(`released after ${releaseDate}`);
    const label = criteria.join(', ') || 'all games';

    db.all(sql, params, (err, games) => {
        if (err) {
            return res.status(500).send("Error searching for games.");
        }

        const render = recs => res.render('search-results', {
            games, searchTerm: label, recommendedGames: recs || []
        });

        if (games.length > 0) {
            const genreCounts = {};
            games.forEach(g => genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1);
            const topGenre = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b);
            const ids = games.map(g => g.id);
            db.all(
                `SELECT * FROM games WHERE deleted = 0 AND genre = ? AND id NOT IN (${ids.map(() => '?').join(',')}) ORDER BY RANDOM() LIMIT 5`,
                [topGenre, ...ids],
                (e, recs) => render(recs)
            );
        } else {
            db.all("SELECT * FROM games WHERE deleted = 0 ORDER BY RANDOM() LIMIT 5", [], (e, recs) => render(recs));
        }
    });
});

// Leave a Review
app.post('/review/edit/:id', isAuthenticated, (req, res) => {
    const reviewId = req.params.id;
    const newReviewText = (req.body.newReview || '').trim();
    db.get("SELECT user_id, game_id FROM reviews WHERE id = ?", [reviewId], (err, review) => {
        if (err || !review) return res.status(400).send("Error finding review.");
        if (review.user_id !== req.session.user.id && !req.session.user.isAdmin) {
            return res.status(403).send("You do not have permission to edit this review.");
        }
        db.run("UPDATE reviews SET text = ? WHERE id = ?", [newReviewText, reviewId], function (err2) {
            if (err2) return res.status(400).send("Error editing review.");
            io.to(`game:${review.game_id}`).emit('review:edited', { id: Number(reviewId), text: newReviewText });
            res.redirect(`/game/${review.game_id}`);
        });
    });
});

// Delete Review
app.post('/review/delete/:id', isAuthenticated, (req, res) => {
    const reviewId = req.params.id;
    const wantsJson = (req.get('accept') || '').includes('application/json');

    db.get("SELECT user_id, game_id FROM reviews WHERE id = ?", [reviewId], (err, review) => {
        if (err || !review) {
            return wantsJson ? res.status(400).json({ error: 'Review not found.' }) : res.status(400).send("Error finding review.");
        }
        if (review.user_id !== req.session.user.id && !req.session.user.isAdmin) {
            return wantsJson ? res.status(403).json({ error: 'Not allowed.' }) : res.status(403).send("You do not have permission to delete this review.");
        }
        db.run("DELETE FROM reviews WHERE id = ?", [reviewId], function (err2) {
            if (err2) {
                return wantsJson ? res.status(500).json({ error: 'Error deleting review.' }) : res.status(400).send("Error deleting review.");
            }
            io.to(`game:${review.game_id}`).emit('review:deleted', { id: Number(reviewId) });
            wantsJson ? res.json({ ok: true }) : res.redirect(`/game/${review.game_id}`);
        });
    });
});

// Function to determine the user's gaming profile
function determineGamingProfile(userGames) {
    if (userGames.length === 0) {
        return 'Casual';
    }

    const genreCounts = {};

    userGames.forEach(game => {
        if (!game || !game.genre) {
            console.warn("Invalid game object found in userGames:", game);
            return;
        }

        const genre = game.genre;
        if (genreCounts[genre]) {
            genreCounts[genre]++;
        } else {
            genreCounts[genre] = 1;
        }
    });

    const maxGenre = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b);

    switch (maxGenre) {
        case 'Action':
            return 'Action';
        case 'Adventure':
            return 'Adventure';
        case 'RPG':
            return 'Role-playing';
        case 'Simulation':
            return 'Simulation';
        case 'Strategy':
            return 'Strategy';
        case 'Sports':
            return 'Sports';
        default:
            return 'Casual';
    }
}


// Profile Page
app.get('/profile', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    db.all(`
        SELECT g.title, g.genre, ug.liked
        FROM user_games ug
        JOIN games g ON ug.game_id = g.id
        WHERE ug.user_id = ?
    `, [userId], (err, userGames) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error retrieving user games.");
        }

        const gamingProfile = determineGamingProfile(userGames);

        res.render('profile', { userGames, gamingProfile });
    });
});

// Add Game to User's Profile
app.post('/profile/add-game', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { gameName, liked } = req.body;

    // Look up the game by name
    db.get("SELECT id FROM games WHERE LOWER(title) = LOWER(?)", [gameName], (err, game) => {
        if (err) {
            return res.status(500).send("Error retrieving game.");
        }
        if (!game) {
            return res.status(404).send("Game not found.");
        }
        const gameId = game.id;
        
        // Insert into user_games without genre_id
        const stmt = db.prepare("INSERT INTO user_games (user_id, game_id, liked) VALUES (?, ?, ?)");
        stmt.run(userId, gameId, liked ? 1 : 0, function(err) {
            if (err) {
                return res.status(400).send("Error adding game to profile.");
            }
            res.redirect('/profile');
        });
        stmt.finalize();
    });
});

// Delete game
app.post('/profile/delete-game/:gameId', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const gameId = req.params.gameId;
    db.run("DELETE FROM user_games WHERE user_id = ? AND game_id = ?", [userId, gameId], function(err) {
        if (err) {
            return res.status(400).send("Error deleting game from profile.");
        }
        res.redirect('/profile');
    });
});

// ---- Live updates (Socket.IO) ----
// Each game page joins a room, so comments appear instantly on every open device.
function viewerCount(room) {
    return io.sockets.adapter.rooms.get(room)?.size || 0;
}

io.on('connection', socket => {
    let joined = null;
    socket.on('game:join', gameId => {
        const id = Number(gameId);
        if (!Number.isInteger(id)) return;
        joined = `game:${id}`;
        socket.join(joined);
        io.to(joined).emit('game:viewers', viewerCount(joined));
    });
    socket.on('disconnect', () => {
        if (joined) io.to(joined).emit('game:viewers', viewerCount(joined));
    });
});

// Listen on all network interfaces so phones/tablets on the same Wi-Fi can connect
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running:  http://localhost:${PORT}`);
    Object.values(os.networkInterfaces()).flat()
        .filter(i => i && i.family === 'IPv4' && !i.internal)
        .forEach(i => console.log(`On your network: http://${i.address}:${PORT}`));
});
