const db = require('./db');

// 설정 저장
function saveSetting(guildId, data) {
    return new Promise((resolve, reject) => {
        const { infoChannelId, embedTitle, embedDesc, embedColor, questionCount, questions } = data;
        const questionsJson = JSON.stringify(questions);
        
        db.run(
            `INSERT OR REPLACE INTO settings (guildId, infoChannelId, embedTitle, embedDesc, embedColor, questionCount, questions, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [guildId, infoChannelId, embedTitle, embedDesc, embedColor, questionCount, questionsJson],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 설정 조회
function getSetting(guildId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM settings WHERE guildId = ?`,
            [guildId],
            (err, row) => {
                if (err) reject(err);
                else {
                    if (row) {
                        row.questions = JSON.parse(row.questions);
                    }
                    resolve(row);
                }
            }
        );
    });
}

// 설정 삭제
function deleteSetting(guildId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM settings WHERE guildId = ?`,
            [guildId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 유저 정보 저장
function saveUserData(guildId, userId, data) {
    return new Promise((resolve, reject) => {
        const dataJson = JSON.stringify(data);
        db.run(
            `INSERT OR REPLACE INTO user_data (guildId, userId, data, updatedAt)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [guildId, userId, dataJson],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 유저 정보 조회
function getUserData(guildId, userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM user_data WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            (err, row) => {
                if (err) reject(err);
                else {
                    if (row) {
                        row.data = JSON.parse(row.data);
                    }
                    resolve(row);
                }
            }
        );
    });
}

// 유저 정보 삭제
function deleteUserData(guildId, userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM user_data WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 모든 유저 정보 조회
function getAllUserData(guildId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM user_data WHERE guildId = ?`,
            [guildId],
            (err, rows) => {
                if (err) reject(err);
                else {
                    rows = rows || [];
                    rows.forEach(row => {
                        row.data = JSON.parse(row.data);
                    });
                    resolve(rows);
                }
            }
        );
    });
}

// 모든 유저 정보 삭제
function deleteAllUserData(guildId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM user_data WHERE guildId = ?`,
            [guildId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 메시지 ID 저장
function saveUserMessage(guildId, userId, messageId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO user_messages (guildId, userId, messageId)
             VALUES (?, ?, ?)`,
            [guildId, userId, messageId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 메시지 ID 조회
function getUserMessage(guildId, userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT messageId FROM user_messages WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.messageId : null);
            }
        );
    });
}

// 메시지 ID 삭제
function deleteUserMessage(guildId, userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM user_messages WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 티켓 저장
function saveOpenTicket(guildId, userId, channelId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO open_tickets (guildId, userId, channelId)
             VALUES (?, ?, ?)`,
            [guildId, userId, channelId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 티켓 조회
function getOpenTicket(guildId, userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT channelId FROM open_tickets WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.channelId : null);
            }
        );
    });
}

// 티켓 삭제
function deleteOpenTicket(guildId, userId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM open_tickets WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// 서버의 모든 티켓 조회
function getAllOpenTickets(guildId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM open_tickets WHERE guildId = ?`,
            [guildId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

// 서버의 모든 유저 정보 수 조회
function getUserDataCount(guildId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) as count FROM user_data WHERE guildId = ?`,
            [guildId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            }
        );
    });
}

// 상담 내용 저장
function saveTicketSummary(guildId, channelId, userId, title, details) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO ticket_summaries (guildId, channelId, userId, title, details)
             VALUES (?, ?, ?, ?, ?)`,
            [guildId, channelId, userId, title, details],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// 현재 채널의 상담 내용 조회
function getTicketSummaries(guildId, channelId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, userId, title, details, createdAt
             FROM ticket_summaries
             WHERE guildId = ? AND channelId = ?
             ORDER BY id DESC`,
            [guildId, channelId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

module.exports = {
    saveSetting,
    getSetting,
    deleteSetting,
    saveUserData,
    getUserData,
    deleteUserData,
    getAllUserData,
    deleteAllUserData,
    saveUserMessage,
    getUserMessage,
    deleteUserMessage,
    saveOpenTicket,
    getOpenTicket,
    deleteOpenTicket,
    getAllOpenTickets,
    getUserDataCount,
    saveTicketSummary,
    getTicketSummaries
};
