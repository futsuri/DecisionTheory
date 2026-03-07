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
                    window.location.href = "report.html";
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
        main_criterion: "Метод главного критерия"
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

            <div class="setup-block">
                <label>Количество критериев (2–9):</label>
                <input type="number" id="crit-count" min="2" max="9" value="4" style="width:80px; margin:0 10px;">

                <label>Количество альтернатив (2–9):</label>
                <input type="number" id="alt-count" min="2" max="9" value="3" style="width:80px; margin:0 10px;">

                <button id="generate-struct" class="primary-btn">Создать структуру и матрицы</button>
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

            if (critCount < 2 || critCount > 9 || altCount < 2 || altCount > 9) {
                alert("Количество критериев и альтернатив должно быть от 2 до 9");
                return;
            }

            generateAHPStructure(critCount, altCount, inner);
            document.getElementById("submit-btn").style.display = "block";
        });

    } else if (algId === "main_criterion") {
    inner.innerHTML = `
        <h3>Метод главного критерия</h3>

        <label for="main-crit">Главный критерий (приоритетный):</label>
        <select id="main-crit">
            <option value="cost">Стоимость (минимизировать)</option>
            <option value="quality" selected>Качество (максимизировать)</option>
            <option value="time">Время выполнения (минимизировать)</option>
        </select>

        <h4 style="margin-top:1.8rem;">Значения альтернатив</h4>
        <table class="data-table" id="alternatives-table">
            <thead>
                <tr>
                    <th>Альтернатива</th>
                    <th>Стоимость</th>
                    <th>Качество</th>
                    <th>Время (дни)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><input type="text" value="Вариант A" class="alt-name" /></td>
                    <td><input type="number" value="150000" step="1000" /></td>
                    <td><input type="number" value="8.5" step="0.1" min="0" max="10" /></td>
                    <td><input type="number" value="45" step="1" min="0" /></td>
                </tr>
                <tr>
                    <td><input type="text" value="Вариант B" class="alt-name" /></td>
                    <td><input type="number" value="120000" step="1000" /></td>
                    <td><input type="number" value="7.2" step="0.1" min="0" max="10" /></td>
                    <td><input type="number" value="30" step="1" min="0" /></td>
                </tr>
                <tr>
                    <td><input type="text" value="Вариант C" class="alt-name" /></td>
                    <td><input type="number" value="180000" step="1000" /></td>
                    <td><input type="number" value="9.0" step="0.1" min="0" max="10" /></td>
                    <td><input type="number" value="60" step="1" min="0" /></td>
                </tr>
            </tbody>
        </table>

        <button type="button" id="add-alternative" style="margin-top:1rem; padding:0.6rem 1.2rem;">
            + Добавить альтернативу
        </button>

        <p style="margin-top:1.5rem; color:#64748b;">
            Пороговые ограничения пока не вводим — используем разумные дефолты.
        </p>

        <button id="submit-btn" class="primary-btn" style="margin-top:1.5rem;">
            Запустить расчёт
        </button>
    `;

    // ─── Добавление новой строки ────────────────────────────────
    document.getElementById("add-alternative")?.addEventListener("click", () => {
        const table = document.getElementById("alternatives-table").querySelector("tbody");
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td><input type="text" value="Новый вариант" class="alt-name" /></td>
            <td><input type="number" value="140000" step="1000" /></td>
            <td><input type="number" value="7.8" step="0.1" min="0" max="10" /></td>
            <td><input type="number" value="40" step="1" min="0" /></td>
        `;
        table.appendChild(newRow);
    });
}
}

// ====================== Генерация всей структуры AHP ======================
function generateAHPStructure(critCount, altCount, inner) {
    let html = '';

    // 1. Названия критериев
    html += `<h4>Названия критериев</h4><div class="names-grid">`;
    for (let i = 1; i <= critCount; i++) {
        html += `
            <div>
                <label>Критерий ${i}:</label>
                <input type="text" class="crit-name" value="Критерий ${i}" style="width:100%; padding:0.5rem;">
            </div>`;
    }
    html += `</div>`;

    // 2. Названия альтернатив
    html += `<h4 style="margin-top:2rem;">Названия альтернатив</h4><div class="names-grid">`;
    for (let i = 1; i <= altCount; i++) {
        html += `
            <div>
                <label>Альтернатива ${i}:</label>
                <input type="text" class="alt-name" value="Альтернатива ${i}" style="width:100%; padding:0.5rem;">
            </div>`;
    }
    html += `</div>`;

    // 3. Матрица сравнения критериев
    html += `<h4 style="margin-top:2.5rem;">1. Матрица сравнения критериев между собой</h4>`;
    html += `<div id="criteria-matrix"></div>`;

    // 4. Матрицы альтернатив по каждому критерию
    html += `<h4 style="margin-top:2.5rem;">2. Матрицы сравнения альтернатив по каждому критерию</h4>`;
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
    if (algId !== "ahp") {
        // для main_criterion можно оставить как было или доработать позже
        return { algorithm_id: algId, type: "main_criterion" };
    }

    const payload = {
        algorithm_id: algId,
        type: "ahp"
    };

    // Названия критериев
    payload.criteria_names = [];
    document.querySelectorAll(".crit-name").forEach(el => {
        payload.criteria_names.push(el.value.trim());
    });

    // Названия альтернатив
    payload.alternatives_names = [];
    document.querySelectorAll(".alt-name").forEach(el => {
        payload.alternatives_names.push(el.value.trim());
    });

    // Матрица критериев
    payload.criteria_matrix = getMatrix("criteria-matrix");

    // Матрицы альтернатив по каждому критерию
    payload.alternative_matrices = [];
    const critCount = payload.criteria_names.length;
    for (let i = 0; i < critCount; i++) {
        const matrix = getMatrix(`alt-matrix-${i}`);
        payload.alternative_matrices.push(matrix);
    }

    console.log("Собранные данные:", payload);
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
function renderPairwiseMatrix(containerId, size, type = "crit") {
    const names = getNames(type);
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<table class="ahp-matrix-table"><thead><tr><th></th>';
    for (let i = 0; i < size; i++) {
        const label = names[i] || (type === "crit" ? `Критерий ${i+1}` : `Альтернатива ${i+1}`);
        html += `<th>${label}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < size; i++) {
        const rowLabel = names[i] || (type === "crit" ? `Критерий ${i+1}` : `Альтернатива ${i+1}`);
        html += `<tr><th>${rowLabel}</th>`;
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
                            type="number"
                            step="0.01"
                            min="0.001"
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
    html += '</tbody></table>';
    container.innerHTML = html;
    container.querySelectorAll(".upper").forEach(input => {

    input.addEventListener("input", () => {

        const val = parseFloat(input.value);

        if (!val || val <= 0) return;

        const mirrorPos = input.dataset.mirror.split("-");
        const r = mirrorPos[0];
        const c = mirrorPos[1];

        const mirrorCell = container.querySelector(
            `.mirror[data-row="${r}"][data-col="${c}"]`
        );

        if (mirrorCell) {
            mirrorCell.value = (1 / val).toFixed(4);
        }

    });

});
}

// ====================== Отрисовка заголовков для матриц альтернатив ======================
// Отрисовка матриц альтернатив по каждому критерию
function renderAlternativeMatrices(containerId, critCount, altCount) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Контейнер для матриц альтернатив не найден");
        return;
    }

    let html = '';

    for (let c = 0; c < critCount; c++) {
        html += `
            <h5 style="margin-top:2rem; color:#1e40af;">
                Матрица сравнения альтернатив по критерию ${c+1}
            </h5>
            <div id="alt-matrix-${c}" class="matrix-wrapper"></div>
        `;
    }

    container.innerHTML = html;

    // Теперь рисуем каждую матрицу альтернатив
    for (let c = 0; c < critCount; c++) {
        renderPairwiseMatrix(`alt-matrix-${c}`, altCount, "alt");
    }
}