// js/nature_game.js

const STORAGE_KEY = "nature_game_state";

const DEFAULT_STATE = {
    decisionMaker: "Лицо, принимающее решение",
    lambda: 0.65,
    rowNames: ["Стратегия 1", "Стратегия 2", "Стратегия 3"],
    colNames: ["Состояние 1", "Состояние 2", "Состояние 3", "Состояние 4"],
    matrix: [
        [120, 80, 40, -10],
        [150, 60, 20, -30],
        [90, 110, 70, 30]
    ],
    probabilities: [0.4, 0.3, 0.2, 0.1],
    description: ""
};

let examples = [];

const state = load(STORAGE_KEY, DEFAULT_STATE);

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    elements.decisionMaker = document.getElementById("decision-maker");
    elements.lambda = document.getElementById("hurwicz-lambda");
    elements.matrixWrap = document.getElementById("nature-matrix-wrap");
    elements.probWrap = document.getElementById("probabilities-wrap");
    elements.status = document.getElementById("nature-status");
    elements.exampleSelect = document.getElementById("nature-example-select");
    elements.description = document.getElementById("nature-description");

    initExamples();
    bindControls();
    render();
});

function initExamples() {
    if (!elements.exampleSelect) return;
    loadExamples().then(() => {
        elements.exampleSelect.innerHTML = examples.map(example => (
            `<option value="${example.id}">${example.title}</option>`
        )).join("");
        if (examples.length) {
            elements.exampleSelect.value = examples[0].id;
        }
    });

    const btn = document.getElementById("nature-example-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            const example = examples.find(item => item.id === elements.exampleSelect.value);
            if (example) {
                applyExample(example);
            }
        });
    }
}

function bindControls() {
    const submitBtn = document.getElementById("nature-submit");
    if (submitBtn) {
        submitBtn.addEventListener("click", onSubmit);
    }

    const resetBtn = document.getElementById("nature-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", onReset);
    }

    const addRow = document.getElementById("add-row");
    const removeRow = document.getElementById("remove-row");
    const addCol = document.getElementById("add-col");
    const removeCol = document.getElementById("remove-col");

    if (addRow) addRow.addEventListener("click", () => resizeMatrix(1, 0));
    if (removeRow) removeRow.addEventListener("click", () => resizeMatrix(-1, 0));
    if (addCol) addCol.addEventListener("click", () => resizeMatrix(0, 1));
    if (removeCol) removeCol.addEventListener("click", () => resizeMatrix(0, -1));

    if (elements.decisionMaker) {
        elements.decisionMaker.addEventListener("input", (e) => {
            state.decisionMaker = e.target.value || "ЛПР";
            persist();
        });
    }

    if (elements.lambda) {
        elements.lambda.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            state.lambda = Number.isFinite(value) ? value : 0.65;
            persist();
        });
    }
}

function render() {
    if (elements.decisionMaker) elements.decisionMaker.value = state.decisionMaker;
    if (elements.lambda) elements.lambda.value = state.lambda;
    renderDescription();
    renderMatrix();
    renderProbabilities();
}

function renderMatrix() {
    const rows = state.rowNames.length;
    const cols = state.colNames.length;
    const matrix = normalizeMatrix(state.matrix, rows, cols);

    let html = '<table class="game-table">';
    html += '<thead><tr><th></th>';
    state.colNames.forEach((name, idx) => {
        html += `<th><input data-col="${idx}" class="col-name" value="${escapeHtml(name)}"></th>`;
    });
    html += '</tr></thead><tbody>';

    state.rowNames.forEach((name, rowIdx) => {
        html += `<tr><th><input data-row="${rowIdx}" class="row-name" value="${escapeHtml(name)}"></th>`;
        for (let colIdx = 0; colIdx < cols; colIdx++) {
            const value = matrix[rowIdx][colIdx];
            html += `
                <td>
                    <input type="number" step="any" data-row="${rowIdx}" data-col="${colIdx}" class="cell" value="${value}">
                </td>
            `;
        }
        html += '</tr>';
    });

    html += '</tbody></table>';
    elements.matrixWrap.innerHTML = html;

    elements.matrixWrap.querySelectorAll(".row-name").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.row, 10);
            state.rowNames[idx] = e.target.value || `Стратегия ${idx + 1}`;
            persist();
        });
    });

    elements.matrixWrap.querySelectorAll(".col-name").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.col, 10);
            state.colNames[idx] = e.target.value || `Состояние ${idx + 1}`;
            persist();
        });
    });

    elements.matrixWrap.querySelectorAll(".cell").forEach(input => {
        input.addEventListener("input", (e) => {
            const r = parseInt(e.target.dataset.row, 10);
            const c = parseInt(e.target.dataset.col, 10);
            const value = parseFloat(e.target.value);
            if (!state.matrix[r]) {
                state.matrix[r] = [];
            }
            state.matrix[r][c] = Number.isFinite(value) ? value : 0;
            persist();
        });
    });
}

function renderProbabilities() {
    const defaults = [0.4, 0.3, 0.2, 0.1];
    const count = state.colNames.length;
    if (!Array.isArray(state.probabilities)) {
        state.probabilities = defaults.slice(0, count);
    }
    if (state.probabilities.length < count) {
        state.probabilities = state.probabilities.concat(defaults.slice(state.probabilities.length, count));
    }

    elements.probWrap.innerHTML = state.colNames.map((_, idx) => {
        const value = state.probabilities[idx] ?? "";
        return `<input type="number" step="0.01" min="0" max="1" data-prob="${idx}" value="${value}">`;
    }).join("");

    elements.probWrap.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.prob, 10);
            const value = parseFloat(e.target.value);
            state.probabilities[idx] = Number.isFinite(value) ? value : null;
            persist();
        });
    });
}

function normalizeMatrix(matrix, rows, cols) {
    const normalized = [];
    for (let r = 0; r < rows; r++) {
        const row = Array.isArray(matrix[r]) ? matrix[r].slice(0, cols) : [];
        while (row.length < cols) {
            row.push(0);
        }
        normalized.push(row);
    }
    state.matrix = normalized;
    return normalized;
}

function resizeMatrix(rowDelta, colDelta) {
    const nextRows = Math.max(state.rowNames.length + rowDelta, 2);
    const nextCols = Math.max(state.colNames.length + colDelta, 3);

    if (nextRows !== state.rowNames.length) {
        if (nextRows > state.rowNames.length) {
            state.rowNames.push(`Стратегия ${nextRows}`);
        } else {
            state.rowNames.pop();
        }
    }

    if (nextCols !== state.colNames.length) {
        if (nextCols > state.colNames.length) {
            state.colNames.push(`Состояние ${nextCols}`);
        } else {
            state.colNames.pop();
        }
    }

    normalizeMatrix(state.matrix, nextRows, nextCols);
    renderProbabilities();
    persist();
    renderMatrix();
}

function applyExample(example) {
    const data = example.data || {};
    state.decisionMaker = data.decision_maker || "ЛПР";
    state.lambda = data.lambda ?? 0.65;
    state.rowNames = Array.isArray(data.strategies) ? data.strategies.slice() : [];
    state.colNames = Array.isArray(data.states_of_nature) ? data.states_of_nature.slice() : [];
    state.matrix = Array.isArray(data.payoff_matrix) ? data.payoff_matrix.map(row => row.slice()) : [];
    state.probabilities = Array.isArray(data.probabilities) ? data.probabilities.slice() : [];
    state.description = example.description || "";
    persist();
    render();
}

function onReset() {
    state.decisionMaker = "Лицо, принимающее решение";
    state.lambda = 0.65;
    state.rowNames = ["Стратегия 1", "Стратегия 2"];
    state.colNames = ["Состояние 1", "Состояние 2", "Состояние 3"];
    state.matrix = [
        [0, 0, 0],
        [0, 0, 0]
    ];
    state.probabilities = [0.4, 0.3, 0.2];
    state.description = "";
    persist();
    render();
}

function renderDescription() {
    if (!elements.description) {
        return;
    }
    const text = (state.description || "").trim();
    if (!text) {
        elements.description.style.display = "none";
        elements.description.innerHTML = "";
        return;
    }
    elements.description.style.display = "block";
    elements.description.innerHTML = buildDescriptionHtml(text, "nature");
}

async function loadExamples() {
    try {
        const res = await fetch("mocks/examples.json");
        if (!res.ok) {
            throw new Error("Failed to load examples");
        }
        const payload = await res.json();
        const all = Array.isArray(payload.examples) ? payload.examples : [];
        examples = all.filter(item => item.type === "nature_game");
    } catch (err) {
        console.error("Ошибка загрузки примеров:", err);
        examples = [];
    }
}

function buildDescriptionHtml(text, type) {
    const tasks = type === "nature"
        ? [
            "Рассчитать матрицу рисков.",
            "Дать рекомендации по критериям Вальда, Сэвиджа, Гурвица, Байеса, Лапласа."
        ]
        : [
            "Найти оптимальные чистые или смешанные стратегии.",
            "Определить цену игры и активные стратегии.",
            "Проверить наличие седловой точки."
        ];

    const items = tasks.map(task => (
        `<li><span class="icon">✓</span><span>${task}</span></li>`
    )).join("");

    return `
        <h3>Описание ситуации</h3>
        <p>${escapeHtml(text)}</p>
        <h4>Что решает эта задача?</h4>
        <ul class="task-list">${items}</ul>
    `;
}

async function onSubmit() {
    if (!elements.status) return;

    elements.status.textContent = "Запускаем расчет...";
    try {
        const payload = buildPayload();
        const result = await createRun(payload);
        save("run_id", result.run_id);
        window.location.href = "/report";
    } catch (err) {
        elements.status.textContent = `Ошибка: ${err.message}`;
    }
}

function buildPayload() {
    const matrix = normalizeMatrix(state.matrix, state.rowNames.length, state.colNames.length);
    const probabilities = (state.probabilities || []).filter(value => value !== null && value !== "");

    return {
        algorithm_id: "nature_games",
        input: {
            decision_maker: state.decisionMaker || "ЛПР",
            strategies: state.rowNames,
            states_of_nature: state.colNames,
            payoff_matrix: matrix,
            optimization: "max",
            lambda: Number.isFinite(state.lambda) ? state.lambda : 0.65,
            probabilities: probabilities.length ? state.probabilities : null
        }
    };
}

function persist() {
    save(STORAGE_KEY, state);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
