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
            <h3>Матрица парных сравнений (упрощённый ввод)</h3>
            <p style="color:#64748b; margin-bottom:1.5rem;">
                Пока используем фиксированную матрицу 3×3 для демонстрации.
                В будущем — динамическая таблица с редактированием.
            </p>
            <pre style="background:#f8fafc; padding:1rem; border-radius:8px; font-family:monospace;">
[[1.0, 3.0, 5.0],
 [1/3, 1.0, 2.0],
 [1/5, 1/2, 1.0]]
            </pre>
            <button id="submit-btn" class="primary-btn">Запустить расчёт AHP</button>
        `;
    }
    else if (algId === "main_criterion") {
        inner.innerHTML = `
            <h3>Метод главного критерия</h3>

            <label for="main-crit">Главный критерий (приоритетный):</label>
            <select id="main-crit">
                <option value="cost">Стоимость (минимизировать)</option>
                <option value="quality" selected>Качество (максимизировать)</option>
                <option value="time">Время (минимизировать)</option>
            </select>

            <h4 style="margin-top:1.8rem;">Значения альтернатив</h4>
            <table class="data-table">
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
                        <td><input type="number" value="150000" /></td>
                        <td><input type="number" value="8.5" step="0.1" /></td>
                        <td><input type="number" value="45" /></td>
                    </tr>
                    <tr>
                        <td><input type="text" value="Вариант B" class="alt-name" /></td>
                        <td><input type="number" value="120000" /></td>
                        <td><input type="number" value="7.2" step="0.1" /></td>
                        <td><input type="number" value="30" /></td>
                    </tr>
                    <tr>
                        <td><input type="text" value="Вариант C" class="alt-name" /></td>
                        <td><input type="number" value="180000" /></td>
                        <td><input type="number" value="9.0" step="0.1" /></td>
                        <td><input type="number" value="60" /></td>
                    </tr>
                </tbody>
            </table>

            <p style="margin-top:1.5rem; color:#64748b;">
                Пороговые ограничения пока не вводим — используем разумные дефолты.
            </p>

            <button id="submit-btn" class="primary-btn">Запустить расчёт</button>
        `;
    }
    else {
        inner.innerHTML = '<p style="text-align:center; padding:3rem; color:#64748b;">Форма для этого метода пока не реализована</p>';
    }
}

// ────────────────────────────────────────────────
// Сбор данных с формы (mock-версия — просто заглушка)
function collectFormData(algId) {
    if (algId === "ahp") {
        return {
            algorithm_id: algId,
            type: "ahp",
            // в будущем — реальный парсинг матрицы
            matrix: [[1,3,5],[1/3,1,2],[1/5,0.5,1]]
        };
    }
    else if (algId === "main_criterion") {
        return {
            algorithm_id: algId,
            type: "main_criterion",
            main_criterion: document.getElementById("main-crit")?.value || "quality",
            // в будущем — сбор всех строк таблицы
            comment: "Демо-данные из интерфейса"
        };
    }
    return { algorithm_id: algId };
}