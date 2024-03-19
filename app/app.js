const express = require('express');
const process = require('process');
const path = require('path');
const http = require('http');

const { socketRun } = require('./socket');
const { writeFile, readFile } = require('./utils');
const { logger } = require('./logger')

require('dotenv').config();
const exstensionUrlsPath = './exstensionUrls.txt';
// const correctKeywordsPath = './correctKeywords.txt';
const domainRegexp = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

const app = express();
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

const server = http.createServer(app);

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/add_exstenstions', (req, res) => {
    const exstensions = readFile(exstensionUrlsPath).split('\n');
    res.render('add_exstensions', { exstensions });
});

// app.get('/add_keywords', (req, res) => {
//     const keywords = readFile(correctKeywordsPath).split('\n');
//     res.render('add_keywords', { keywords });
// });

app.post('/submit_exstensions', (req, res) => {
    try {
        const exstensions = req.body.exstensions + '\n';
        writeFile(exstensionUrlsPath, exstensions);
        res.status(200).send('OK');
    } catch (e) {
        logger.error(e);
        res.status(400).send('BAD');
    }
});

// app.post('/submit_keywords', (req, res) => {
//     try {
//         const keywords = req.body.keywords + '\n';
//         writeFile(correctKeywordsPath, keywords);
//         res.status(200).send('OK');
//     } catch (e) {
//         logger.error(e);
//         res.status(400).send('BAD');
//     }
// });

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;

server.listen(PORT, HOST, () => {
    logger.info('Server listening on port ' + PORT);
    console.log('Server listening on port ' + PORT);
});

socketRun(server);