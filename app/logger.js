const winston = require('winston');

// Создание логгера с настройками
const logger = winston.createLogger({
    level: 'info', // Уровень логирования
    format: winston.format.json(), // Формат логов
    transports: [
        new winston.transports.File({ filename: 'logfile.log' }) // Запись в файл
    ]
});

module.exports = { logger };