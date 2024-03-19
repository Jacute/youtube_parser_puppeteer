const socket = io();

const form = document.getElementById('dataForm');
const messages = document.getElementById('messages');


function addMessage(message) {
    const item = document.createElement('p');

    item.textContent = message;

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

function addError(message) {
    const item = document.createElement('p');
    item.classList.add('error');
    item.textContent = message;

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

socket.on('output', (output) => {
    addMessage(output);
});

socket.on('error', (output) => {
    addError(output);
});

socket.on('end', (filepath) => {
    console.log(filepath);
    const a = document.createElement('a');
    a.href = filepath;
    a.textContent = 'Result';
    messages.appendChild(a);
})

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const searchQueries = document.getElementById('searchQueries').value.split('\n');
    const parseType = document.getElementById('parseType').value;
    const subscribers = document.getElementById('subscribers').value;
    const views = document.getElementById('views').value;

    if (searchQueries && parseType && subscribers && views) {
        socket.emit('run', searchQueries, parseType, subscribers, views);
    }
});
