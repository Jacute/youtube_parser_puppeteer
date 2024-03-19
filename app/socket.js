const socketIO = require('socket.io');
const YoutubeParser = require('./parser');
const { readFile } = require('./utils');
const { logger } = require('./logger');

function socketRun(server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log('Connection successful. Socket ID: ' + socket.id);

        socket.on('run', (searchQueries, parseType, subscribers, views) => {
            // let correctKeywords = readFile(process.env.CORRECT_KEYWORDS_PATH).split('\n');
            let incorrectUrls = readFile('./exstensionUrls.txt').split('\n');

            const parser = new YoutubeParser(searchQueries, incorrectUrls, parseType, subscribers, views);

            parser.on('output', (output) => {
                console.log(output);
                socket.emit('output', output);
            });
        
            parser.on('error', (output) => {
                logger.error(output);
                console.error(output);
                socket.emit('error', output);
            });

            try {
                parser.start().then((filepath) => {
                    let pathes = filepath.split('/');
                    if (filepath) socket.emit('end', 'data/' + pathes[pathes.length - 1]);
                });
            } catch (err) {
                socket.emit('error', err);
            }
        });

        socket.on('disconnect', () => {
            console.log('Connection is broken. Socket ID: ' + socket.id);
        });
    })
}

module.exports = { socketRun };