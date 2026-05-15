const defaultCandidates = [
    { name: "Алексей Морозов", x1: 82, x2: 76, x3: 71 },
    { name: "Мария Соколова", x1: 74, x2: 68, x3: 80 },
    { name: "Дмитрий Волков", x1: 58, x2: 82, x3: 77 },
    { name: "Екатерина Орлова", x1: 91, x2: 84, x3: 63 },
    { name: "Илья Кузнецов", x1: 67, x2: 72, x3: 69 },
    { name: "Анна Федорова", x1: 62, x2: 61, x3: 74 },
    { name: "Никита Павлов", x1: 49, x2: 78, x3: 70 },
    { name: "Ольга Новикова", x1: 88, x2: 79, x3: 86 },
    { name: "Сергей Лебедев", x1: 71, x2: 70, x3: 90 },
    { name: "Виктория Егорова", x1: 64, x2: 83, x3: 60 },
    { name: "Кирилл Зайцев", x1: 79, x2: 73, x3: 66 },
    { name: "Полина Белова", x1: 56, x2: 88, x3: 82 },
    { name: "Артем Комаров", x1: 69, x2: 75, x3: 58 },
    { name: "Юлия Макарова", x1: 85, x2: 69, x3: 72 },
    { name: "Роман Захаров", x1: 93, x2: 81, x3: 77 },
];

let candidates = createEmptyCandidates();

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("tree-example").addEventListener("click", loadExample);
    document.getElementById("tree-submit").addEventListener("click", classify);
    document.getElementById("add-tree-row").addEventListener("click", addRow);
    document.getElementById("remove-tree-row").addEventListener("click", removeRow);
    renderInputTable();
    applyReusePayload();
});

function loadExample() {
    candidates = defaultCandidates.map(item => ({ ...item }));
    document.getElementById("t1").value = 60;
    document.getElementById("t2").value = 70;
    document.getElementById("t3").value = 65;
    renderInputTable();
    document.getElementById("tree-results").hidden = true;
    document.getElementById("tree-status").textContent = "Пример на 15 кандидатов загружен";
    document.getElementById("tree-report-actions").innerHTML = "";
}

function applyReusePayload() {
    const reuse = load("reuse_payload");
    if (!reuse || reuse.algorithm_id !== "decision_tree" || !reuse.input) return;
    const thresholds = reuse.input.thresholds || {};
    document.getElementById("t1").value = thresholds.x1 ?? "";
    document.getElementById("t2").value = thresholds.x2 ?? "";
    document.getElementById("t3").value = thresholds.x3 ?? "";
    candidates = Array.isArray(reuse.input.candidates)
        ? reuse.input.candidates.map(item => ({ ...item }))
        : createEmptyCandidates();
    renderInputTable();
    document.getElementById("tree-status").textContent = "Расчёт из истории загружен";
    localStorage.removeItem("reuse_payload");
}

function renderInputTable() {
    const rows = candidates.map((candidate, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><input class="name-input" data-field="name" data-index="${index}" value="${escapeHtml(candidate.name)}"></td>
          <td><input type="number" min="0" max="100" data-field="x1" data-index="${index}" value="${escapeHtml(candidate.x1)}"></td>
          <td><input type="number" min="0" max="100" data-field="x2" data-index="${index}" value="${escapeHtml(candidate.x2)}"></td>
          <td><input type="number" min="0" max="100" data-field="x3" data-index="${index}" value="${escapeHtml(candidate.x3)}"></td>
        </tr>
    `).join("");
    document.getElementById("tree-input-table").innerHTML = `
        <table class="tree-table">
          <tr>
            <th>№</th>
            <th>Кандидат</th>
            <th>X1: техническая база ИБ</th>
            <th>X2: анализ инцидентов</th>
            <th>X3: регламенты и риск</th>
          </tr>
          ${rows}
        </table>
    `;
}

function addRow() {
    readCandidates();
    candidates.push({ name: "", x1: "", x2: "", x3: "" });
    renderInputTable();
    document.getElementById("tree-status").textContent = "Добавлена строка кандидата";
    document.getElementById("tree-report-actions").innerHTML = "";
}

function removeRow() {
    readCandidates();
    if (candidates.length <= 1) {
        document.getElementById("tree-status").textContent = "Должна остаться хотя бы одна строка";
        return;
    }
    candidates.pop();
    renderInputTable();
    document.getElementById("tree-status").textContent = "Последняя строка удалена";
    document.getElementById("tree-report-actions").innerHTML = "";
}

function readCandidates() {
    document.querySelectorAll("[data-field]").forEach(input => {
        const index = Number(input.dataset.index);
        const field = input.dataset.field;
        candidates[index][field] = input.value.trim();
    });
}

async function classify() {
    readCandidates();
    const status = document.getElementById("tree-status");
    status.textContent = "Классификация...";
    const payload = {
        thresholds: {
            x1: document.getElementById("t1").value.trim(),
            x2: document.getElementById("t2").value.trim(),
            x3: document.getElementById("t3").value.trim(),
        },
        candidates,
    };
    try {
        const result = await postJson("/api/decision-tree/classify", payload);
        renderResults(result);
        status.textContent = "Готово";
        createReportRun(payload, status);
    } catch (error) {
        status.textContent = error.message;
    }
}

async function createReportRun(input, statusEl) {
    const actions = document.getElementById("tree-report-actions");
    if (actions) actions.innerHTML = "";
    try {
        const run = await createRun({
            algorithm_id: "decision_tree",
            input,
        });
        renderReportLinks(run.run_id);
    } catch (error) {
        statusEl.textContent = `${statusEl.textContent}. Отчёт не сохранён: ${error.message}`;
    }
}

function renderReportLinks(runId) {
    const container = document.getElementById("tree-report-actions");
    if (!container) return;
    container.innerHTML = `
        <a href="/report" data-report-run="${runId}">Открыть отчёт</a>
        <a href="/api/reports/${runId}/csv" download>Скачать CSV</a>
        <a href="/api/reports/${runId}/pdf" download>Скачать PDF</a>
    `;
    container.querySelector("[data-report-run]").addEventListener("click", () => {
        save("run_id", runId);
    });
}

function createEmptyCandidates() {
    return Array.from({ length: 15 }, () => ({ name: "", x1: "", x2: "", x3: "" }));
}

function renderResults(result) {
    document.getElementById("tree-results").hidden = false;
    document.getElementById("tree-summary").innerHTML = [
        summaryCard("Подходит", result.summary["Подходит"]),
        summaryCard("Подходит условно", result.summary["Подходит условно"]),
        summaryCard("Не подходит", result.summary["Не подходит"]),
    ].join("");

    const rows = result.results.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${fmt(item.x1)}</td>
          <td>${fmt(item.x2)}</td>
          <td>${fmt(item.x3)}</td>
          <td>${verdictBadge(item.verdict)}</td>
        </tr>
    `).join("");
    document.getElementById("tree-result-table").innerHTML = `
        <table class="tree-table">
          <tr><th>№</th><th>Кандидат</th><th>X1</th><th>X2</th><th>X3</th><th>Вердикт</th></tr>
          ${rows}
        </table>
    `;

    document.getElementById("tree-steps").innerHTML = result.results.map(item => `
        <details class="tree-step">
          <summary>${escapeHtml(item.name)} — ${escapeHtml(item.verdict)}</summary>
          <ol>${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </details>
    `).join("");
}

function summaryCard(title, value) {
    return `<div class="summary-card"><strong>${escapeHtml(title)}</strong>${value} кандидатов</div>`;
}

function verdictBadge(verdict) {
    const className = verdict === "Подходит" ? "ok" : verdict === "Подходит условно" ? "conditional" : "no";
    return `<span class="verdict ${className}">${escapeHtml(verdict)}</span>`;
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка классификации");
    return data;
}

function fmt(value) {
    return Number(value).toFixed(0);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
