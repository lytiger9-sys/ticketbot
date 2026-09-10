const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups');
const dbFile = path.join(__dirname, 'bot.db');

// backups 디렉토리 생성
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

function createBackup() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dbFile)) {
            reject(new Error('데이터베이스 파일이 없습니다.'));
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `bot-backup-${timestamp}.db`);

        fs.copyFile(dbFile, backupFile, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(backupFile);
            }
        });
    });
}

function getBackups() {
    return new Promise((resolve, reject) => {
        fs.readdir(backupDir, (err, files) => {
            if (err) {
                reject(err);
            } else {
                const backups = files
                    .filter(file => file.startsWith('bot-backup-') && file.endsWith('.db'))
                    .sort()
                    .reverse();
                resolve(backups);
            }
        });
    });
}

function restoreBackup(backupFileName) {
    return new Promise((resolve, reject) => {
        const backupFile = path.join(backupDir, backupFileName);

        if (!fs.existsSync(backupFile)) {
            reject(new Error('백업 파일이 없습니다.'));
            return;
        }

        // 현재 데이터베이스 백업
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const currentBackup = path.join(backupDir, `bot-current-${timestamp}.db`);

        fs.copyFile(dbFile, currentBackup, (err) => {
            if (err) {
                reject(err);
                return;
            }

            // 복구
            fs.copyFile(backupFile, dbFile, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(currentBackup);
                }
            });
        });
    });
}

module.exports = {
    createBackup,
    getBackups,
    restoreBackup
};
