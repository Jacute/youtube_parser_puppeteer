const socketIO = require('socket.io');
const YoutubeParser = require('./parser');
const { readFile } = require('./utils');
const { logger } = require('./logger');

function socketRun(server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log('Connection successful. Socket ID: ' + socket.id);
        
        const parser = new YoutubeParser();
        socket.parser = parser;

        socket.on('run', (searchReqs, parseType, subscribers, views) => {
            // let correctKeywords = readFile(process.env.CORRECT_KEYWORDS_PATH).split('\n');
            let incorrectUrls = readFile('./exstensionUrls.txt').split('\n');

            socket.parser.searchReqs = searchReqs;
            socket.parser.parseType = parseType;
            socket.parser.subscribers = subscribers;
            socket.parser.views = views;
            socket.parser.incorrectUrls = incorrectUrls;

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
                    if (filepath) {
                        let pathes = filepath.split('/');
                        socket.emit('end', 'data/' + pathes[pathes.length - 1]);
                    }
                    parser.close();
                });
            } catch (err) {
                socket.emit('error', err);
            }
        });

        socket.on('disconnect', () => {
            console.log('Connection is broken. Socket ID: ' + socket.id);
            socket.parser.close();
        });
    })
}

module.exports = { socketRun };