const form = document.getElementById('dataForm');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const exstensions = document.getElementById('exstensions').value;
    fetch("/submit_exstensions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'exstensions': exstensions})
    })
    .then((response) => {
        if (response.status !== 200) {
            console.error('Error: ' + response.text);
        } else {
            location.reload();
        }
    })
    .catch((error) => {
        console.error(error);
    });
});