const inferenceState = {
    step: 1,
    inputVars: [],
    rules: [],
    crispValues: {},
    outputVar: defaultOutputVar(),
};

const faqItems = [
    ["Входные ЛП", "Измеряемые характеристики кандидата. Для каждой задаётся диапазон и три терма: Низкий, Средний, Высокий."],
    ["Функции принадлежности", "Треугольная функция задаётся тремя числами a,b,c; трапециевидная — четырьмя a,b,c,d."],
    ["Правило", "Формат IF ... AND ... THEN ...: сила правила равна минимуму степеней принадлежности всех условий."],
    ["Импликация Мамдани", "Выходной терм правила обрезается на уровне силы активации: min(strength, μ consequent)."],
    ["Агрегация", "Все обрезанные выходные функции объединяются максимумом по каждой точке шкалы пригодности."],
    ["Дефаззификация", "Итоговое число считается как центроид: Σxᵢ·μ(xᵢ) / Σμ(xᵢ) по 201 точке от 0 до 100."],
];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("apply-inference-vars").addEventListener("click", applyInferenceVarCount);
    document.getElementById("load-inference-methodical").addEventListener("click", () => loadInferenceExample(buildMethodicalInferenceExample()));
    document.getElementById("load-inference-soc").addEventListener("click", () => loadInferenceExample(buildSocInferenceExample()));
    document.getElementById("add-inference-rule").addEventListener("click", addInferenceRule);
    document.getElementById("inference-submit").addEventListener("click", calculateInference);
    document.getElementById("inference-prev-step").addEventListener("click", () => setInferenceStep(inferenceState.step - 1));
    document.getElementById("inference-next-step").addEventListener("click", () => setInferenceStep(inferenceState.step + 1));
    document.getElementById("inference-faq-open").addEventListener("click", openFaq);
    document.querySelectorAll("[data-faq-close]").forEach(element => element.addEventListener("click", closeFaq));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeFaq();
    });

    const reused = applyReusePayload();
    if (!reused) applyInferenceVarCount(false);
    renderInferenceStepper();
});

function applyReusePayload() {
    const reuse = load("reuse_payload");
    if (!reuse || reuse.algorithm_id !== "fuzzy_inference" || !reuse.input) return false;
    loadInferenceExample({
        candidate_name: reuse.input.candidate_name || "Кандидат",
        input_vars: reuse.input.input_vars || [],
        crisp_values: reuse.input.crisp_values || {},
        rules: reuse.input.rules || [],
    }, false);
    localStorage.removeItem("reuse_payload");
    return true;
}

function applyInferenceVarCount(showMessage = true) {
    const count = clampInt(num("inference-var-count"), 2, 10);
    inferenceState.inputVars = Array.from({ length: count }, (_, index) => inferenceState.inputVars[index] || makeInputVar(`Показатель ${index + 1}`));
    if (!inferenceState.rules.length) {
        inferenceState.rules = [
            { antecedents: inferenceState.inputVars.map(variable => ({ var_name: variable.name, term: "Высокий" })), consequent_term: "Высокий" },
            { antecedents: [{ var_name: inferenceState.inputVars[0].name, term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: inferenceState.inputVars[1].name, term: "Низкий" }], consequent_term: "Низкий" },
        ];
    }
    syncInferenceCrispDefaults();
    renderInferenceAll();
    if (showMessage) document.getElementById("inference-status").textContent = "Переменные применены";
}

function makeInputVar(name) {
    return {
        name,
        min: 0,
        max: 100,
        terms: [
            { name: "Низкий", type: "trap", params: [0, 0, 25, 45] },
            { name: "Средний", type: "tri", params: [35, 55, 75] },
            { name: "Высокий", type: "trap", params: [65, 80, 100, 100] },
        ],
    };
}

function defaultOutputVar() {
    return {
        name: "Пригодность кандидата",
        min: 0,
        max: 100,
        terms: [
            { name: "Низкий", type: "trap", params: [0, 0, 30, 45] },
            { name: "Средний", type: "tri", params: [35, 55, 75] },
            { name: "Высокий", type: "trap", params: [65, 85, 100, 100] },
        ],
    };
}

function renderInferenceAll() {
    renderInferenceVars();
    renderInferenceRules();
    renderInferenceCrispInputs();
    renderInferenceStepper();
}

function renderInferenceVars() {
    const container = document.getElementById("inference-vars");
    container.innerHTML = inferenceState.inputVars.map((variable, varIndex) => `
        <div class="term-box inference-var-card">
          <div class="grid three-cols">
            <div class="field"><label>Название ЛП</label><input data-infer-var="${varIndex}" data-field="name" type="text" value="${escapeHtml(variable.name)}"></div>
            <div class="field"><label>Минимум</label><input data-infer-var="${varIndex}" data-field="min" type="number" value="${variable.min}"></div>
            <div class="field"><label>Максимум</label><input data-infer-var="${varIndex}" data-field="max" type="number" value="${variable.max}"></div>
          </div>
          <div class="grid three-cols">
            ${variable.terms.map((term, termIndex) => `
              <div class="field">
                <label>${escapeHtml(term.name)}: тип и параметры</label>
                <select data-infer-var="${varIndex}" data-term="${termIndex}" data-field="type">
                  <option value="tri" ${term.type === "tri" ? "selected" : ""}>треугольная</option>
                  <option value="trap" ${term.type === "trap" ? "selected" : ""}>трапециевидная</option>
                </select>
                <input data-infer-var="${varIndex}" data-term="${termIndex}" data-field="params" type="text" value="${term.params.join(", ")}">
              </div>
            `).join("")}
          </div>
        </div>
    `).join("");
    container.querySelectorAll("input, select").forEach(input => input.addEventListener("change", readInferenceVars));
}

function readInferenceVars() {
    const previousNames = inferenceState.inputVars.map(item => item.name);
    document.querySelectorAll("[data-infer-var]").forEach(input => {
        const varIndex = Number(input.dataset.inferVar);
        const termIndex = input.dataset.term === undefined ? null : Number(input.dataset.term);
        const field = input.dataset.field;
        const variable = inferenceState.inputVars[varIndex];
        if (!variable) return;
        if (termIndex === null) {
            if (field === "name") variable.name = input.value.trim() || `Показатель ${varIndex + 1}`;
            if (field === "min") variable.min = Number(input.value);
            if (field === "max") variable.max = Number(input.value);
        } else {
            const term = variable.terms[termIndex];
            if (field === "type") term.type = input.value;
            if (field === "params") term.params = input.value.split(",").map(part => Number(part.trim())).filter(part => !Number.isNaN(part));
        }
    });
    inferenceState.inputVars.forEach((variable, index) => {
        const oldName = previousNames[index];
        if (oldName && oldName !== variable.name) {
            inferenceState.rules.forEach(rule => {
                rule.antecedents.forEach(antecedent => {
                    if (antecedent.var_name === oldName) antecedent.var_name = variable.name;
                });
            });
            if (inferenceState.crispValues[oldName] !== undefined) {
                inferenceState.crispValues[variable.name] = inferenceState.crispValues[oldName];
                delete inferenceState.crispValues[oldName];
            }
        }
    });
    syncRuleVariableNames();
    syncInferenceCrispDefaults();
    renderInferenceRules();
    renderInferenceCrispInputs();
}

function syncRuleVariableNames() {
    const names = inferenceState.inputVars.map(item => item.name);
    inferenceState.rules.forEach(rule => {
        rule.antecedents = rule.antecedents.filter(item => names.includes(item.var_name));
        if (!rule.antecedents.length && names[0]) rule.antecedents.push({ var_name: names[0], term: "Средний" });
    });
}

function syncInferenceCrispDefaults() {
    inferenceState.inputVars.forEach(variable => {
        if (inferenceState.crispValues[variable.name] === undefined) {
            inferenceState.crispValues[variable.name] = Math.round((Number(variable.min) + Number(variable.max)) / 2);
        }
    });
}

function renderInferenceRules() {
    const headers = ["#", ...inferenceState.inputVars.map(item => item.name), "THEN", ""];
    const rows = inferenceState.rules.map((rule, ruleIndex) => [
        ruleIndex + 1,
        ...inferenceState.inputVars.map(variable => {
            const antecedent = rule.antecedents.find(item => item.var_name === variable.name);
            return `<select data-rule="${ruleIndex}" data-rule-var="${escapeHtml(variable.name)}">
                <option value="">—</option>
                ${variable.terms.map(term => `<option value="${escapeHtml(term.name)}" ${antecedent?.term === term.name ? "selected" : ""}>${escapeHtml(term.name)}</option>`).join("")}
            </select>`;
        }),
        `<select data-rule="${ruleIndex}" data-rule-output>
            ${inferenceState.outputVar.terms.map(term => `<option value="${escapeHtml(term.name)}" ${rule.consequent_term === term.name ? "selected" : ""}>${escapeHtml(term.name)}</option>`).join("")}
        </select>`,
        `<button class="secondary-btn" type="button" data-delete-rule="${ruleIndex}">Удалить</button>`,
    ]);
    const head = `<tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
    const body = rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("");
    document.getElementById("inference-rules").innerHTML = `<table class="fuzzy-table">${head}${body}</table>`;
    document.querySelectorAll("[data-rule-var], [data-rule-output]").forEach(input => input.addEventListener("change", readInferenceRules));
    document.querySelectorAll("[data-delete-rule]").forEach(button => {
        button.addEventListener("click", () => {
            inferenceState.rules.splice(Number(button.dataset.deleteRule), 1);
            renderInferenceRules();
        });
    });
}

function readInferenceRules() {
    inferenceState.rules = inferenceState.rules.map((rule, ruleIndex) => {
        const antecedents = [];
        document.querySelectorAll(`[data-rule="${ruleIndex}"][data-rule-var]`).forEach(select => {
            if (select.value) antecedents.push({ var_name: select.dataset.ruleVar, term: select.value });
        });
        const output = document.querySelector(`[data-rule="${ruleIndex}"][data-rule-output]`)?.value || rule.consequent_term;
        return { antecedents, consequent_term: output };
    });
}

function addInferenceRule() {
    readInferenceVars();
    readInferenceRules();
    if (inferenceState.rules.length >= 20) {
        document.getElementById("inference-status").textContent = "Максимум 20 правил";
        return;
    }
    inferenceState.rules.push({
        antecedents: inferenceState.inputVars.map(variable => ({ var_name: variable.name, term: "Средний" })),
        consequent_term: "Средний",
    });
    renderInferenceRules();
}

function renderInferenceCrispInputs() {
    const container = document.getElementById("inference-crisp-values");
    container.innerHTML = inferenceState.inputVars.map(variable => {
        const current = inferenceState.crispValues[variable.name] ?? Math.round((variable.min + variable.max) / 2);
        return `<div class="field">
            <label>${escapeHtml(variable.name)}</label>
            <input data-crisp="${escapeHtml(variable.name)}" type="range" min="${variable.min}" max="${variable.max}" step="1" value="${current}">
            <input data-crisp-number="${escapeHtml(variable.name)}" type="number" min="${variable.min}" max="${variable.max}" value="${current}">
        </div>`;
    }).join("");
    container.querySelectorAll("[data-crisp]").forEach(slider => {
        slider.addEventListener("input", () => {
            const number = document.querySelector(`[data-crisp-number="${cssEscape(slider.dataset.crisp)}"]`);
            if (number) number.value = slider.value;
            inferenceState.crispValues[slider.dataset.crisp] = Number(slider.value);
        });
    });
    container.querySelectorAll("[data-crisp-number]").forEach(input => {
        input.addEventListener("input", () => {
            const slider = document.querySelector(`[data-crisp="${cssEscape(input.dataset.crispNumber)}"]`);
            if (slider) slider.value = input.value;
            inferenceState.crispValues[input.dataset.crispNumber] = Number(input.value);
        });
    });
}

async function calculateInference() {
    const status = document.getElementById("inference-status");
    status.textContent = "Расчёт...";
    readInferenceVars();
    readInferenceRules();
    const payload = buildInferencePayload();
    try {
        const result = await postJson("/api/fuzzy/inference/compute", payload);
        renderInferenceResult(result);
        status.textContent = "Готово";
        setInferenceStep(4);
        const run = await createRun({ algorithm_id: "fuzzy_inference", input: payload });
        renderReportLinks("inference-report-actions", run.run_id);
    } catch (error) {
        status.textContent = error.message;
    }
}

function buildInferencePayload() {
    const crispValues = {};
    document.querySelectorAll("[data-crisp-number]").forEach(input => {
        crispValues[input.dataset.crispNumber] = Number(input.value);
    });
    return {
        candidate_name: value("inference-candidate") || "Кандидат",
        input_vars: inferenceState.inputVars,
        output_var: inferenceState.outputVar,
        rules: inferenceState.rules,
        crisp_values: crispValues,
    };
}

function renderInferenceResult(result) {
    document.getElementById("inference-results").hidden = false;
    document.getElementById("inference-summary").innerHTML = [
        card("Кандидат", result.candidate_name),
        card("Итог", `${result.interpretation} (${result.defuzzified})`),
        card("Правил активировано", result.rule_results.filter(rule => rule.strength > 0).length),
    ].join("");
    renderInferenceFuzzification(result);
    renderInferenceRuleResults(result);
    renderInferenceSteps(result);
    renderInputMfCharts(result);
    drawInferenceOutputChart(result);
}

function renderInferenceFuzzification(result) {
    const rows = [];
    Object.entries(result.fuzzification || {}).forEach(([varName, terms]) => {
        Object.entries(terms).forEach(([termName, mu]) => rows.push([varName, termName, mu]));
    });
    renderTable("inference-fuzz-table", ["Переменная", "Терм", "μ"], rows);
}

function renderInferenceRuleResults(result) {
    const rows = (result.rule_results || []).map(rule => [
        rule.index,
        rule.antecedents.map(item => `${item.var_name}=${item.term} (μ=${item.mu})`).join(" AND "),
        rule.consequent_term,
        rule.strength,
    ]);
    renderTable("inference-rules-table", ["#", "IF", "THEN", "Сила"], rows);
}

function renderInferenceSteps(result) {
    const steps = result.steps || {};
    document.getElementById("inference-steps").innerHTML = `
        <div class="step-calc"><strong>Формула дефаззификации</strong><br><code>${escapeHtml(steps.formula || "")}</code></div>
        <div class="step-calc">Числитель: <code>${fmt(steps.numerator)}</code></div>
        <div class="step-calc">Знаменатель: <code>${fmt(steps.denominator)}</code></div>
        <div class="step-calc">Точек сетки: <code>${fmt(steps.points_count)}</code>, правил: <code>${fmt(steps.rules_count)}</code></div>
    `;
}

function drawInferenceOutputChart(result) {
    const canvas = document.getElementById("inference-output-chart");
    const ctx = canvas.getContext("2d");
    const points = result.aggregated.points;
    const mu = result.aggregated.mu;
    const width = canvas.width;
    const height = canvas.height;
    const pad = { left: 54, right: 24, top: 24, bottom: 44 };
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#cbd5e1";
    for (let i = 0; i <= 5; i += 1) {
        const y = height - pad.bottom - (i / 5) * (height - pad.top - pad.bottom);
        line(ctx, pad.left, y, width - pad.right, y);
        ctx.fillStyle = "#64748b";
        ctx.fillText((i / 5).toFixed(1), 12, y + 4);
    }
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((x, index) => {
        const px = pad.left + (x / 100) * (width - pad.left - pad.right);
        const py = height - pad.bottom - mu[index] * (height - pad.top - pad.bottom);
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();
    const centroidX = pad.left + (result.defuzzified / 100) * (width - pad.left - pad.right);
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2;
    line(ctx, centroidX, pad.top, centroidX, height - pad.bottom);
    ctx.fillStyle = "#dc2626";
    ctx.fillText(`x̄=${result.defuzzified}`, centroidX + 6, pad.top + 12);
}

function renderInputMfCharts(result) {
    const container = document.getElementById("inference-input-charts");
    const variables = result.input_vars || [];
    container.innerHTML = variables.map((variable, index) => (
        `<canvas id="input-mf-chart-${index}" width="520" height="260" aria-label="${escapeHtml(variable.name)}"></canvas>`
    )).join("");
    variables.forEach((variable, index) => drawMfChart(document.getElementById(`input-mf-chart-${index}`), variable, result.crisp_values?.[variable.name]));
}

function drawMfChart(canvas, variable, crispValue) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const pad = { left: 42, right: 18, top: 24, bottom: 34 };
    const colors = ["#334155", "#2563eb", "#047857"];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#cbd5e1";
    line(ctx, pad.left, pad.top, pad.left, height - pad.bottom);
    line(ctx, pad.left, height - pad.bottom, width - pad.right, height - pad.bottom);
    ctx.fillStyle = "#0f172a";
    ctx.fillText(variable.name, pad.left, 14);
    variable.terms.forEach((term, termIndex) => {
        ctx.strokeStyle = colors[termIndex % colors.length];
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 100; i += 1) {
            const x = Number(variable.min) + i * (Number(variable.max) - Number(variable.min)) / 100;
            const mu = localMembership(x, term);
            const px = pad.left + ((x - Number(variable.min)) / (Number(variable.max) - Number(variable.min) || 1)) * (width - pad.left - pad.right);
            const py = height - pad.bottom - mu * (height - pad.top - pad.bottom);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = colors[termIndex % colors.length];
        ctx.fillText(term.name, pad.left + termIndex * 110, height - 8);
    });
    if (crispValue !== undefined) {
        const px = pad.left + ((crispValue - Number(variable.min)) / (Number(variable.max) - Number(variable.min) || 1)) * (width - pad.left - pad.right);
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2;
        line(ctx, px, pad.top, px, height - pad.bottom);
        ctx.fillStyle = "#dc2626";
        ctx.fillText(String(crispValue), px + 4, pad.top + 12);
    }
}

function localMembership(x, term) {
    const p = term.params.map(Number);
    if (term.type === "tri") {
        const [a, b, c] = p;
        if (x <= a || x >= c) return ((a === b && x === a) || (b === c && x === c)) ? 1 : 0;
        if (x === b) return 1;
        return x < b ? (x - a) / (b - a || 1) : (c - x) / (c - b || 1);
    }
    const [a, b, c, d] = p;
    if (x < a || x > d) return 0;
    if (b <= x && x <= c) return 1;
    if (a <= x && x < b) return b === a ? 1 : (x - a) / (b - a);
    if (c < x && x <= d) return d === c ? 1 : (d - x) / (d - c);
    return 0;
}

function renderInferenceStepper() {
    const labels = ["Переменные", "Правила", "Кандидат", "Результаты"];
    document.getElementById("inference-stepper").innerHTML = labels.map((label, index) => (
        `<div class="step-item ${inferenceState.step === index + 1 ? "active" : ""}">${index + 1}. ${label}</div>`
    )).join("");
    document.querySelectorAll(".inference-step-panel").forEach(panel => {
        panel.classList.toggle("active", Number(panel.dataset.inferenceStep) === inferenceState.step);
    });
    document.getElementById("inference-prev-step").disabled = inferenceState.step === 1;
    document.getElementById("inference-next-step").disabled = inferenceState.step === 4;
}

function setInferenceStep(step) {
    if (inferenceState.step === 1) readInferenceVars();
    if (inferenceState.step === 2) readInferenceRules();
    inferenceState.step = Math.min(4, Math.max(1, step));
    renderInferenceStepper();
}

function loadInferenceExample(source, showStatus = true) {
    inferenceState.inputVars = source.input_vars.map(variable => ({
        ...variable,
        terms: variable.terms.map(term => ({ ...term, params: [...term.params] })),
    }));
    inferenceState.rules = source.rules.map(rule => ({
        antecedents: rule.antecedents.map(item => ({ ...item })),
        consequent_term: rule.consequent_term,
    }));
    inferenceState.crispValues = { ...source.crisp_values };
    inferenceState.outputVar = defaultOutputVar();
    document.getElementById("inference-var-count").value = inferenceState.inputVars.length;
    document.getElementById("inference-candidate").value = source.candidate_name;
    document.getElementById("inference-results").hidden = true;
    document.getElementById("inference-report-actions").innerHTML = "";
    renderInferenceAll();
    setInferenceStep(3);
    if (showStatus) document.getElementById("inference-status").textContent = "Пример загружен";
}

function buildMethodicalInferenceExample() {
    const inputVars = [
        "Быстрота мышления",
        "Умение принимать решения",
        "Концентрация внимания",
        "Зрительная память",
        "Быстрота реакции",
        "Двигательная память",
        "Физическая выносливость",
        "Координация",
        "Эмоциональная устойчивость",
        "Ответственность",
    ].map(makeInputVar);
    return {
        candidate_name: "Петров",
        input_vars: inputVars,
        crisp_values: {
            "Быстрота мышления": 90,
            "Умение принимать решения": 45,
            "Концентрация внимания": 50,
            "Зрительная память": 50,
            "Быстрота реакции": 100,
            "Двигательная память": 40,
            "Физическая выносливость": 50,
            "Координация": 50,
            "Эмоциональная устойчивость": 80,
            "Ответственность": 30,
        },
        rules: [
            { antecedents: [{ var_name: "Быстрота мышления", term: "Высокий" }, { var_name: "Умение принимать решения", term: "Средний" }, { var_name: "Быстрота реакции", term: "Высокий" }], consequent_term: "Высокий" },
            { antecedents: [{ var_name: "Быстрота мышления", term: "Высокий" }, { var_name: "Эмоциональная устойчивость", term: "Высокий" }, { var_name: "Ответственность", term: "Высокий" }], consequent_term: "Высокий" },
            { antecedents: [{ var_name: "Концентрация внимания", term: "Высокий" }, { var_name: "Умение принимать решения", term: "Высокий" }], consequent_term: "Высокий" },
            { antecedents: [{ var_name: "Зрительная память", term: "Высокий" }, { var_name: "Координация", term: "Высокий" }], consequent_term: "Средний" },
            { antecedents: [{ var_name: "Быстрота реакции", term: "Высокий" }, { var_name: "Эмоциональная устойчивость", term: "Высокий" }, { var_name: "Концентрация внимания", term: "Высокий" }], consequent_term: "Высокий" },
            { antecedents: [{ var_name: "Физическая выносливость", term: "Высокий" }, { var_name: "Координация", term: "Высокий" }], consequent_term: "Средний" },
            { antecedents: [{ var_name: "Ответственность", term: "Низкий" }, { var_name: "Быстрота мышления", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Двигательная память", term: "Низкий" }, { var_name: "Физическая выносливость", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Быстрота мышления", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Концентрация внимания", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Ответственность", term: "Высокий" }, { var_name: "Эмоциональная устойчивость", term: "Высокий" }], consequent_term: "Высокий" },
        ],
    };
}

function buildSocInferenceExample() {
    const inputVars = ["Технические знания ИБ", "Опыт в SOC", "Аналитические способности", "Стрессоустойчивость"].map(makeInputVar);
    return {
        candidate_name: "Сильный кандидат SOC",
        input_vars: inputVars,
        crisp_values: {
            "Технические знания ИБ": 88,
            "Опыт в SOC": 75,
            "Аналитические способности": 92,
            "Стрессоустойчивость": 85,
        },
        rules: [
            { antecedents: inputVars.map(variable => ({ var_name: variable.name, term: "Высокий" })), consequent_term: "Высокий" },
            { antecedents: [{ var_name: "Технические знания ИБ", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Опыт в SOC", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Аналитические способности", term: "Низкий" }, { var_name: "Стрессоустойчивость", term: "Низкий" }], consequent_term: "Низкий" },
            { antecedents: [{ var_name: "Технические знания ИБ", term: "Высокий" }, { var_name: "Опыт в SOC", term: "Высокий" }], consequent_term: "Высокий" },
            { antecedents: [{ var_name: "Аналитические способности", term: "Высокий" }, { var_name: "Стрессоустойчивость", term: "Высокий" }, { var_name: "Технические знания ИБ", term: "Средний" }], consequent_term: "Средний" },
            { antecedents: [{ var_name: "Технические знания ИБ", term: "Средний" }, { var_name: "Опыт в SOC", term: "Средний" }, { var_name: "Аналитические способности", term: "Высокий" }, { var_name: "Стрессоустойчивость", term: "Высокий" }], consequent_term: "Средний" },
        ],
    };
}

function openFaq() {
    document.getElementById("fuzzy-faq-body").innerHTML = `
        <dl class="fuzzy-faq-list">
          ${faqItems.map(([term, description]) => `
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
    document.getElementById("fuzzy-faq-modal").hidden = true;
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

function renderReportLinks(containerId, runId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <a href="/report" data-report-run="${runId}">Открыть отчёт</a>
        <a href="/api/reports/${runId}/csv" download>Скачать CSV</a>
        <a href="/api/reports/${runId}/pdf" download>Скачать PDF</a>
    `;
    container.querySelector("[data-report-run]").addEventListener("click", () => save("run_id", runId));
}

function renderTable(id, headers, rows) {
    const head = `<tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
    const body = rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(fmt(cell))}</td>`).join("")}</tr>`).join("");
    document.getElementById(id).innerHTML = `<table class="fuzzy-table">${head}${body}</table>`;
}

function card(title, body) {
    return `<div class="summary-card"><strong>${escapeHtml(title)}</strong>${escapeHtml(fmt(body))}</div>`;
}

function value(id) {
    return document.getElementById(id).value.trim();
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

function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replaceAll('"', '\\"');
}
