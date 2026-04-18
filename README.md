Game Review Site
A web app for browsing, reviewing, and tracking games. Built with Node.js, Express, EJS, and SQLite.

Setup
bashnpm install
node app.js
Visit http://localhost:3000

Features

Browse and search games (basic + advanced search by genre, platform, release date)
User registration and login (session-based)
Leave, edit, and delete reviews on game pages
Add games to your personal profile and mark as liked/disliked
Gaming profile type based on your most reviewed genre
Admin panel to add, soft-delete, restore games, and delete users

Admin
The account 23shahr2 is automatically granted admin on registration.
Routes
RouteWhat it doesGET /Home page with 8 random gamesGET /game/:idGame details + reviewsPOST /searchBasic title searchPOST /advanced-searchFilter by genre, platform, dateGET /profileYour games + gaming profile typeGET /adminAdmin panel (admin only)
Notes

Passwords stored in plain text — don't use real passwords
Session secret should be set via SESSION_SECRET env variable in production
