const examples = {
    weather: {
        taskTitle: "Проверка ID3: игра по погоде",
        features: ["Погода", "Температура", "Влажность", "Ветер"],
        target: "Играть?",
        data: [
            ["Солнечно", "Жарко", "Высокая", "Слабый", "Нет"],
            ["Солнечно", "Жарко", "Высокая", "Сильный", "Нет"],
            ["Облачно", "Жарко", "Высокая", "Слабый", "Да"],
            ["Дождь", "Тепло", "Высокая", "Слабый", "Да"],
            ["Дождь", "Прохладно", "Нормальная", "Слабый", "Да"],
            ["Дождь", "Прохладно", "Нормальная", "Сильный", "Нет"],
            ["Облачно", "Прохладно", "Нормальная", "Сильный", "Да"],
            ["Солнечно", "Тепло", "Высокая", "Слабый", "Нет"],
            ["Солнечно", "Прохладно", "Нормальная", "Слабый", "Да"],
            ["Дождь", "Тепло", "Нормальная", "Слабый", "Да"],
            ["Солнечно", "Тепло", "Нормальная", "Сильный", "Да"],
            ["Облачно", "Тепло", "Высокая", "Сильный", "Да"],
            ["Облачно", "Жарко", "Нормальная", "Слабый", "Да"],
            ["Дождь", "Тепло", "Высокая", "Сильный", "Нет"],
        ],
    },
    security: {
        taskTitle: "ИБ: контроль доступа",
        features: ["Роль", "Тип запроса", "Время", "Источник", "Попытки"],
        target: "Решение",
        data: [
            ["гость", "чтение", "рабочее", "внешний", "норма", "разрешить"],
            ["гость", "запись", "рабочее", "внешний", "норма", "заблокировать"],
            ["гость", "чтение", "нерабочее", "внешний", "норма", "расследовать"],
            ["гость", "чтение", "рабочее", "внешний", "превышение", "заблокировать"],
            ["пользователь", "чтение", "рабочее", "внутренний", "норма", "разрешить"],
            ["пользователь", "запись", "рабочее", "внутренний", "норма", "разрешить"],
            ["пользователь", "удаление", "рабочее", "внутренний", "норма", "расследовать"],
            ["пользователь", "чтение", "нерабочее", "внутренний", "норма", "разрешить"],
            ["пользователь", "запись", "нерабочее", "внешний", "норма", "расследовать"],
            ["пользователь", "чтение", "рабочее", "внешний", "превышение", "заблокировать"],
            ["пользователь", "запись", "рабочее", "внешний", "превышение", "заблокировать"],
            ["пользователь", "удаление", "нерабочее", "внутренний", "превышение", "заблокировать"],
            ["администратор", "чтение", "рабочее", "внутренний", "норма", "разрешить"],
            ["администратор", "запись", "рабочее", "внутренний", "норма", "разрешить"],
            ["администратор", "удаление", "рабочее", "внутренний", "норма", "разрешить"],
            ["администратор", "удаление", "нерабочее", "внутренний", "норма", "расследовать"],
            ["администратор", "чтение", "рабочее", "внешний", "норма", "расследовать"],
            ["администратор", "запись", "нерабочее", "внешний", "превышение", "заблокировать"],
        ],
    },
};

let columns = ["Признак 1", "Признак 2"];
let targetName = "Класс";
let data = createBlankRows(5, 3);
let lastResult = null;
let lastPayload = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("id3-weather").addEventListener("click", () => loadExample("weather"));
    document.getElementById("id3-security").addEventListener("click", () => loadExample("security"));
    document.getElementById("id3-build").addEventListener("click", buildTree);
    document.getElementById("id3-add-row").addEventListener("click", addRow);
    document.getElementById("id3-remove-row").addEventListener("click", removeRow);
    document.getElementById("id3-apply-columns").addEventListener("click", applyColumns);
    document.getElementById("id3-classify").addEventListener("click", classifyObject);
    if (!applyReusePayload()) renderTable();
});

function loadExample(key) {
    const example = examples[key];
    document.getElementById("id3-task-title").value = example.taskTitle;
    document.getElementById("id3-feature-count").value = example.features.length;
    columns = [...example.features];
    targetName = example.target;
    data = example.data.map(row => [...row]);
    clearResult();
    renderTable();
    document.getElementById("id3-status").textContent = key === "weather"
        ? "Пример «Погода» загружен: 14 строк, 4 признака"
        : "Пример «ИБ: контроль доступа» загружен: 18 строк, 5 признаков";
}

function applyReusePayload() {
    const reuse = load("reuse_payload");
    if (!reuse || reuse.algorithm_id !== "id3" || !reuse.input) return false;
    document.getElementById("id3-task-title").value = reuse.input.task_title || "";
    columns = Array.isArray(reuse.input.features) ? [...reuse.input.features] : columns;
    targetName = reuse.input.target || targetName;
    data = Array.isArray(reuse.input.data) ? reuse.input.data.map(row => [...row]) : data;
    document.getElementById("id3-feature-count").value = columns.length;
    renderTable();
    localStorage.removeItem("reuse_payload");
    document.getElementById("id3-status").textContent = "Расчёт из истории загружен";
    return true;
}

function applyColumns() {
    readTable();
    const count = clampInt(Number(document.getElementById("id3-feature-count").value), 2, 7);
    columns = Array.from({ length: count }, (_, index) => columns[index] || `Признак ${index + 1}`);
    data = data.map(row => Array.from({ length: count + 1 }, (_, index) => row[index] || ""));
    renderTable();
    clearResult();
}

function renderTable() {
    const headers = [...columns, targetName];
    const numberHead = "<th>№</th>";
    const head = headers.map((header, index) => `
        <th><input class="id3-header-input" data-header-index="${index}" value="${escapeHtml(header)}"></th>
    `).join("");
    const rows = data.map((row, rowIndex) => `
        <tr>
          <td class="id3-row-number">${rowIndex + 1}</td>
          ${headers.map((_, colIndex) => `
            <td><input type="text" data-row="${rowIndex}" data-col="${colIndex}" value="${escapeHtml(row[colIndex] || "")}"></td>
          `).join("")}
        </tr>
    `).join("");
    document.getElementById("id3-table").innerHTML = `<table class="id3-table"><tr>${numberHead}${head}</tr>${rows}</table>`;
}

function readTable() {
    document.querySelectorAll("[data-header-index]").forEach(input => {
        const index = Number(input.dataset.headerIndex);
        if (index < columns.length) columns[index] = input.value.trim();
        else targetName = input.value.trim();
    });
    document.querySelectorAll("#id3-table [data-row]").forEach(input => {
        data[Number(input.dataset.row)][Number(input.dataset.col)] = input.value.trim();
    });
}

function addRow() {
    readTable();
    if (data.length >= 50) {
        document.getElementById("id3-status").textContent = "Максимум 50 объектов";
        return;
    }
    data.push(Array.from({ length: columns.length + 1 }, () => ""));
    renderTable();
    clearResult();
}

function removeRow() {
    readTable();
    if (data.length <= 5) {
        document.getElementById("id3-status").textContent = "Минимум 5 объектов";
        return;
    }
    data.pop();
    renderTable();
    clearResult();
}

async function buildTree() {
    readTable();
    const status = document.getElementById("id3-status");
    lastPayload = {
        task_title: document.getElementById("id3-task-title").value.trim(),
        features: columns,
        target: targetName,
        data,
    };
    status.textContent = "Построение...";
    try {
        lastResult = await postJson("/api/decision-tree/build", lastPayload);
        renderResult(lastPayload, lastResult);
        await createReportRun(lastPayload, status);
        status.textContent = "Готово";
    } catch (error) {
        status.textContent = error.message;
    }
}

function renderResult(payload, result) {
    document.getElementById("id3-results").hidden = false;
    const distribution = result.stats.class_distribution || {};
    const distributionText = Object.entries(distribution)
        .map(([label, count]) => `${label}: ${count}`)
        .join(", ");
    const rootFeature = result.stats.root_feature || result.tree?.feature || "";
    const rootGain = (result.stats.root_gains || []).find(item => item.feature === rootFeature);
    document.getElementById("id3-summary").innerHTML = [
        card(
            "Начальная энтропия H(S)",
            `${result.stats.root_entropy} бит`,
            `Распределение классов: ${distributionText}. Чем ближе H(S) к 0, тем однороднее выборка.`
        ),
        card(
            "Корневой признак",
            rootFeature || "Дерево состоит из одного листа",
            rootGain ? `Выбран потому, что даёт максимальный IG = ${rootGain.gain}.` : "Все объекты уже относятся к одному классу."
        ),
        card(
            "Обучающая выборка",
            `${result.stats.objects_count} объектов`,
            `${result.stats.features_count} признаков используются для построения дерева.`
        ),
    ].join("");
    const classes = result.stats.classes || [];
    document.getElementById("id3-tree-view").innerHTML = renderTree(result.tree, classes);
    document.getElementById("id3-steps").innerHTML = result.steps.map((step, index) => {
        const path = step.path.length ? step.path.map(item => `${item.feature}=${item.value}`).join(" → ") : "корень";
        return `<div class="tree-step"><strong>${index + 1}. ${escapeHtml(path)}</strong><br>Размер: ${step.samples}; H(S)=${step.entropy}; выбран: ${escapeHtml(step.selected_feature)}${gainTable(step.gains)}</div>`;
    }).join("");
    renderClassifier(payload.features, payload.data);
}

function renderClassifier(features, rows) {
    document.getElementById("id3-classifier").innerHTML = features.map((feature, index) => {
        const values = [...new Set(rows.map(row => row[index]))].filter(Boolean).sort();
        return `
          <div class="field">
            <label>${escapeHtml(feature)}</label>
            <select data-id3-feature="${escapeHtml(feature)}">
              ${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
              <option value="__unknown__">Другое значение...</option>
            </select>
            <input class="id3-custom-value" data-id3-custom="${escapeHtml(feature)}" placeholder="Новое значение">
          </div>
        `;
    }).join("");
}

async function classifyObject() {
    if (!lastResult) return;
    const obj = {};
    document.querySelectorAll("[data-id3-feature]").forEach(select => {
        const custom = document.querySelector(`[data-id3-custom="${cssEscape(select.dataset.id3Feature)}"]`);
        obj[select.dataset.id3Feature] = select.value === "__unknown__" ? (custom.value.trim() || "__unknown__") : select.value;
    });
    const result = await postJson("/api/id3/classify", { tree: lastResult.tree, object: obj });
    const hasWarning = result.path.some(item => item.fallback);
    const path = result.path.map(item => item.class ? `лист: ${item.class}` : `${item.feature}=${item.value}`).join(" → ");
    const box = document.getElementById("id3-classification-result");
    box.hidden = false;
    box.innerHTML = `<h3>Класс: ${escapeHtml(result.class)}</h3><p>${escapeHtml(path)}</p>${hasWarning ? "<p><strong>Предупреждение:</strong> значение не встречалось в обучающей выборке, использован класс-большинство в узле.</p>" : ""}`;
}

async function createReportRun(input, statusEl) {
    try {
        const run = await createRun({ algorithm_id: "id3", input });
        document.getElementById("id3-report-actions").innerHTML = `
          <a href="/report" data-report-run="${run.run_id}">Открыть отчёт</a>
          <a href="/api/reports/${run.run_id}/csv" download>Скачать CSV</a>
          <a href="/api/reports/${run.run_id}/pdf" download>Скачать PDF</a>
        `;
        document.querySelector("[data-report-run]").addEventListener("click", () => save("run_id", run.run_id));
    } catch (error) {
        statusEl.textContent = `${statusEl.textContent}. Отчёт не сохранён: ${error.message}`;
    }
}

function renderTree(node, classes) {
    if (node.type === "leaf") {
        const index = Math.max(0, classes.indexOf(node.class));
        return `<div class="id3-tree-node"><div class="id3-card id3-leaf id3-class-${index % 6}">${escapeHtml(node.class)}<small>${node.samples} объектов</small></div></div>`;
    }
    const children = Object.entries(node.children).map(([value, child]) => `
        <div class="id3-branch">
          <div class="id3-edge-label">${escapeHtml(value)}</div>
          ${renderTree(child, classes)}
        </div>
    `).join("");
    return `
      <div class="id3-tree-node">
        <div class="id3-card id3-split">${escapeHtml(node.feature)}<small>H=${node.entropy}; n=${node.samples}</small></div>
        <div class="id3-branch-row">${children}</div>
      </div>
    `;
}

function gainTable(gains) {
    return `<table class="id3-table id3-step-table"><tr><th>Признак</th><th>IG</th></tr>${gains.map(item => `<tr><td>${escapeHtml(item.feature)}</td><td>${item.gain}</td></tr>`).join("")}</table>`;
}

function clearResult() {
    lastResult = null;
    document.getElementById("id3-results").hidden = true;
    document.getElementById("id3-report-actions").innerHTML = "";
}

function createBlankRows(rowCount, colCount) {
    return Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));
}

function card(title, value, note = "") {
    return `<div class="summary-card"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(value)}</span>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
}

async function postJson(url, payload) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Ошибка ID3");
    return result;
}

function clampInt(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}

function cssEscape(value) {
    return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
