// addSampleGames.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('games.db');

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO games (title, genre, release_date, platform, information) VALUES (?, ?, ?, ?, ?)");

    // Sample games
    const games = [
        { title: "The Legend of Zelda: Breath of the Wild", genre: "Action-Adventure", release_date: "2017-03-03", platform: "Nintendo Switch", information: "An open-world action-adventure game set in the land of Hyrule." },
        { title: "God of War", genre: "Action-Adventure", release_date: "2018-04-20", platform: "PlayStation 4", information: "A third-person action-adventure game that follows Kratos and his son Atreus." },
        { title: "The Witcher 3: Wild Hunt", genre: "RPG", release_date: "2015-05-19", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "An open-world RPG that follows Geralt of Rivia on his quest to find his adopted daughter." },
        { title: "Minecraft", genre: "Sandbox", release_date: "2011-11-18", platform: "PC, Console, Mobile", information: "A sandbox game that allows players to build and explore virtual worlds made of blocks." },
        { title: "Fortnite", genre: "Battle Royale", release_date: "2017-07-25", platform: "PC, Console, Mobile", information: "A battle royale game where players compete to be the last one standing." },
        { title: "Red Dead Redemption 2", genre: "Action-Adventure", release_date: "2018-10-26", platform: "PC, PS4, Xbox One", information: "An epic tale of life in America’s unforgiving heartland." },
        { title: "Super Mario Odyssey", genre: "Platform", release_date: "2017-10-27", platform: "Nintendo Switch", information: "Join Mario on a massive globe-trotting adventure!" },
        { title: "Overwatch", genre: "First-Person Shooter", release_date: "2016-05-24", platform: "PC, PS4, Xbox One", information: "A team-based multiplayer first-person shooter." },
        { title: "Apex Legends", genre: "Battle Royale", release_date: "2019-02-04", platform: "PC, PS4, Xbox One", information: "A free-to-play battle royale game set in the Titanfall universe." },
        { title: "Dark Souls III", genre: "Action RPG", release_date: "2016-03-24", platform: "PC, PS4, Xbox One", information: "The final chapter in the Dark Souls series." },
        { title: "Hollow Knight", genre: "Metroidvania", release_date: "2017-02-24", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "A beautifully hand-drawn action-adventure game." },
        { title: "Celeste", genre: "Platform", release_date: "2018-01-25", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "A platformer about climbing a mountain." },
        { title: "Stardew Valley", genre: "Simulation", release_date: "2016-02-26", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "A farming simulation game." },
        { title: "The Last of Us Part II", genre: "Action-Adventure", release_date: "2020-06-19", platform: "PlayStation 4", information: "A sequel to the critically acclaimed The Last of Us." },
        { title: "Ghost of Tsushima", genre: "Action-Adventure", release_date: "2020-07-17", platform: "PlayStation 4", information: "An open-world game set in feudal Japan." },
        { title: "Cyberpunk 2077", genre: "Action RPG", release_date: "2020-12-10", platform: "PC, PS4, Xbox One", information: "An open-world RPG set in a dystopian future." },
        { title: "Assassin's Creed Valh alla", genre: "Action RPG", release_date: "2020-11-10", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S", information: "Become a Viking raider and explore a beautiful open world." },
        { title: "Final Fantasy VII Remake", genre: "RPG", release_date: "2020-04-10", platform: "PS4", information: "A reimagining of the classic RPG with modern graphics and gameplay." },
        { title: "Resident Evil 2", genre: "Survival Horror", release_date: "2019-01-25", platform: "PC, PS4, Xbox One", information: "A remake of the classic survival horror game." },
        { title: "Sekiro: Shadows Die Twice", genre: "Action-Adventure", release_date: "2019-03-22", platform: "PC, PS4, Xbox One", information: "An action-adventure game set in Sengoku period Japan." },
        { title: "Monster Hunter: World", genre: "Action RPG", release_date: "2018-01-26", platform: "PC, PS4, Xbox One", information: "Hunt down massive monsters in a beautiful open world." },
        { title: "The Elder Scrolls V: Skyrim", genre: "RPG", release_date: "2011-11-11", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "An open-world fantasy RPG." },
        { title: "Fallout 4", genre: "RPG", release_date: "2015-11-10", platform: "PC, PS4, Xbox One", information: "An open-world RPG set in a post-apocalyptic world." },
        { title: "Genshin Impact", genre: "Action RPG", release_date: "2020-09-28", platform: "PC, PS4, PS5, Mobile", information: "An open-world action RPG with gacha elements." },
        { title: "Among Us", genre: "Party", release_date: "2018-06-15", platform: "PC, Mobile, Nintendo Switch", information: "A multiplayer game of teamwork and betrayal." },
        { title: "Valorant", genre: "Tactical Shooter", release_date: "2020-06-02", platform: "PC", information: "A team-based tactical shooter." },
        { title: "League of Legends", genre: "MOBA", release_date: "2009-10-27", platform: "PC", information: "A multiplayer online battle arena game." },
        { title: "Dota 2", genre: "MOBA", release_date: "2013-07-09", platform: "PC", information: "A multiplayer online battle arena game." },
        { title: "Counter-Strike: Global Offensive", genre: "First-Person Shooter", release_date: "2012-08-21", platform: "PC, PS4, Xbox One", information: "A team-based first-person shooter." },
        { title: "World of Warcraft", genre: "MMORPG", release_date: "2004-11-23", platform: "PC", information: "A massively multiplayer online role-playing game." },
        { title: "The Sims 4", genre: "Simulation", release_date: "2014-09-02", platform: "PC, PS4, Xbox One", information: "A life simulation game." },
        { title: "Animal Crossing: New Horizons", genre: "Simulation", release_date: "2020-03-20", platform: "Nintendo Switch", information: "A social simulation game." },
        { title: "Rocket League", genre: "Sports", release_date: "2015-07-07", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "A vehicular soccer video game." },
        { title: "FIFA 21", genre: "Sports", release_date: "2020-10-09", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S", information: "A football simulation video game." },
        { title: "NBA 2K21", genre: "Sports", release_date: "2020-09-04", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S", information: "A basketball simulation video game." },
        { title: "Madden NFL 21", genre: "Sports", release_date: "2020-08-28", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S", information: "An American football video game ." },
        { title: "Call of Duty: Warzone", genre: "Battle Royale", release_date: "2020-03-10", platform: "PC, PS4, Xbox One", information: "A free-to-play battle royale game set in the Call of Duty universe." },
        { title: "Battlefield V", genre: "First-Person Shooter", release_date: "2018-11-20", platform: "PC, PS4, Xbox One", information: "A first-person shooter set in World War II." },
        { title: "Ghost Recon Breakpoint", genre: "Tactical Shooter", release_date: "2019-10-04", platform: "PC, PS4, Xbox One", information: "A tactical shooter set in an open world." },
        { title: "Far Cry 5", genre: "First-Person Shooter", release_date: "2018-03-27", platform: "PC, PS4, Xbox One", information: "An open-world first-person shooter set in Montana." },
        { title: "Assassin's Creed Odyssey", genre: "Action RPG", release_date: "2018-10-05", platform: "PC, PS4, Xbox One, Nintendo Switch", information: "An action RPG set in Ancient Greece." },
        { title: "Borderlands 3", genre: "Action RPG", release_date: "2019-09-13", platform: "PC, PS4, Xbox One", information: "A loot-driven first-person shooter." },
        { title: "Monster Hunter Rise", genre: "Action RPG", release_date: "2021-03-26", platform: "Nintendo Switch, PC", information: "A new entry in the Monster Hunter series." },
        { title: "Hades", genre: "Rogue-like", release_date: "2020-09-17", platform: "PC, Nintendo Switch", information: "A rogue-like dungeon crawler." },
        { title: "Ghost of Tsushima: Legends", genre: "Action-Adventure", release_date: "2020-10-16", platform: "PlayStation 4", information: "A cooperative multiplayer mode for Ghost of Tsushima." },
        { title: "Returnal", genre: "Rogue-like", release_date: "2021-04-30", platform: "PlayStation 5", information: "A rogue-like third-person shooter." },
        { title: "Ratchet & Clank: Rift Apart", genre: "Platform", release_date: "2021-06-11", platform: "PlayStation 5", information: "A platform game featuring dimensional rifts." },
        { title: "Metroid Dread", genre: "Action-Adventure", release_date: "2021-10-08", platform: "Nintendo Switch", information: "A new 2D Metroid game." },
        { title: "Forza Horizon 5", genre: "Racing", release_date: "2021-11-09", platform: "PC, Xbox One, Xbox Series X/S", information: "An open-world racing game set in Mexico." },
        { title: "Halo Infinite", genre: "First-Person Shooter", release_date: "2021-12-08", platform: "PC, Xbox One, Xbox Series X/S", information: "The latest entry in the Halo series." },
        { title: "Dying Light 2 Stay Human", genre: "Action RPG", release_date: "2022-02-04", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S", information: "An open-world zombie survival game." },
        { title: "Elden Ring", genre: "Action RPG", release_date: "2022-02-25", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S", information: "An open-world action RPG from the creators of Dark Souls." },
        { title: "Gran Turismo 7", genre: "Racing", release_date: "2022-03-04", platform: "PlayStation 4, PlayStation 5", information: "A racing simulation game." },
        { title: "Stray", genre: "Adventure", release_date: "2022-07-19", platform: "PC, PS4, PS5", information: "An adventure game where you play as a stray cat." },
        { title: "Sonic Frontiers", genre: "Platform", release_date: "2022-11-08", platform: "PC, PS4, PS5, Xbox One, Xbox Series X/S, Nintendo Switch", information: "An open-world Sonic game." },
        { title: "God of War Ragnarök", genre: "Action-Adventure", release_date: "2022-11-09", platform: "PS4, PS5", information: "The sequel to the critically acclaimed God of War." },
        { title: "Horizon Forbidden West", genre: "Action RPG", release_date: "2022-11-10", platform: "PS4, PS5", information: "The sequel to Horizon Zero Dawn." },
        { title: "Control", genre: "FPS", release_date: "2019-09-13", platform: "PC, PS4, Xbox One", information: "A psychological thriller FPS." },
        { title: "Watch Dogs Legion", genre: "Hack 'n' Slash", release_date: "2020-09-17", platform: "PC, PS4, Xbox One", information: "A hack 'n' slash game set in London." },
        { title: "Star Wars Jedi: Fallen Order", genre: "Action RPG", release_date: "2019-11-08", platform: "PS4, Xbox One", information: "A Star Wars-themed action RPG." },
        
    ];

    for (let i = 0; i < games.length; i++) {
        stmt.run(games[i].title, games[i].genre, games[i].release_date, games[i].platform, games[i].information);
    }

    stmt.finalize();

    console.log("Sample data inserted successfully.");
});

db.close();