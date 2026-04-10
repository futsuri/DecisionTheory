// js/pair_game.js

const STORAGE_KEY = "pair_game_state";

const DEFAULT_STATE = {
    player1Name: "Игрок 1",
    player2Name: "Игрок 2",
    rowNames: ["A1", "A2", "A3"],
    colNames: ["B1", "B2", "B3"],
    matrix: [
        [3, 1, -1],
        [0, 2, 4],
        [-2, 1, 3]
    ],
    isZeroSum: true,
    description: ""
};

let examples = [];

const state = load(STORAGE_KEY, DEFAULT_STATE);

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    elements.player1 = document.getElementById("player1-name");
    elements.player2 = document.getElementById("player2-name");
    elements.zeroSum = document.getElementById("zero-sum");
    elements.matrixWrap = document.getElementById("pair-matrix-wrap");
    elements.status = document.getElementById("pair-status");
    elements.exampleSelect = document.getElementById("pair-example-select");
    elements.description = document.getElementById("pair-description");

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

    const btn = document.getElementById("pair-example-btn");
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
    const submitBtn = document.getElementById("pair-submit");
    if (submitBtn) {
        submitBtn.addEventListener("click", onSubmit);
    }

    const resetBtn = document.getElementById("pair-reset");
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

    if (elements.player1) {
        elements.player1.addEventListener("input", (e) => {
            state.player1Name = e.target.value || "Игрок 1";
            persist();
        });
    }
    if (elements.player2) {
        elements.player2.addEventListener("input", (e) => {
            state.player2Name = e.target.value || "Игрок 2";
            persist();
        });
    }
    if (elements.zeroSum) {
        elements.zeroSum.addEventListener("change", (e) => {
            state.isZeroSum = e.target.checked;
            persist();
        });
    }
}

function render() {
    if (elements.player1) elements.player1.value = state.player1Name;
    if (elements.player2) elements.player2.value = state.player2Name;
    if (elements.zeroSum) elements.zeroSum.checked = Boolean(state.isZeroSum);
    renderDescription();

    renderMatrix();
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
            state.rowNames[idx] = e.target.value || `A${idx + 1}`;
            persist();
        });
    });

    elements.matrixWrap.querySelectorAll(".col-name").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.col, 10);
            state.colNames[idx] = e.target.value || `B${idx + 1}`;
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
    const nextCols = Math.max(state.colNames.length + colDelta, 2);

    if (nextRows !== state.rowNames.length) {
        if (nextRows > state.rowNames.length) {
            state.rowNames.push(`A${nextRows}`);
        } else {
            state.rowNames.pop();
        }
    }

    if (nextCols !== state.colNames.length) {
        if (nextCols > state.colNames.length) {
            state.colNames.push(`B${nextCols}`);
        } else {
            state.colNames.pop();
        }
    }

    normalizeMatrix(state.matrix, nextRows, nextCols);
    persist();
    renderMatrix();
}

function applyExample(example) {
    const data = example.data || {};
    state.player1Name = data.player1_name || "Игрок 1";
    state.player2Name = data.player2_name || "Игрок 2";
    state.rowNames = Array.isArray(data.player1_strategies) ? data.player1_strategies.slice() : [];
    state.colNames = Array.isArray(data.player2_strategies) ? data.player2_strategies.slice() : [];
    state.matrix = Array.isArray(data.payoff_matrix) ? data.payoff_matrix.map(row => row.slice()) : [];
    state.isZeroSum = Boolean(data.zero_sum ?? true);
    state.description = example.description || "";
    persist();
    render();
}

function onReset() {
    state.player1Name = "Игрок 1";
    state.player2Name = "Игрок 2";
    state.rowNames = ["A1", "A2"];
    state.colNames = ["B1", "B2"];
    state.matrix = [[0, 0], [0, 0]];
    state.isZeroSum = true;
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
    elements.description.innerHTML = buildDescriptionHtml(text, "pair");
}

async function loadExamples() {
    try {
        const res = await fetch("mocks/examples.json");
        if (!res.ok) {
            throw new Error("Failed to load examples");
        }
        const payload = await res.json();
        const all = Array.isArray(payload.examples) ? payload.examples : [];
        examples = all.filter(item => item.type === "two_player_game");
    } catch (err) {
        console.error("Ошибка загрузки примеров:", err);
        examples = [];
    }
}

function buildDescriptionHtml(text, type) {
    const tasks = type === "pair"
        ? [
            "Найти оптимальные чистые или смешанные стратегии.",
            "Определить цену игры и активные стратегии.",
            "Проверить наличие седловой точки."
        ]
        : [
            "Рассчитать матрицу рисков.",
            "Дать рекомендации по критериям Вальда, Сэвиджа, Гурвица, Байеса, Лапласа."
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
    return {
        algorithm_id: "pair_games",
        input: {
            player1_name: state.player1Name || "Игрок 1",
            player2_name: state.player2Name || "Игрок 2",
            player1_strategies: state.rowNames,
            player2_strategies: state.colNames,
            payoff_matrix: matrix,
            is_zero_sum: Boolean(state.isZeroSum)
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
