const fs = require('fs');
const { logger } = require('./logger');


function readFile(filepath) {
    return fs.readFileSync(filepath, 'utf-8');
}

function appendFile(filepath, text) {
    fs.appendFileSync(filepath, text, (err) => {
        if (err) {
            logger.error(err);
            console.error(err);
        }
    });
}

function writeFile(filepath, text) {
    fs.writeFileSync(filepath, text, (err) => {
        if (err) {
            logger.error(err);
            console.error(err);
        }
    });
}

function getCurrentDateTime() {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();

    return `${day}.${month}.${year}-${hours}:${minutes}:${seconds}`;
}

module.exports = { readFile, appendFile, writeFile, getCurrentDateTime };