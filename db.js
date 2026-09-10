const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bot.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err);
    } else {
        console.log('데이터베이스 연결 성공');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // 서버별 설정 테이블
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                guildId TEXT PRIMARY KEY,
                infoChannelId TEXT NOT NULL,
                embedTitle TEXT,
                embedDesc TEXT,
                embedColor INTEGER,
                questionCount INTEGER,
                questions TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 유저 정보 테이블
        db.run(`
            CREATE TABLE IF NOT EXISTS user_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                data TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guildId, userId)
            )
        `);

        // 메시지 ID 매핑 테이블
        db.run(`
            CREATE TABLE IF NOT EXISTS user_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                messageId TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guildId, userId)
            )
        `);

        // 열린 티켓 테이블
        db.run(`
            CREATE TABLE IF NOT EXISTS open_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                channelId TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guildId, userId)
            )
        `);
    });
}

module.exports = db;
