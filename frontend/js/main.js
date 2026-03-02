// frontend/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const methodsList = document.getElementById('methods-list');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    let apiBase = '';
    if (window.APP_MODE === 'mock') {
        apiBase = './mocks/';
    } else {
        apiBase = '/api/';
    }

    fetch(`${apiBase}algorithms${window.APP_MODE === 'mock' ? '.json' : ''}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load methods');
            return response.json();
        })
        .then(methods => {
            loading.style.display = 'none';
            const ul = document.createElement('ul');
            methods.forEach(method => {
                const li = document.createElement('li');
                li.textContent = method.name;
                li.addEventListener('click', () => {
                    localStorage.setItem('algorithm_id', method.id);
                    window.location.href = 'input.html';
                });
                ul.appendChild(li);
            });
            methodsList.appendChild(ul);
        })
        .catch(error => {
            loading.style.display = 'none';
            errorDiv.textContent = error.message;
        });
});