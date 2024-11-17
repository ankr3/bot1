// database.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./transport.db");

db.serialize(() => {
    // Создаем таблицу для транспортных средств, если она не существует
    db.run(`
        CREATE TABLE IF NOT EXISTS transport (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            fuel INTEGER DEFAULT 100,
            status TEXT DEFAULT 'Свободна',
            user TEXT DEFAULT NULL,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            handledBy TEXT DEFAULT NULL
        )
    `);

    // Создаем таблицу для заявок в семью, если она не существует
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            channelId TEXT,
            messageId TEXT,
            nameSurname TEXT,
            oocInfo TEXT,
            familyHistory TEXT DEFAULT 'Не указано',
            onlineTime TEXT,
            familyReason TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'На рассмотрении',
            handledBy TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS points (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          jobKey TEXT NOT NULL,
          nameSurname TEXT,
          proof TEXT,
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
});

module.exports = db;