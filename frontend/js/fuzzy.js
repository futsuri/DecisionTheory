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

const inferenceState = {
    step: 1,
    inputVars: [],
    rules: [],
    crispValues: {},
    outputVar: defaultOutputVar(),
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

const ibCompositionExample = {
    taskTitle: "Выбор средств защиты для задач информационной безопасности",
    candidates: ["EDR-платформа", "SIEM-система", "MFA/IdP", "DLP-система", "SOAR-платформа"],
    characteristics: [
        "Обнаружение атак на рабочих станциях",
        "Корреляция событий и журналов",
        "Автоматизация реагирования",
        "Усиление аутентификации",
        "Контроль каналов утечки",
        "Простота внедрения",
    ],
    specialties: ["Защита рабочих станций", "Мониторинг SOC", "Защита доступа", "Защита от утечек"],
    R1: [
        [1.0, 0.7, 0.2, 0.3],
        [0.4, 1.0, 0.3, 0.4],
        [0.7, 0.8, 0.3, 0.3],
        [0.2, 0.4, 1.0, 0.2],
        [0.3, 0.5, 0.2, 1.0],
        [0.6, 0.4, 0.8, 0.5],
    ],
    R2: [
        [0.95, 0.55, 0.2, 0.35, 0.65],
        [0.5, 0.95, 0.35, 0.5, 0.85],
        [0.75, 0.6, 0.25, 0.4, 0.95],
        [0.25, 0.45, 0.95, 0.35, 0.35],
        [0.35, 0.55, 0.25, 0.95, 0.45],
        [0.65, 0.45, 0.85, 0.55, 0.5],
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
            ["Таблица значений", "Это дискретизация графика: для каждой точки x показываются численные μA1, μA2, μA3 и модификаторы A2."],
            ["Операции", "Дополнение, T-нормы и S-нормы считаются по каждой точке таблицы. Они показывают отрицание, пересечение и объединение нечётких множеств."],
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
            ["Пошаговый расчёт", "Для каждой пары X–Z система перебирает все характеристики Y, считает min или произведение, затем берёт максимум."],
        ],
    },
    inference: {
        title: "FAQ: нечёткий логический вывод Мамдани",
        items: [
            ["Входные ЛП", "Это измеряемые характеристики кандидата. Для каждой задаётся диапазон и три терма: Низкий, Средний, Высокий."],
            ["Функции принадлежности", "Треугольная функция задаётся тремя числами a,b,c; трапециевидная — четырьмя a,b,c,d. Они переводят чёткое значение в степень принадлежности."],
            ["Правило", "Формат IF ... AND ... THEN ...: сила правила равна минимуму степеней принадлежности всех условий."],
            ["Импликация Мамдани", "Выходной терм правила обрезается на уровне силы активации: min(strength, μ consequent)."],
            ["Агрегация", "Все обрезанные выходные функции объединяются максимумом по каждой точке шкалы пригодности."],
            ["Дефаззификация", "Итоговое число считается как центроид: Σxᵢ·μ(xᵢ) / Σμ(xᵢ) по 201 точке от 0 до 100."],
        ],
    },
};

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.getElementById("load-task1-example").addEventListener("click", loadTask1Example);
    document.getElementById("load-task1-ib-example").addEventListener("click", loadTask1IbExample);
    document.getElementById("task1-submit").addEventListener("click", calculateTask1);
    document.getElementById("apply-dimensions").addEventListener("click", applyDimensions);
    document.getElementById("load-fuzzy-example").addEventListener("click", loadExample);
    document.getElementById("load-fuzzy-ib-example").addEventListener("click", loadIbCompositionExample);
    document.getElementById("task2-submit").addEventListener("click", calculateTask2);
    document.getElementById("prev-step").addEventListener("click", () => setStep(state.step - 1));
    document.getElementById("next-step").addEventListener("click", () => setStep(state.step + 1));
    document.getElementById("apply-inference-vars").addEventListener("click", applyInferenceVarCount);
    document.getElementById("load-inference-methodical").addEventListener("click", () => loadInferenceExample(buildMethodicalInferenceExample()));
    document.getElementById("load-inference-soc").addEventListener("click", () => loadInferenceExample(buildSocInferenceExample()));
    document.getElementById("add-inference-rule").addEventListener("click", addInferenceRule);
    document.getElementById("inference-submit").addEventListener("click", calculateInference);
    document.getElementById("inference-prev-step").addEventListener("click", () => setInferenceStep(inferenceState.step - 1));
    document.getElementById("inference-next-step").addEventListener("click", () => setInferenceStep(inferenceState.step + 1));
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
    applyInferenceVarCount(false);
    renderInferenceStepper();
    applyReusePayload();
    const startTab = load("fuzzy_start_tab");
    if (startTab) {
        switchTab(startTab);
        localStorage.removeItem("fuzzy_start_tab");
    }
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
    document.getElementById("task1-report-actions").innerHTML = "";
}

function loadTask1IbExample() {
    setValue("concept", "Уровень риска информационной безопасности");
    setValue("term-a1", "низкий");
    setValue("term-a2", "умеренный");
    setValue("term-a3", "критический");
    setValue("x-min", 0);
    setValue("x-max", 100);
    setValue("step", 10);
    setValue("x0", 70);
    setValue("a1-a", 20);
    setValue("a1-c", 50);
    setValue("a2-a", 30);
    setValue("a2-b", 45);
    setValue("a2-c", 65);
    setValue("a2-d", 80);
    setValue("a3-a", 60);
    setValue("a3-c", 90);
    document.getElementById("task1-results").hidden = true;
    document.getElementById("task1-status").textContent = "Пример по ИБ загружен";
    document.getElementById("task1-report-actions").innerHTML = "";
}

function applyReusePayload() {
    const reuse = load("reuse_payload");
    if (!reuse || reuse.algorithm_id !== "fuzzy_sets" || !reuse.input) return;
    const payload = reuse.input.input || {};
    if (reuse.input.task === "task1") {
        switchTab("sets");
        setValue("concept", payload.concept || "");
        const terms = payload.terms || [];
        setValue("term-a1", terms[0] || "");
        setValue("term-a2", terms[1] || "");
        setValue("term-a3", terms[2] || "");
        setValue("x-min", payload.x_min ?? "");
        setValue("x-max", payload.x_max ?? "");
        setValue("step", payload.step ?? "");
        setValue("x0", payload.x0 ?? "");
        const params = payload.params || {};
        setValue("a1-a", params.a1?.a ?? "");
        setValue("a1-c", params.a1?.c ?? "");
        setValue("a2-a", params.a2?.a ?? "");
        setValue("a2-b", params.a2?.b ?? "");
        setValue("a2-c", params.a2?.c ?? "");
        setValue("a2-d", params.a2?.d ?? "");
        setValue("a3-a", params.a3?.a ?? "");
        setValue("a3-c", params.a3?.c ?? "");
    }
    if (reuse.input.task === "task2") {
        switchTab("relations");
        state.taskTitle = payload.task_title || state.taskTitle;
        state.candidates = payload.candidates || state.candidates;
        state.characteristics = payload.characteristics || state.characteristics;
        state.specialties = payload.specialties || state.specialties;
        state.R1 = payload.R1 || state.R1;
        state.R2 = payload.R2 || state.R2;
        document.getElementById("task-title").value = state.taskTitle;
        document.getElementById("y-count").value = state.characteristics.length;
        document.getElementById("x-count").value = state.candidates.length;
        document.getElementById("z-count").value = state.specialties.length;
        renderNames();
        renderMatrices();
        setStep(4);
    }
    if (reuse.input.task === "inference") {
        switchTab("inference");
        loadInferenceExample({
            candidate_name: payload.candidate_name || "Кандидат",
            input_vars: payload.input_vars || [],
            crisp_values: payload.crisp_values || {},
            rules: payload.rules || [],
        }, false);
    }
    localStorage.removeItem("reuse_payload");
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
        createReportRun("task1", payload, "task1-report-actions", status);
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
    loadCompositionExample(example, "Пример из методички загружен");
}

function loadIbCompositionExample() {
    loadCompositionExample(ibCompositionExample, "Пример по ИБ загружен");
}

function loadCompositionExample(source, message) {
    state.taskTitle = source.taskTitle;
    state.characteristics = [...source.characteristics];
    state.candidates = [...source.candidates];
    state.specialties = [...source.specialties];
    state.R1 = source.R1.map(row => [...row]);
    state.R2 = source.R2.map(row => [...row]);
    document.getElementById("y-count").value = state.characteristics.length;
    document.getElementById("x-count").value = state.candidates.length;
    document.getElementById("z-count").value = state.specialties.length;
    document.getElementById("task-title").value = state.taskTitle;
    renderNames();
    renderMatrices();
    document.getElementById("task2-results").hidden = true;
    document.getElementById("task2-status").textContent = message;
    document.getElementById("task2-report-actions").innerHTML = "";
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
        renderRecommendations(result.recommendations || []);
        renderBest(result.best_match);
        renderSteps(result.max_min.steps, result.max_prod.steps);
        status.textContent = "Готово";
        createReportRun("task2", {
            task_title: state.taskTitle,
            candidates: state.candidates,
            characteristics: state.characteristics,
            specialties: state.specialties,
            R1: state.R1,
            R2: state.R2,
        }, "task2-report-actions", status);
    } catch (error) {
        status.textContent = error.message;
    }
}

function applyInferenceVarCount(showMessage = true) {
    const count = clampInt(num("inference-var-count"), 2, 10);
    inferenceState.inputVars = Array.from({ length: count }, (_, index) => inferenceState.inputVars[index] || makeInputVar(`Показатель ${index + 1}`));
    inferenceState.rules = inferenceState.rules.length ? inferenceState.rules : [
        { antecedents: inferenceState.inputVars.map(variable => ({ var_name: variable.name, term: "Высокий" })), consequent_term: "Высокий" },
        { antecedents: [{ var_name: inferenceState.inputVars[0].name, term: "Низкий" }], consequent_term: "Низкий" },
        { antecedents: [{ var_name: inferenceState.inputVars[1].name, term: "Низкий" }], consequent_term: "Низкий" },
    ];
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
        createReportRun("inference", payload, "inference-report-actions", status);
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
    ctx.fillStyle = "#64748b";
    ctx.fillText("0", pad.left - 4, height - 18);
    ctx.fillText("100", width - pad.right - 24, height - 18);
}

function renderInputMfCharts(result) {
    const container = document.getElementById("inference-input-charts");
    const variables = result.input_vars || [];
    container.innerHTML = variables.map((variable, index) => (
        `<canvas id="input-mf-chart-${index}" width="520" height="260" aria-label="${escapeHtml(variable.name)}"></canvas>`
    )).join("");
    variables.forEach((variable, index) => {
        const canvas = document.getElementById(`input-mf-chart-${index}`);
        drawMfChart(canvas, variable, result.crisp_values?.[variable.name]);
    });
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

async function createReportRun(task, input, actionsId, statusEl) {
    const actions = document.getElementById(actionsId);
    if (actions) actions.innerHTML = "";
    try {
        const run = await createRun({
            algorithm_id: "fuzzy_sets",
            input: { task, input },
        });
        renderReportLinks(actionsId, run.run_id);
    } catch (error) {
        statusEl.textContent = `${statusEl.textContent}. Отчёт не сохранён: ${error.message}`;
    }
}

function renderReportLinks(containerId, runId) {
    const container = document.getElementById(containerId);
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

function renderResultMatrix(id, matrix) {
    const head = `<tr><th>Кандидат</th>${state.specialties.map(item => `<th>${escapeHtml(item)}</th>`).join("")}</tr>`;
    const body = matrix.map((row, i) => `
        <tr><th>${escapeHtml(state.candidates[i])}</th>${row.map(value => `<td class="heat-cell" style="${heatStyle(value)}">${fmt(value)}</td>`).join("")}</tr>
    `).join("");
    document.getElementById(id).innerHTML = `<table class="fuzzy-table">${head}${body}</table>`;
}

function renderRecommendations(recommendations) {
    const container = document.getElementById("task2-recommendations");
    if (!container) return;
    if (!recommendations.length) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = recommendations.map(item => card(
        item.specialty,
        `${item.recommended_candidate}: ${item.confidence}. ${item.explanation}`
    )).join("");
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

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
    }
    return String(value).replaceAll('"', '\\"');
}
