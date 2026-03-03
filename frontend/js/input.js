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
        // Количество элементов (критериев/альтернатив) — можно сделать динамическим позже
        const n = 4; // ← здесь можно добавить input для изменения n
        const labels = ["Критерий 1", "Критерий 2", "Критерий 3", "Критерий 4"]; // ← потом заменить на реальные названия

        let tableHTML = `
            <h3>Матрица парных сравнений (AHP)</h3>
            <p>Используйте шкалу Саати (1 = равная важность, 9 = абсолютное превосходство)</p>
            <table class="ahp-matrix-table">
                <thead>
                    <tr>
                        <th></th>
                        ${labels.map(lbl => `<th>${lbl}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (let i = 0; i < n; i++) {
            tableHTML += '<tr>';
            tableHTML += `<th>${labels[i]}</th>`;

            for (let j = 0; j < n; j++) {
                if (i === j) {
                    // Диагональ — всегда 1, readonly
                    tableHTML += `<td><input type="text" value="1" readonly class="ahp-cell diagonal"></td>`;
                } else if (i > j) {
                    // Нижний треугольник — отображаем значение из верхнего (не редактируем)
                    tableHTML += `<td class="ahp-cell mirrored" data-mirror="${j}-${i}"></td>`;
                } else {
                    // Верхний треугольник — редактируемый select
                    tableHTML += `
                        <td>
                            <select class="ahp-cell" data-row="${i}" data-col="${j}">
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="1/2">1/2</option>
                                <option value="1/3">1/3</option>
                                <option value="1/4">1/4</option>
                                <option value="1/5">1/5</option>
                                <option value="1/6">1/6</option>
                                <option value="1/7">1/7</option>
                                <option value="1/8">1/8</option>
                                <option value="1/9">1/9</option>
                            </select>
                        </td>
                    `;
                }
            }
            tableHTML += '</tr>';
        }

        tableHTML += '</tbody></table>';
        tableHTML += '<button id="submit-btn" class="primary-btn">Запустить расчёт AHP</button>';

        inner.innerHTML = tableHTML;

        // ─── Обработчики изменений ────────────────────────────────
        const selects = inner.querySelectorAll('select.ahp-cell');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                const value = e.target.value;

                // Находим зеркальную ячейку (нижний треугольник)
                const mirroredCell = inner.querySelector(`.ahp-cell.mirrored[data-mirror="${row}-${col}"]`);
                if (mirroredCell) {
                    let reciprocal;
                    if (value.includes('/')) {
                        const [num, den] = value.split('/').map(Number);
                        reciprocal = num === 1 ? den : `1/${num}`;
                    } else {
                        const num = Number(value);
                        reciprocal = num === 1 ? 1 : `1/${num}`;
                    }
                    mirroredCell.textContent = reciprocal;
                }

                // Можно здесь же проверять согласованность (CR), но это позже
            });
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

// Обновлённая функция сбора данных для AHP
function collectFormData(algId) {
    if (algId === "ahp") {
        const matrix = [];
        const rows = document.querySelectorAll('.ahp-matrix-table tbody tr');

        rows.forEach((row, i) => {
            matrix[i] = [];
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, j) => {
                if (cell.querySelector('select')) {
                    // верхний треугольник — берём значение select
                    const val = cell.querySelector('select').value;
                    matrix[i][j] = parseSaatyValue(val);
                } else if (cell.classList.contains('diagonal')) {
                    matrix[i][j] = 1;
                } else if (cell.classList.contains('mirrored')) {
                    // нижний треугольник — берём обратное от верхнего
                    const mirrorCoord = cell.dataset.mirror.split('-');
                    const mirrorRow = parseInt(mirrorCoord[0]);
                    const mirrorCol = parseInt(mirrorCoord[1]);
                    // можно взять из select, но для простоты пока 1 / значение
                    const upperVal = parseSaatyValue(
                        document.querySelector(`select[data-row="${mirrorRow}"][data-col="${mirrorCol}"]`).value
                    );
                    matrix[i][j] = 1 / upperVal;
                }
            });
        });

        return {
            algorithm_id: algId,
            type: "ahp",
            matrix: matrix
        };
    }
    // ... остальное как раньше
}

// Вспомогательная функция: парсит значение Саати в число
function parseSaatyValue(str) {
    if (str.includes('/')) {
        const [a, b] = str.split('/').map(Number);
        return a / b;
    }
    return Number(str) || 1;
}