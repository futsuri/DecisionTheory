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
    probabilities: [0.4, 0.3, 0.2, 0.1]
};

const EXAMPLES = [
    {
        id: "agro2026",
        title: "Выбор культуры в агробизнесе 2026",
        decisionMaker: "Агрохолдинг",
        rowNames: ["Пшеница", "Кукуруза", "Подсолнечник"],
        colNames: ["Сухой сезон", "Норма", "Влажный", "Пик спроса"],
        matrix: [
            [60, 120, 80, 150],
            [70, 110, 90, 140],
            [50, 130, 100, 160]
        ],
        lambda: 0.65,
        probabilities: [0.4, 0.3, 0.2, 0.1]
    },
    {
        id: "retail",
        title: "Ритейл: запуск новой линейки",
        decisionMaker: "Коммерческий директор",
        rowNames: ["Премиум", "Массовый", "Нишевой"],
        colNames: ["Спад", "Стабильность", "Рост", "Бум"],
        matrix: [
            [-20, 40, 80, 130],
            [-10, 50, 90, 120],
            [10, 30, 60, 110]
        ],
        lambda: 0.6,
        probabilities: [0.35, 0.35, 0.2, 0.1]
    },
    {
        id: "energy",
        title: "Энергорынок: инвестиции в мощность",
        decisionMaker: "Энергокомпания",
        rowNames: ["Солнечные", "Ветровые", "Гибрид"],
        colNames: ["Регуляторные риски", "Стабильность", "Рост спроса", "Экспорт"],
        matrix: [
            [30, 70, 90, 120],
            [40, 60, 100, 110],
            [35, 75, 95, 130]
        ],
        lambda: 0.7,
        probabilities: [0.3, 0.3, 0.25, 0.15]
    },
    {
        id: "healthcare",
        title: "Медицина: распределение бюджета",
        decisionMaker: "Директор клиники",
        rowNames: ["Оборудование", "Персонал", "Телемедицина"],
        colNames: ["Сокращение", "Без изменений", "Умеренный рост", "Быстрый рост"],
        matrix: [
            [20, 50, 70, 90],
            [30, 60, 85, 110],
            [25, 55, 80, 120]
        ],
        lambda: 0.65,
        probabilities: [0.25, 0.35, 0.25, 0.15]
    }
];

const state = load(STORAGE_KEY, DEFAULT_STATE);

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    elements.decisionMaker = document.getElementById("decision-maker");
    elements.lambda = document.getElementById("hurwicz-lambda");
    elements.matrixWrap = document.getElementById("nature-matrix-wrap");
    elements.probWrap = document.getElementById("probabilities-wrap");
    elements.status = document.getElementById("nature-status");
    elements.exampleSelect = document.getElementById("nature-example-select");

    initExamples();
    bindControls();
    render();
});

function initExamples() {
    if (!elements.exampleSelect) return;
    elements.exampleSelect.innerHTML = EXAMPLES.map(example => (
        `<option value="${example.id}">${example.title}</option>`
    )).join("");
    elements.exampleSelect.value = EXAMPLES[0].id;

    const btn = document.getElementById("nature-example-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            const example = EXAMPLES.find(item => item.id === elements.exampleSelect.value);
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
    const nextRows = Math.min(Math.max(state.rowNames.length + rowDelta, 2), 4);
    const nextCols = Math.min(Math.max(state.colNames.length + colDelta, 3), 4);

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
    state.decisionMaker = example.decisionMaker;
    state.lambda = example.lambda;
    state.rowNames = example.rowNames.slice();
    state.colNames = example.colNames.slice();
    state.matrix = example.matrix.map(row => row.slice());
    state.probabilities = example.probabilities.slice();
    persist();
    render();
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
