const form = document.getElementById('dataForm');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const keywords = document.getElementById('keywords').value;
    fetch("/submit_keywords", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'keywords': keywords})
    })
    .then((response) => {
        if (response.status !== 200) {
            console.error('Error: ' + response.text);
        }
    })
    .catch((error) => {
        console.error(error);
    });

    location.reload();
});