const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');

// logs 디렉토리 생성
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

function getTimestamp() {
    const now = new Date();
    return now.toISOString();
}

function log(level, message, error = null) {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] [${level}] ${message}${error ? '\n' + error.stack : ''}`;
    
    console.log(logMessage);
    
    const logFile = path.join(logsDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
}

function info(message) {
    log('INFO', message);
}

function error(message, err) {
    log('ERROR', message, err);
}

function warn(message) {
    log('WARN', message);
}

function debug(message) {
    log('DEBUG', message);
}

module.exports = {
    info,
    error,
    warn,
    debug
};
