// js/input.js

console.log("input.js — полноценная версия загружена");

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded → начинаем работу input");

    const titleEl = document.getElementById("algorithm-title");
    const formContainer = document.getElementById("form-container");
    const statusEl = document.getElementById("status");

    if (!titleEl || !formContainer) {
        console.error("Критические элементы не найдены");
        return;
    }

    // Читаем выбранный метод из localStorage
    const algorithmId = load("algorithm_id");

    if (!algorithmId) {
        titleEl.innerHTML = "Метод не выбран";
        titleEl.style.color = "#dc2626";
        formContainer.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">' +
                                  'Вернитесь на главную страницу и выберите метод</p>';
        return;
    }

    // Показываем название метода
    const methodName = getMethodNameById(algorithmId) || "Неизвестный метод";
    titleEl.textContent = `Метод: ${methodName}`;
    titleEl.style.color = "#1e40af";
    titleEl.style.fontWeight = "600";

    // Генерируем форму
    renderInputForm(algorithmId, formContainer);

    // Кнопка отправки (если появилась в форме)
    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            showLoading("status", "Формируем задачу и запускаем расчёт...");

            try {
                const payload = collectFormData(algorithmId);
                console.log("Отправляемые данные (mock):", payload);

                const result = await createRun(payload);
                save("run_id", result.run_id);

                statusEl.innerHTML = '<div style="color:#10b981; font-weight:500;">Расчёт запущен! Переходим к отчёту...</div>';
                setTimeout(() => {
                    window.location.href = "/report";
                }, 1200);
            } catch (err) {
                showError("status", "Ошибка: " + err.message);
            }
        });
    }
});

// ────────────────────────────────────────────────
// Названия методов (можно позже вынести в отдельный файл или загрузить из JSON)
function getMethodNameById(id) {
    const map = {
        ahp: "Метод анализа иерархий (AHP)",
        multi_criteria: "Многокритериальная оптимизация"
    };
    return map[id] || `Метод ${id}`;
}

// ────────────────────────────────────────────────
// Отрисовка формы в зависимости от метода
function renderInputForm(algId, container) {
    container.innerHTML = '<div class="form-inner"></div>';
    const inner = container.querySelector(".form-inner");

    if (algId === "ahp") {
       inner.innerHTML = `
            <h3>Метод анализа иерархий (AHP)</h3>

            <div class="setup-block setup-centered">
                <div class="setup-row">
                    <label>Количество критериев (2–20):</label>
                    <input type="number" id="crit-count" min="2" max="20" value="4" style="width:80px; margin:0 10px;">

                    <label>Количество альтернатив (2–20):</label>
                    <input type="number" id="alt-count"  min="2" max="20" value="3" style="width:80px; margin:0 10px;">
                </div>
                <div class="setup-buttons">
                    <button id="generate-struct" class="primary-btn">Создать структуру и матрицы</button>
                    <button id="random-ahp" class="secondary-btn">Случайно заполнить</button>
                </div>
            </div>

            <div id="names-section" style="margin:2rem 0;"></div>
            <div id="criteria-matrix-section" style="margin:2rem 0;"></div>
            <div id="alt-matrices-section" style="margin:3rem 0;"></div>

            <button id="submit-btn" class="primary-btn" style="display:none; margin-top:2rem;">
                Запустить расчёт AHP
            </button>
        `;

        // ==================== Обработчик кнопки "Создать структуру" ====================
        document.getElementById("generate-struct").addEventListener("click", () => {
            const critCount = parseInt(document.getElementById("crit-count").value);
            const altCount  = parseInt(document.getElementById("alt-count").value);

            if (critCount < 2 || critCount > 20 || altCount < 2 || altCount > 20) {
                alert("Количество критериев и альтернатив должно быть от 2 до 9");
                return;
            }

            generateAHPStructure(critCount, altCount, inner);
            document.getElementById("submit-btn").style.display = "block";
        });
        const randomBtn = document.getElementById("random-ahp");
        if (randomBtn) {
            randomBtn.addEventListener("click", () => {

                const critCount = parseInt(document.getElementById("crit-count").value);
                const altCount  = parseInt(document.getElementById("alt-count").value);

                generateAHPStructure(critCount, altCount, document.querySelector(".form-inner"));

                setTimeout(() => {
                    randomizeAHP();
                }, 50);

                document.getElementById("submit-btn").style.display = "block";

            });
        }

       } else if (algId === "multi_criteria") {
        inner.innerHTML = `
            <h3>Метод главного критерия</h3>

            <div class="setup-block setup-centered" style="margin:1.5rem 0;">
                <div class="setup-row">
                    <label>Количество переменных (1–5):</label>
                    <input type="number" id="dim-count" min="1" max="5" value="3">

                    <label style="margin-left:2rem;">Количество критериев (2–3):</label>
                    <input type="number" id="crit-count" min="2" max="3" value="3">
                </div>
                <div class="setup-buttons">
                    <button id="generate-mc-form" class="primary-btn">
                        Создать таблицу
                    </button>
                    <button id="random-mc" class="secondary-btn">
                        Случайно заполнить
                    </button>
                </div>
            </div>

            <div id="mc-form-container" style="margin-top:2rem;"></div>

            <button id="submit-btn" class="primary-btn" style="display:none; margin-top:2rem; width:100%;">
                Запустить оптимизацию
            </button>
        `;

        document.getElementById("generate-mc-form").addEventListener("click", () => {
            const dim = parseInt(document.getElementById("dim-count").value);
            const crit = parseInt(document.getElementById("crit-count").value);

            if (dim < 1 || dim > 10 || crit < 2 || crit > 8) {
                alert("Переменные 1–5, критерии 2–3");
                return;
            }

            renderMultiCriteriaForm(dim, crit);  // ← здесь вызывается функция
            document.getElementById("submit-btn").style.display = "block";
        });

        const randomMC = document.getElementById("random-mc");

        if (randomMC) {

            randomMC.addEventListener("click", () => {

                const dim = parseInt(document.getElementById("dim-count").value);
                const crit = parseInt(document.getElementById("crit-count").value);

                renderMultiCriteriaForm(dim, crit);

                setTimeout(() => {
                    randomizeMC();
                }, 50);

                document.getElementById("submit-btn").style.display = "block";

            });

        }
    }
}

// ====================== Генерация всей структуры AHP ======================
function generateAHPStructure(critCount, altCount, inner) {
    let html = '';

    // 1. Названия критериев
    html += `
        <h4 style="text-align:center; margin: 2.2rem 0 1.2rem; color: var(--color-primary-darker);">
            Названия критериев
        </h4>
        <div class="names-grid crit-grid">
    `;

    for (let i = 1; i <= critCount; i++) {
        html += `
            <div class="name-card">
                <label for="crit-${i-1}">Критерий ${i}</label>
                <input
                    type="text"
                    id="crit-${i-1}"
                    class="crit-name"
                    value="Критерий ${i}"
                    placeholder="Введите название..."
                >
            </div>
        `;
    }
    html += `</div>`;

    // 2. Названия альтернатив
    html += `
        <h4 style="text-align:center; margin: 3rem 0 1.2rem; color: var(--color-primary-darker);">
            Названия альтернатив
        </h4>
        <div class="names-grid alt-grid">
    `;

    for (let i = 1; i <= altCount; i++) {
        html += `
            <div class="name-card">
                <label for="alt-${i-1}">Альтернатива ${i}</label>
                <input
                    type="text"
                    id="alt-${i-1}"
                    class="alt-name"
                    value="Альтернатива ${i}"
                    placeholder="Введите название..."
                >
            </div>
        `;
    }
    html += `</div>`;

    // 3. Матрица сравнения критериев
    html += `<h4 class="section-title">1. Матрица сравнения критериев между собой</h4>`;
    html += `<div id="criteria-matrix"></div>`;

    // 4. Матрицы альтернатив по каждому критерию
    html += `<h4 class="section-title">2. Матрицы сравнения альтернатив по каждому критерию</h4>`;
    html += `<div id="alt-matrices"></div>`;

    document.getElementById("names-section").innerHTML = html;

    // Рисуем матрицу критериев
    renderPairwiseMatrix("criteria-matrix", critCount, "crit");

    // Рисуем матрицы альтернатив по критериям
    renderAlternativeMatrices("alt-matrices", critCount, altCount);

    document.querySelectorAll(".crit-name, .alt-name").forEach(input => {

        input.addEventListener("input", () => {

            const critCount = document.querySelectorAll(".crit-name").length;
            const altCount = document.querySelectorAll(".alt-name").length;

            renderPairwiseMatrix("criteria-matrix", critCount, "crit");
            renderAlternativeMatrices("alt-matrices", critCount, altCount);

        });

    });
}

// Обновлённая функция сбора данных для AHP
function collectFormData(algId) {
    if (algId === "multi_criteria") {
        const dimCount = parseInt(document.getElementById("dim-count").value);
        const critCount = parseInt(document.getElementById("crit-count").value);

        const variable_bounds = [];
        document.querySelectorAll('.var-min').forEach((minInp, i) => {
            const maxInp = document.querySelectorAll('.var-max')[i];
            variable_bounds.push([
                parseFloat(minInp.value) || 0,
                parseFloat(maxInp.value) || 100
            ]);
        });

        const criteria = [];
        const constraints = {};
        let main_criterion = null;

        document.querySelectorAll('.crit-name').forEach((nameInp, idx) => {
            const row = idx + 1;
            const name = nameInp.value.trim() || `f${row}`;
            const func_type = document.querySelectorAll('.crit-func-type')[idx].value;
            const direction = document.querySelectorAll('.crit-direction')[idx].value;

            const coeffs = [];
            for (let col = 1; col <= dimCount; col++) {
                const val = parseFloat(document.querySelector(`.crit-coeff[data-row="${row}"][data-col="${col}"]`).value) || 0;
                coeffs.push(val);
            }

            criteria.push({
                name,
                func_type,
                direction,
                params: { coeffs }
            });

            const isMain = document.querySelector(`.main-crit-check[data-row="${row}"]`).checked;
            if (isMain) {
                main_criterion = name;
            } else {
                const operator = document.querySelectorAll('.crit-operator')[idx].value;
                const limitVal = parseFloat(document.querySelectorAll('.crit-limit')[idx].value);
                if (!isNaN(limitVal)) {
                    if (operator === '>' || operator === '≥') {
                        constraints[name] = { min: limitVal };
                    } else if (operator === '<' || operator === '≤') {
                        constraints[name] = { max: limitVal };
                    }
                }
            }
        });

        const payload = {
            algorithm_id: algId,
            input: {
                criteria,
                constraints,
                main_criterion,
                variable_bounds
            }
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));
        return payload;
    }
    if (algId !== "ahp") {
        return { algorithm_id: algId, input: {} };
    }

    const criteria = [];
    document.querySelectorAll(".crit-name").forEach(el => {
        criteria.push(el.value.trim());
    });

    const alternatives = [];
    document.querySelectorAll(".alt-name").forEach(el => {
        alternatives.push(el.value.trim());
    });

    const matrix = getMatrix("criteria-matrix");

    const altMatrices = {};
    const critCount = criteria.length;
    for (let i = 0; i < critCount; i++) {
        const critName = criteria[i];
        const critMatrix = getMatrix(`alt-matrix-${i}`);
        altMatrices[critName] = critMatrix;
    }

    const payload = {
        algorithm_id: algId,
        input: {
            criteria: criteria,
            alternatives: alternatives,
            matrix: matrix,
            alt_matrices: altMatrices
        }
    };

    console.log("Собранные данные для AHP:", payload);
    return payload;
}

// Вспомогательная функция — вытаскивает матрицу из конкретной таблицы
function getMatrix(tableId) {

    const matrix = [];
    const table = document.getElementById(tableId);

    const rows = table.querySelectorAll("tbody tr");

    rows.forEach((row, i) => {

        matrix[i] = [];

        const inputs = row.querySelectorAll("input");

        inputs.forEach((input, j) => {

            matrix[i][j] = parseFloat(input.value) || 1;

        });

    });

    return matrix;
}

// Вспомогательная функция: парсит значение Саати в число
function parseSaatyValue(str) {
    if (str.includes('/')) {
        const [a, b] = str.split('/').map(Number);
        return a / b;
    }
    return Number(str) || 1;
}

function getNames(type) {

    if (type === "crit") {
        return [...document.querySelectorAll(".crit-name")].map(el => el.value || el.placeholder);
    }

    if (type === "alt") {
        return [...document.querySelectorAll(".alt-name")].map(el => el.value || el.placeholder);
    }

    return [];
}

// ====================== Отрисовка одной матрицы парных сравнений ======================
// ====================== Отрисовка одной матрицы парных сравнений ======================
function renderPairwiseMatrix(containerId, size, type = "crit") {
    const names = getNames(type);
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div class="table-wrapper">';
    html += '<table class="ahp-matrix-table"><thead><tr><th></th>';
    for (let i = 0; i < size; i++) {
        const label = names[i] || (type === "crit" ? `Критерий ${i+1}` : `Альтернатива ${i+1}`);
        html += `<th title="${label}">${label}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < size; i++) {
        const rowLabel = names[i] || (type === "crit" ? `Критерий ${i+1}` : `Альтернатива ${i+1}`);
        html += `<tr><th title="${rowLabel}">${rowLabel}</th>`;
        for (let j = 0; j < size; j++) {
            if (i === j) {
                html += '<td><input type="text" value="1" readonly class="ahp-cell diagonal"></td>';
            } else if (i > j) {
                html += `
                <td>
                    <input
                        type="text"
                        class="ahp-cell mirror"
                        data-row="${i}"
                        data-col="${j}"
                        data-source="${j}-${i}"
                        value="1"
                        readonly
                    >
                </td>
                `;
            } else {
                html += `
                    <td>
                        <input
                            type="text"
                            class="ahp-cell upper"
                            data-row="${i}"
                            data-col="${j}"
                            data-mirror="${j}-${i}"
                            value="1"
                        >
                    </td>
                `;
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';  // закрываем table-wrapper

    container.innerHTML = html;

    // Обработчики для зеркалирования
    container.querySelectorAll(".upper").forEach(input => {
        input.addEventListener("input", () => {
            const val = parseFloat(input.value);
            if (!val || val <= 0) return;
            const mirrorPos = input.dataset.mirror.split("-");
            const r = mirrorPos[0];
            const c = mirrorPos[1];
            const mirrorCell = container.querySelector(`.mirror[data-row="${r}"][data-col="${c}"]`);
            if (mirrorCell) mirrorCell.value = (1 / val).toFixed(4);
        });
    });
}

// ====================== Отрисовка матриц альтернатив ======================
function renderAlternativeMatrices(containerId, critCount, altCount) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Контейнер для матриц альтернатив не найден");
        return;
    }

    let html = '';

    for (let c = 0; c < critCount; c++) {
        html += `
            <h5 class="section-title">Матрица сравнения альтернатив по критерию ${c+1}</h5>
            <div id="alt-matrix-${c}" class="matrix-container"></div>
        `;
    }

    container.innerHTML = html;

    // Рендерим каждую матрицу в свой контейнер
    for (let c = 0; c < critCount; c++) {
        renderPairwiseMatrix(`alt-matrix-${c}`, altCount, "alt");
    }
}

// Новая функция для рендеринга формы с таблицей
function renderMultiCriteriaForm(dimCount, critCount) {
    const container = document.getElementById("mc-form-container");
    let html = '<h4 style="margin:1.5rem 0 1rem; text-align:center;">Критерии и ограничения</h4>';

    html += '<table class="data-table" style="width:100%; font-size:1rem;">';
    html += '<thead><tr>';
    html += '<th>Название критерия</th>';
    html += '<th>Тип функции</th>';
    html += '<th>Направление</th>';
    for (let i = 1; i <= dimCount; i++) {
        html += `<th>a${i}</th>`;
    }
    html += '<th>Ограничение</th>';
    html += '<th>Главный критерий</th>';
    html += '</tr></thead><tbody>';

    for (let j = 1; j <= critCount; j++) {
        html += '<tr>';
        html += `<td><input type="text" class="crit-name" value="f${j}" style="width:100%;"></td>`;
        html += `<td><select class="crit-func-type">
            <option value="linear">Линейная</option>
            <option value="quadratic">Квадратичная</option>
            <option value="exponential">Экспоненциальная</option>
            <option value="logarithmic">Логарифмическая</option>
        </select></td>`;
        html += `<td><select class="crit-direction" data-row="${j}">
            <option value="max">Максимизация</option>
            <option value="min">Минимизация</option>
        </select></td>`;
        for (let col = 1; col <= dimCount; col++) {
            html += `<td><input type="number" class="crit-coeff" data-row="${j}" data-col="${col}" value="0" step="any"></td>`;
        }
        // Ограничение: select оператор + input значение
        html += `<td>
            <select class="crit-operator" data-row="${j}">
                <option value="≥">≥</option>
                <option value=">">></option>
                <option value="≤">≤</option>
                <option value="<"><</option>
            </select>
            <input type="number" class="crit-limit" data-row="${j}" placeholder="значение" style="width:60%;">
        </td>`;
        html += `<td style="text-align:center;">
            <input type="checkbox" class="main-crit-check" data-row="${j}">
        </td>`;
        html += '</tr>';
    }

    html += '</tbody></table>';

    // Границы переменных
    html += '<h4 style="margin:2.5rem 0 1rem; text-align:center;">Границы переменных</h4>';
    html += '<table class="data-table" style="width:auto; margin:0 auto;">';
    html += '<thead><tr><th>Переменная</th><th>Min</th><th>Max</th></tr></thead><tbody>';
    for (let i = 1; i <= dimCount; i++) {
        html += `
            <tr>
                <td>x${i}</td>
                <td><input type="number" class="var-min" value="0"></td>
                <td><input type="number" class="var-max" value="100"></td>
            </tr>`;
    }
    html += '</tbody></table>';

    container.innerHTML = html;

    // Динамика
    const limitInputs = document.querySelectorAll('.crit-limit');
    const operatorSelects = document.querySelectorAll('.crit-operator');
    const directionSelects = document.querySelectorAll('.crit-direction');
    const checkMain = document.querySelectorAll('.main-crit-check');

    function updateLimitsState() {
        limitInputs.forEach((limitInp, idx) => {
            const row = idx + 1;
            const directionSel = document.querySelector(`.crit-direction[data-row="${row}"]`);
            const operatorSel = document.querySelector(`.crit-operator[data-row="${row}"]`);
            const isMain = document.querySelector(`.main-crit-check[data-row="${row}"]`).checked;

            // Если главный — скрываем оператор и input, красим
            if (isMain) {
                operatorSel.disabled = true;
                limitInp.disabled = true;
                operatorSel.style.background = '#ffebee';
                limitInp.style.border = '2px solid red';
                limitInp.style.background = '#ffebee';
                limitInp.value = '';
                limitInp.placeholder = 'не ограничивается';
            } else {
                operatorSel.disabled = false;
                limitInp.disabled = false;
                operatorSel.style.background = 'white';
                limitInp.style.border = '1px solid #cbd5e1';
                limitInp.style.background = 'white';
                limitInp.placeholder = 'значение';
            }

            // Оператор в зависимости от направления
            if (directionSel.value === 'max') {
                operatorSel.innerHTML = '<option value="≥">≥</option><option value=">">></option>';
            } else {
                operatorSel.innerHTML = '<option value="≤">≤</option><option value="<"><</option>';
            }
        });
    }

    directionSelects.forEach(sel => sel.addEventListener('change', updateLimitsState));
    checkMain.forEach(chk => {
        chk.addEventListener('change', () => {
            if (chk.checked) {
                checkMain.forEach(other => { if (other !== chk) other.checked = false; });
            }
            updateLimitsState();
        });
    });

    updateLimitsState();
}

function randomizeAHP() {

    const saaty = [1,2,3,4,5,6,7,8,9];

    document.querySelectorAll(".upper").forEach(input => {

        const val = saaty[Math.floor(Math.random() * saaty.length)];
        input.value = val;

        const mirrorPos = input.dataset.mirror.split("-");
        const r = mirrorPos[0];
        const c = mirrorPos[1];

        const container = input.closest("table");

        const mirrorCell = container.querySelector(
            `.mirror[data-row="${r}"][data-col="${c}"]`
        );

        if (mirrorCell) {
            mirrorCell.value = (1/val).toFixed(4);
        }

    });

}

function randomizeMC() {

    document.querySelectorAll(".crit-coeff").forEach(inp => {
        inp.value = (Math.random()*10 - 5).toFixed(2);
    });

    document.querySelectorAll(".var-min").forEach(inp => {
        inp.value = Math.floor(Math.random()*10);
    });

    document.querySelectorAll(".var-max").forEach(inp => {
        inp.value = Math.floor(Math.random()*100 + 10);
    });

    document.querySelectorAll(".crit-limit").forEach(inp => {
        inp.value = Math.floor(Math.random()*50);
    });

    const checks = document.querySelectorAll(".main-crit-check");

    if (checks.length > 0) {
        const randomIndex = Math.floor(Math.random()*checks.length);
        checks[randomIndex].checked = true;
    }

}