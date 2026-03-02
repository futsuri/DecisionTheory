// frontend/js/input.js
document.addEventListener('DOMContentLoaded', () => {
    const algorithmId = localStorage.getItem('algorithm_id');
    if (!algorithmId) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('method-id').textContent = `Method ID: ${algorithmId}`;

    const form = document.getElementById('inputForm');
    const formContent = document.getElementById('form-content');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    // Function to generate matrix table
    function generateMatrixTable(size, label, isAHP = true) {
        const container = document.createElement('div');
        container.innerHTML = `<h3>${label}</h3>`;
        const table = document.createElement('table');
        for (let i = 0; i < size; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('td');
                if (i === j) {
                    cell.innerHTML = '<input type="number" value="1" disabled>';
                } else if (i > j && isAHP) {
                    cell.innerHTML = '<input type="number" class="matrix-input" data-row="' + i + '" data-col="' + j + '" min="0.1" max="9" step="0.1" required>';
                    // Add event to mirror 1/value
                    cell.querySelector('input').addEventListener('input', (e) => {
                        const mirrorInput = table.querySelector(`input[data-row="${j}"][data-col="${i}"]`);
                        if (mirrorInput) mirrorInput.value = (1 / parseFloat(e.target.value) || 1).toFixed(2);
                    });
                } else if (i < j && isAHP) {
                    cell.innerHTML = '<input type="number" value="1" disabled>';
                } else {
                    cell.innerHTML = '<input type="number" class="matrix-input" data-row="' + i + '" data-col="' + j + '" required>';
                }
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
        container.appendChild(table);
        return container;
    }

    // Generate form based on algorithm
    if (algorithmId === 'ahp') {
        // AHP form
        formContent.innerHTML = `
            <label>Number of Criteria: <input type="number" id="num_criteria" min="2" required></label>
            <label>Number of Alternatives: <input type="number" id="num_alternatives" min="2" required></label>
            <button type="button" id="generate_matrices">Generate Matrices</button>
            <div id="matrices"></div>
        `;

        document.getElementById('generate_matrices').addEventListener('click', () => {
            const numCriteria = parseInt(document.getElementById('num_criteria').value);
            const numAlternatives = parseInt(document.getElementById('num_alternatives').value);
            const matricesDiv = document.getElementById('matrices');
            matricesDiv.innerHTML = '';

            // Criteria matrix
            matricesDiv.appendChild(generateMatrixTable(numCriteria, 'Criteria Pairwise Matrix'));

            // Alternatives matrices per criterion
            for (let c = 0; c < numCriteria; c++) {
                matricesDiv.appendChild(generateMatrixTable(numAlternatives, `Alternatives Pairwise for Criterion ${c+1}`));
            }
        });
    } else if (algorithmId === 'wsm') {
        // WSM form
        formContent.innerHTML = `
            <label>Number of Criteria: <input type="number" id="num_criteria" min="2" required></label>
            <label>Number of Alternatives: <input type="number" id="num_alternatives" min="2" required></label>
            <button type="button" id="generate_form">Generate Form</button>
            <div id="weights"></div>
            <div id="scores"></div>
        `;

        document.getElementById('generate_form').addEventListener('click', () => {
            const numCriteria = parseInt(document.getElementById('num_criteria').value);
            const numAlternatives = parseInt(document.getElementById('num_alternatives').value);
            const weightsDiv = document.getElementById('weights');
            const scoresDiv = document.getElementById('scores');
            weightsDiv.innerHTML = '<h3>Weights</h3>';
            for (let i = 0; i < numCriteria; i++) {
                weightsDiv.innerHTML += `<label>Weight for Criterion ${i+1}: <input type="number" class="weight-input" min="0" step="0.1" required></label><br>`;
            }

            scoresDiv.innerHTML = '<h3>Scores</h3>';
            const table = document.createElement('table');
            for (let a = 0; a < numAlternatives; a++) {
                const row = document.createElement('tr');
                row.innerHTML = `<td>Alternative ${a+1}</td>`;
                for (let c = 0; c < numCriteria; c++) {
                    row.innerHTML += `<td><input type="number" class="score-input" data-alt="${a}" data-crit="${c}" required></td>`;
                }
                table.appendChild(row);
            }
            scoresDiv.appendChild(table);
        });
    } else {
        errorDiv.textContent = 'Unknown method';
        errorDiv.classList.remove('hidden');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        loading.classList.remove('hidden');
        errorDiv.classList.add('hidden');

        let parameters = {};
        if (algorithmId === 'ahp') {
            const numCriteria = parseInt(document.getElementById('num_criteria').value);
            const numAlternatives = parseInt(document.getElementById('num_alternatives').value);
            parameters.num_criteria = numCriteria;
            parameters.num_alternatives = numAlternatives;

            // Collect criteria matrix (full matrix, including mirrors)
            const criteriaMatrix = Array.from({length: numCriteria}, () => Array(numCriteria).fill(1));
            document.querySelectorAll('#matrices > div:first-child table .matrix-input').forEach(input => {
                const r = parseInt(input.dataset.row);
                const c = parseInt(input.dataset.col);
                criteriaMatrix[r][c] = parseFloat(input.value);
                criteriaMatrix[c][r] = 1 / criteriaMatrix[r][c];
            });
            parameters.criteria_matrix = criteriaMatrix;

            // Collect alt matrices
            parameters.alt_matrices = [];
            const altMatrixDivs = document.querySelectorAll('#matrices > div:not(:first-child)');
            altMatrixDivs.forEach((div, idx) => {
                const matrix = Array.from({length: numAlternatives}, () => Array(numAlternatives).fill(1));
                div.querySelectorAll('.matrix-input').forEach(input => {
                    const r = parseInt(input.dataset.row);
                    const c = parseInt(input.dataset.col);
                    matrix[r][c] = parseFloat(input.value);
                    matrix[c][r] = 1 / matrix[r][c];
                });
                parameters.alt_matrices.push(matrix);
            });
        } else if (algorithmId === 'wsm') {
            const numCriteria = parseInt(document.getElementById('num_criteria').value);
            const numAlternatives = parseInt(document.getElementById('num_alternatives').value);
            parameters.num_criteria = numCriteria;
            parameters.num_alternatives = numAlternatives;

            parameters.weights = [];
            document.querySelectorAll('.weight-input').forEach(input => {
                parameters.weights.push(parseFloat(input.value));
            });

            parameters.scores = Array.from({length: numAlternatives}, () => Array(numCriteria).fill(0));
            document.querySelectorAll('.score-input').forEach(input => {
                const a = parseInt(input.dataset.alt);
                const c = parseInt(input.dataset.crit);
                parameters.scores[a][c] = parseFloat(input.value);
            });
        }

        let apiBase = '';
        if (window.APP_MODE === 'mock') {
            apiBase = './mocks/';
        } else {
            apiBase = '/api/';
        }

        const endpoint = window.APP_MODE === 'mock' ? 'run_created.json' : 'runs';

        fetch(`${apiBase}${endpoint}`, {
            method: window.APP_MODE === 'mock' ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: window.APP_MODE === 'real' ? JSON.stringify({ algorithm_id: algorithmId, parameters }) : null
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to create run');
            return response.json();
        })
        .then(data => {
            localStorage.setItem('run_id', data.run_id);
            window.location.href = 'report.html';
        })
        .catch(error => {
            loading.classList.add('hidden');
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        });
    });
});