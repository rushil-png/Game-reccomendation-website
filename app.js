const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./database');
const app = express();
const PORT = process.env.PORT || 3000; 

app.listen(PORT, (err) => {
    if (err) {
        console.error('Failed to start server:', err);
    } else {
        console.log('Server is running on port ' + PORT);
    }
    console.log(`Access the server at http://localhost:${PORT}`);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

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
    db.all("SELECT * FROM games WHERE title LIKE ?", [`%${searchTerm}%`], (err, games) => {
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
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            req.session.user = {
                id: row.id,
                username: row.username,
                isAdmin: row.isAdmin === 1
            };
            res.redirect('/');
        } else {
            res.render('login', { message: "Invalid username or password." });
        }
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
        stmt.run(username, password, isAdmin ? 1 : 0, function(err) {
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
    const gameId = req.params.id;
    const userId = req.session.user.id;
    const reviewText = req.body.review;

    if (!reviewText) {
        return res.status(400).send("Review text is required.");
    }

    db.run(
        "INSERT INTO reviews (user_id, game_id, text) VALUES (?, ?, ?)",
        [userId, gameId, reviewText],
        function (err) {
            if (err) {
                return res.status(500).send("Error submitting review.");
            }
            res.redirect(`/game/${gameId}`);
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

    const userId = req.params.id;
    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    stmt.run(userId, function(err) {
        if (err) {
            return res.status(400).send("Error deleting user.");
        }
        res.redirect('/admin');
    });
    stmt.finalize();
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
app.get('/advanced-search', (req, res) => {
    res.render('advanced-search');
});

app.post('/advanced-search', (req, res) => {
    const { searchTerm, genre, platform, releaseDate } = req.body;

    let sql = 'SELECT * FROM games WHERE 1=1';
    const params = [];

    if (genre && genre.trim() !== '') {
        sql += ' AND genre = ?';
        params.push(genre);
    }
    if (platform && platform.trim() !== '') {
        sql += ' AND platform = ?';
        params.push(platform);
    }
    if (releaseDate && releaseDate.trim() !== '') {
        sql += ' AND release_date >= ?';
        params.push(releaseDate);
    }
    if (searchTerm && searchTerm.trim() !== '') {
        sql += ' AND (title LIKE ? OR genre LIKE ? OR platform LIKE ? OR information LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }

    db.all(sql, params, (err, games) => {
        if (err) {
            return res.status(500).send("Error searching for games.");
        }

        // Get recommended games based on search criteria (optional)
        let recommendedGames = [];
        if (games.length > 0) {
            const genreCounts = {};
            games.forEach(game => genreCounts[game.genre] = (genreCounts[game.genre] || 0) + 1);
            const mostCommonGenre = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b);

            const gameIds = games.map(g => g.id);
            db.all(
                `SELECT * FROM games WHERE genre = ? AND id NOT IN (${gameIds.map(() => '?').join(',')}) LIMIT 5`,
                [mostCommonGenre, ...gameIds],
                (err, recs) => {
                    recommendedGames = recs || [];
                    res.render('search-results', { games, searchTerm, recommendedGames });
                }
            );
        } else {
            db.all("SELECT * FROM games ORDER BY RANDOM() LIMIT 5", [], (err, recs) => {
                recommendedGames = recs || [];
                res.render('search-results', { games, searchTerm, recommendedGames });
            });
        }
    });
});



// Leave a Review
app.post('/review/edit/:id', isAuthenticated, (req, res) => {
    const reviewId = req.params.id;
    const newReviewText = req.body.newReview;

    const stmt = db.prepare("UPDATE reviews SET text = ? WHERE id = ?");
    stmt.run(newReviewText, reviewId, function(err) {
        if (err) {
            return res.status(400).send("Error editing review.");
        }
        res.redirect(`/game/${req.body.gameId}`);
    });
    stmt.finalize();
});

// Delete Review
app.post('/review/delete/:id', isAuthenticated, (req, res) => {
    const reviewId = req.params.id;
    const gameId = req.body.gameId;

    db.get("SELECT user_id FROM reviews WHERE id = ?", [reviewId], (err, review) => {
        if (err || !review) {
            return res.status(400).send("Error finding review.");
        }
        if (review.user_id === req.session.user.id || req.session.user.isAdmin) {
            const stmt = db.prepare("DELETE FROM reviews WHERE id = ?");
            stmt.run(reviewId, function(err) {
                if (err) {
                    return res.status(400).send("Error deleting review.");
                }
                res.redirect(`/game/${gameId}`);
            });
            stmt.finalize();
        } else {
            res.status(403).send("You do not have permission to delete this review.");
        }
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

// Add Sample Games
require('./addSampleGames.js');

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