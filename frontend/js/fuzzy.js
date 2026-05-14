const state = {
    step: 1,
    taskTitle: "Композиция нечётких отношений",
    characteristics: ["Y1", "Y2", "Y3"],
    candidates: ["X1", "X2", "X3"],
    specialties: ["Z1", "Z2", "Z3"],
    R1: [
        [0.8, 0.4, 0.6],
        [0.5, 0.9, 0.4],
        [0.7, 0.5, 0.8],
    ],
    R2: [
        [0.9, 0.5, 0.6],
        [0.4, 0.8, 0.5],
        [0.6, 0.7, 0.9],
    ],
};

const example = {
    taskTitle: "Профориентационный консалтинг",
    candidates: ["Петров", "Иванов", "Сидоров", "Васильева", "Григорьева"],
    characteristics: [
        "Быстрота и гибкость мышления", "Умение быстро принимать решения",
        "Устойчивость и концентрация внимания", "Зрительная память",
        "Быстрота реакции", "Двигательная память", "Физическая выносливость",
        "Координация движений", "Эмоционально-волевая устойчивость", "Ответственность",
    ],
    specialties: ["Менеджер", "Программист", "Водитель", "Секретарь-референт", "Переводчик"],
    R1: [
        [0.9, 0.8, 0.3, 0.5, 0.7],
        [0.9, 0.5, 0.9, 0.4, 0.8],
        [0.8, 0.9, 0.6, 0.5, 0.8],
        [0.4, 0.3, 0.5, 0.5, 0.2],
        [0.5, 0.1, 0.9, 0.2, 0.6],
        [0.3, 0.2, 0.8, 0.2, 0.2],
        [0.6, 0.2, 0.9, 0.3, 0.2],
        [0.2, 0.2, 0.8, 0.3, 0.3],
        [0.9, 0.5, 0.6, 0.9, 0.3],
        [0.8, 0.5, 0.3, 0.8, 0.2],
    ],
    R2: [
        [0.9, 0.8, 0.7, 0.9, 1.0],
        [0.6, 0.4, 0.8, 0.5, 0.6],
        [0.5, 0.2, 0.3, 0.8, 0.7],
        [0.5, 0.9, 0.5, 0.8, 0.4],
        [1.0, 0.6, 0.5, 0.7, 0.4],
        [0.4, 0.5, 1.0, 0.7, 0.8],
        [0.5, 0.8, 0.9, 0.5, 0.4],
        [0.5, 0.6, 0.7, 0.6, 0.5],
        [0.8, 1.0, 0.2, 0.5, 0.6],
        [0.3, 0.5, 0.9, 0.6, 0.8],
    ],
};

const faqContent = {
    sets: {
        title: "FAQ: операции над нечёткими множествами",
        items: [
            ["Название понятия", "Лингвистическая переменная, для которой строятся термы, например температура, риск или качество."],
            ["Термы A1, A2, A3", "Словесные уровни понятия вводятся свободно. Форма функции определяется позицией: первый терм — Z-образный, второй — трапециевидный, третий — S-образный."],
            ["Диапазон [x_min, x_max]", "Границы универсального множества, на котором вычисляются функции принадлежности."],
            ["Шаг", "Интервал между соседними точками таблицы и графика. Число точек должно быть от 5 до 50."],
            ["Точка x₀", "Отдельное значение аргумента, для которого выводятся μA1(x₀), μA2(x₀), μA3(x₀)."],
            ["A1: параметры a, c", "Z-образная функция: до a принадлежность равна 1, после c равна 0, между ними убывает линейно."],
            ["A2: параметры a, b, c, d", "Трапециевидная функция: рост на (a,b), ядро [b,c], спад на (c,d)."],
            ["A3: параметры a, c", "S-образная функция: до a принадлежность равна 0, после c равна 1, между ними растёт линейно."],
            ["Модификаторы A2", "«Очень» усиливает терм через μ², «довольно» расширяет через √μ."],
        ],
    },
    relations: {
        title: "FAQ: композиция нечётких отношений",
        items: [
            ["Название задачи", "Краткое имя расчёта, например профориентационный консалтинг."],
            ["Характеристики Y", "Критерии или признаки, по которым описываются кандидаты и требования специальностей."],
            ["Кандидаты X", "Объекты, для которых ищется степень соответствия специальностям."],
            ["Специальности Z", "Целевые варианты, с которыми сопоставляются кандидаты."],
            ["Матрица R1 [Y×Z]", "Степень важности каждой характеристики для каждой специальности. Строки — Y, столбцы — Z."],
            ["Матрица R2 [Y×X]", "Степень выраженности каждой характеристики у каждого кандидата. Строки — Y, столбцы — X."],
            ["Значения ячеек", "Все значения вводятся в диапазоне от 0 до 1: 0 — связи нет, 1 — полное соответствие."],
            ["max-min", "Для пары кандидат–специальность берётся максимум из минимумов R2 и R1 по всем характеристикам."],
            ["max-prod", "Для пары кандидат–специальность берётся максимум из произведений R2·R1 по всем характеристикам."],
            ["Лучший кандидат", "Для каждой специальности выбирается кандидат с максимальной степенью соответствия."],
        ],
    },
};

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.getElementById("load-task1-example").addEventListener("click", loadTask1Example);
    document.getElementById("task1-submit").addEventListener("click", calculateTask1);
    document.getElementById("apply-dimensions").addEventListener("click", applyDimensions);
    document.getElementById("load-fuzzy-example").addEventListener("click", loadExample);
    document.getElementById("task2-submit").addEventListener("click", calculateTask2);
    document.getElementById("prev-step").addEventListener("click", () => setStep(state.step - 1));
    document.getElementById("next-step").addEventListener("click", () => setStep(state.step + 1));
    document.querySelectorAll("[data-faq]").forEach(button => {
        button.addEventListener("click", () => openFaq(button.dataset.faq));
    });
    document.querySelectorAll("[data-faq-close]").forEach(element => {
        element.addEventListener("click", closeFaq);
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeFaq();
    });

    renderStepper();
    renderNames();
    renderMatrices();
});

function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tab}`));
}

function openFaq(kind) {
    const faq = faqContent[kind];
    if (!faq) return;
    document.getElementById("fuzzy-faq-title").textContent = faq.title;
    document.getElementById("fuzzy-faq-body").innerHTML = `
        <dl class="fuzzy-faq-list">
          ${faq.items.map(([term, description]) => `
            <div>
              <dt>${escapeHtml(term)}</dt>
              <dd>${escapeHtml(description)}</dd>
            </div>
          `).join("")}
        </dl>
    `;
    document.getElementById("fuzzy-faq-modal").hidden = false;
}

function closeFaq() {
    const modal = document.getElementById("fuzzy-faq-modal");
    if (modal) modal.hidden = true;
}

function loadTask1Example() {
    setValue("concept", "Температура");
    setValue("term-a1", "малый");
    setValue("term-a2", "средний");
    setValue("term-a3", "большой");
    setValue("x-min", 0);
    setValue("x-max", 10);
    setValue("step", 1);
    setValue("x0", 5);
    setValue("a1-a", 2);
    setValue("a1-c", 6);
    setValue("a2-a", 2);
    setValue("a2-b", 4);
    setValue("a2-c", 6);
    setValue("a2-d", 8);
    setValue("a3-a", 4);
    setValue("a3-c", 8);
    document.getElementById("task1-results").hidden = true;
    document.getElementById("task1-status").textContent = "Пример загружен";
}

async function calculateTask1() {
    const status = document.getElementById("task1-status");
    status.textContent = "Расчёт...";
    const payload = {
        concept: value("concept"),
        terms: [value("term-a1"), value("term-a2"), value("term-a3")],
        x_min: num("x-min"),
        x_max: num("x-max"),
        step: num("step"),
        x0: num("x0"),
        params: {
            a1: { a: num("a1-a"), c: num("a1-c") },
            a2: { a: num("a2-a"), b: num("a2-b"), c: num("a2-c"), d: num("a2-d") },
            a3: { a: num("a3-a"), c: num("a3-c") },
        },
    };

    try {
        const result = await postJson("/api/fuzzy/task1", payload);
        document.getElementById("task1-results").hidden = false;
        drawChart(result.values, result.terms);
        renderTask1Summary(result);
        renderTable("values-table", ["x", "A1", "A2", "A3", "A2 очень", "A2 довольно"], result.values.map(row => [
            row.x, row.a1, row.a2, row.a3, row.a2_very, row.a2_fairly,
        ]));
        renderTable("operations-table", ["x", "¬A1", "T-MIN", "T-PROD", "T-гр.", "T-драст.", "S-MAX", "S-SUM", "S-гр.", "S-драст."], result.operations.map(row => [
            row.x, row.not_a1, row.t_min, row.t_prod, row.t_bounded, row.t_drastic,
            row.s_max, row.s_sum, row.s_bounded, row.s_drastic,
        ]));
        status.textContent = `Готово: ${result.points_count} точек`;
    } catch (error) {
        status.textContent = error.message;
    }
}

function renderTask1Summary(result) {
    document.getElementById("x0-values").innerHTML = [
        card(`μA1(${result.x0_values.x})`, result.x0_values.a1),
        card(`μA2(${result.x0_values.x})`, result.x0_values.a2),
        card(`μA3(${result.x0_values.x})`, result.x0_values.a3),
    ].join("");

    const props = result.a2_properties;
    document.getElementById("a2-properties").innerHTML = [
        card("Носитель A2 (μ > 0)", props.support_label || `(${props.support[0]}, ${props.support[1]})`),
        card("Ядро A2 (μ = 1)", `[${props.core[0]}, ${props.core[1]}]`),
        card("Точки перехода A2 (μ = 0.5)", props.transition_points.join("; ")),
    ].join("");
}

function drawChart(values, terms) {
    const canvas = document.getElementById("membership-chart");
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const pad = { left: 54, right: 24, top: 24, bottom: 44 };
    const minX = values[0].x;
    const maxX = values[values.length - 1].x;
    const colors = {
        a1: "#334155",
        a2: "#2563eb",
        a3: "#047857",
        a2_very: "#7c3aed",
        a2_fairly: "#b45309",
    };

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
        const y = yPos(i / 5);
        line(ctx, pad.left, y, width - pad.right, y);
        ctx.fillStyle = "#64748b";
        ctx.fillText((i / 5).toFixed(1), 12, y + 4);
    }
    line(ctx, pad.left, pad.top, pad.left, height - pad.bottom);
    line(ctx, pad.left, height - pad.bottom, width - pad.right, height - pad.bottom);

    [
        ["a1", `A1 ${terms[0]}`],
        ["a2", `A2 ${terms[1]}`],
        ["a3", `A3 ${terms[2]}`],
        ["a2_very", "A2 очень"],
        ["a2_fairly", "A2 довольно"],
    ].forEach(([key, label], index) => {
        ctx.strokeStyle = colors[key];
        ctx.lineWidth = key.startsWith("a2_") ? 2 : 2.5;
        ctx.beginPath();
        values.forEach((point, pointIndex) => {
            const x = xPos(point.x);
            const y = yPos(point[key]);
            if (pointIndex === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.fillStyle = colors[key];
        ctx.fillRect(pad.left + index * 150, 8, 18, 3);
        ctx.fillText(label, pad.left + index * 150 + 24, 12);
    });

    ctx.fillStyle = "#64748b";
    ctx.fillText(String(minX), pad.left - 6, height - 18);
    ctx.fillText(String(maxX), width - pad.right - 24, height - 18);

    function xPos(x) {
        return pad.left + ((x - minX) / (maxX - minX || 1)) * (width - pad.left - pad.right);
    }
    function yPos(mu) {
        return height - pad.bottom - mu * (height - pad.top - pad.bottom);
    }
}

function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function renderStepper() {
    const labels = ["Размерности", "Названия", "Матрицы", "Результаты"];
    document.getElementById("fuzzy-stepper").innerHTML = labels.map((label, index) => (
        `<div class="step-item ${state.step === index + 1 ? "active" : ""}">${index + 1}. ${label}</div>`
    )).join("");
    document.querySelectorAll(".step-panel").forEach(panel => {
        panel.classList.toggle("active", Number(panel.dataset.step) === state.step);
    });
    document.getElementById("prev-step").disabled = state.step === 1;
    document.getElementById("next-step").disabled = state.step === 4;
}

function setStep(step) {
    state.step = Math.min(4, Math.max(1, step));
    readNames();
    readMatrices();
    renderStepper();
    if (state.step === 2) renderNames();
    if (state.step === 3) renderMatrices();
}

function applyDimensions() {
    const yCount = clampInt(num("y-count"), 1, 10);
    const xCount = clampInt(num("x-count"), 1, 10);
    const zCount = clampInt(num("z-count"), 1, 10);
    state.characteristics = resizeNames(state.characteristics, yCount, "Y");
    state.candidates = resizeNames(state.candidates, xCount, "X");
    state.specialties = resizeNames(state.specialties, zCount, "Z");
    state.R1 = resizeMatrix(state.R1, yCount, zCount);
    state.R2 = resizeMatrix(state.R2, yCount, xCount);
    renderNames();
    renderMatrices();
    setStep(2);
}

function loadExample() {
    state.taskTitle = example.taskTitle;
    state.characteristics = [...example.characteristics];
    state.candidates = [...example.candidates];
    state.specialties = [...example.specialties];
    state.R1 = example.R1.map(row => [...row]);
    state.R2 = example.R2.map(row => [...row]);
    document.getElementById("y-count").value = state.characteristics.length;
    document.getElementById("x-count").value = state.candidates.length;
    document.getElementById("z-count").value = state.specialties.length;
    document.getElementById("task-title").value = state.taskTitle;
    renderNames();
    renderMatrices();
    document.getElementById("task2-results").hidden = true;
    document.getElementById("task2-status").textContent = "Пример из методички загружен";
    setStep(4);
}

function renderNames() {
    renderNameGroup("y-names", state.characteristics, "Y");
    renderNameGroup("x-names", state.candidates, "X");
    renderNameGroup("z-names", state.specialties, "Z");
}

function renderNameGroup(id, items, prefix) {
    document.getElementById(id).innerHTML = items.map((name, index) => `
        <div class="name-card compact">
          <label>${prefix}${index + 1}</label>
          <input type="text" data-name-group="${prefix}" data-index="${index}" value="${escapeHtml(name)}">
        </div>
    `).join("");
}

function readNames() {
    document.querySelectorAll("[data-name-group]").forEach(input => {
        const group = input.dataset.nameGroup;
        const index = Number(input.dataset.index);
        if (group === "Y") state.characteristics[index] = input.value.trim() || `Y${index + 1}`;
        if (group === "X") state.candidates[index] = input.value.trim() || `X${index + 1}`;
        if (group === "Z") state.specialties[index] = input.value.trim() || `Z${index + 1}`;
    });
}

function renderMatrices() {
    renderEditableMatrix("r1-grid", state.R1, state.characteristics, state.specialties, "R1");
    renderEditableMatrix("r2-grid", state.R2, state.characteristics, state.candidates, "R2");
}

function renderEditableMatrix(id, matrix, rows, cols, name) {
    const head = `<tr><th></th>${cols.map(col => `<th>${escapeHtml(col)}</th>`).join("")}</tr>`;
    const body = rows.map((rowName, i) => `
        <tr>
          <th>${escapeHtml(rowName)}</th>
          ${cols.map((_, j) => {
              const value = matrix[i]?.[j] ?? 0;
              return `<td style="${heatStyle(value)}"><input data-matrix="${name}" data-row="${i}" data-col="${j}" type="number" min="0" max="1" step="0.1" value="${value}"></td>`;
          }).join("")}
        </tr>
    `).join("");
    document.getElementById(id).innerHTML = `<table class="fuzzy-table">${head}${body}</table>`;
}

function readMatrices() {
    document.querySelectorAll("[data-matrix]").forEach(input => {
        const matrix = input.dataset.matrix === "R1" ? state.R1 : state.R2;
        matrix[Number(input.dataset.row)][Number(input.dataset.col)] = clamp(Number(input.value), 0, 1);
    });
}

async function calculateTask2() {
    state.taskTitle = value("task-title") || state.taskTitle;
    readNames();
    readMatrices();
    const status = document.getElementById("task2-status");
    status.textContent = "Расчёт...";
    try {
        const result = await postJson("/api/fuzzy/task2", {
            task_title: state.taskTitle,
            candidates: state.candidates,
            characteristics: state.characteristics,
            specialties: state.specialties,
            R1: state.R1,
            R2: state.R2,
        });
        document.getElementById("task2-results").hidden = false;
        renderResultMatrix("max-min-table", result.max_min.matrix);
        renderResultMatrix("max-prod-table", result.max_prod.matrix);
        renderBest(result.best_match);
        renderSteps(result.max_min.steps, result.max_prod.steps);
        status.textContent = "Готово";
    } catch (error) {
        status.textContent = error.message;
    }
}

function renderResultMatrix(id, matrix) {
    const head = `<tr><th>Кандидат</th>${state.specialties.map(item => `<th>${escapeHtml(item)}</th>`).join("")}</tr>`;
    const body = matrix.map((row, i) => `
        <tr><th>${escapeHtml(state.candidates[i])}</th>${row.map(value => `<td class="heat-cell" style="${heatStyle(value)}">${fmt(value)}</td>`).join("")}</tr>
    `).join("");
    document.getElementById(id).innerHTML = `<table class="fuzzy-table">${head}${body}</table>`;
}

function renderBest(best) {
    const rows = state.specialties.map((specialty, index) => [
        specialty,
        best.max_min[index].candidate,
        best.max_min[index].value,
        best.max_prod[index].candidate,
        best.max_prod[index].value,
    ]);
    renderTable("best-table", ["Специальность", "max-min: кандидат", "Значение", "max-prod: кандидат", "Значение"], rows);
}

function renderSteps(minSteps, prodSteps) {
    const all = [...minSteps, ...prodSteps];
    document.getElementById("cell-steps").innerHTML = all.map(step => {
        const isMin = step.method === "max-min";
        const formula = step.parts.map(part => {
            const op = isMin
                ? `min(${fmt(part.r2)}, ${fmt(part.r1)})`
                : `${fmt(part.r2)} · ${fmt(part.r1)}`;
            return `<div>${escapeHtml(part.characteristic)}: <code>${op} = ${fmt(part.value)}</code></div>`;
        }).join("");
        return `<div class="step-calc"><strong>${step.method}: ${escapeHtml(step.candidate)} → ${escapeHtml(step.specialty)}</strong><br><code>max = ${fmt(step.result)}</code><div>${formula}</div></div>`;
    }).join("");
}

function renderTable(id, headers, rows) {
    const head = `<tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
    const body = rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(fmt(cell))}</td>`).join("")}</tr>`).join("");
    document.getElementById(id).innerHTML = `<table class="fuzzy-table">${head}${body}</table>`;
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка расчёта");
    return data;
}

function card(title, body) {
    return `<div class="summary-card"><strong>${escapeHtml(title)}</strong>${escapeHtml(fmt(body))}</div>`;
}

function value(id) {
    return document.getElementById(id).value.trim();
}

function setValue(id, newValue) {
    document.getElementById(id).value = newValue;
}

function num(id) {
    return Number(document.getElementById(id).value);
}

function fmt(value) {
    return typeof value === "number" ? Number(value.toFixed(4)).toString() : String(value);
}

function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max) {
    return Math.round(clamp(value, min, max));
}

function resizeNames(items, count, prefix) {
    return Array.from({ length: count }, (_, index) => items[index] || `${prefix}${index + 1}`);
}

function resizeMatrix(matrix, rows, cols) {
    return Array.from({ length: rows }, (_, i) => (
        Array.from({ length: cols }, (_, j) => matrix[i]?.[j] ?? 0)
    ));
}

function heatStyle(value) {
    const v = clamp(Number(value), 0, 1);
    const light = 96 - v * 28;
    return `background:hsl(214, 72%, ${light}%);`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
