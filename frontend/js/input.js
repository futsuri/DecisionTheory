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
    let algorithmId = load("algorithm_id");
    const reusePayload = load("reuse_payload");

    if (reusePayload && reusePayload.algorithm_id) {
        algorithmId = reusePayload.algorithm_id;
        save("algorithm_id", reusePayload.algorithm_id);
    }

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

    if (reusePayload && reusePayload.input) {
        applyPrefill(algorithmId, reusePayload.input);
        localStorage.removeItem("reuse_payload");
    }

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
        multi_criteria: "Многокритериальная оптимизация",
        pair_games: "Парные игры",
        nature_games: "Игры с природой",
        fuzzy_sets: "Нечеткие множества"
    };
    return map[id] || `Метод ${id}`;
}

// FAQ для методов
function getFaqContent(algId) {
    if (algId === "ahp") {
        return [
            {
                q: "Матрица попарных сравнений",
                a: "Необходимо заполнить поля матрицы над главной диагональю. Ячейка на пересечении двух различных критериев показывает, насколько первый критерий (расположенный в левом столбце матрицы) важнее второго (расположенного в верхней строчке), симметричные значения будут подсчитаны автоматически."
            },
            {
                q: "Матрицы сравнения альтернатив по каждому критерию.",
                a: "Необходимо заполнить поля матриц над главной диагональю для каждого имеющегося критерия. Ячейка на пересечении двух различных альтернатив показывает, насколько первая альтернатива (расположенная в левом столбце матрицы) превосходит вторую (расположенную в верхней строчке) по рассматриваемому критерию, симметричные значения будут подсчитаны автоматически.\n" +
                    "Далее пользователю необходимо нажать на кнопку провести расчеты, чтобы получить результат вычислений.\n" +
                    "После расчёта программа определяет вектор приоритетов критериев и альтернатив, на основе которого выбирается наилучшая альтернатива.\n"
            },
        ];
    }

    if (algId === "multi_criteria") {
        return [
            {
                q: "Критерии и альтернативы",
                a: "При заполнении данных пользователю необходимо располагать критерии в порядке убывания их важности (прибыль в самом вверху, как самое важное, риски в самом низу, как самое маловажное), у пользователя есть возможность выделить самый важный критерий вне зависимости от его расположения, нажав галочку в соответствующей строке."
            },
            {
                q: "Выборы для главного критерия",
                a: "Для главного критерия пользователь может выбрать тип функции, направление для оптимизации (ищем максимум или минимум), а также коэффициенты функции критерия (a1x + a2y + …). Поле ограничение для главного критерия недоступны, так как именно он оптимизируется."
            },
            {
                q: "Выборы для остальных критериев",
                a: "Для остальных критериев пользователь может выбрать тип функции, тип ограничения в поле направление функции (Если критерий предполагает максимизацию, используется ограничение вида ≥. Если минимизацию – ограничение вида ≤), коэффициенты для функции критерия, ограничения для данного критерия (не превосходит/не меньше заданного числа)."
            }
        ];
    }

    if (algId === "fuzzy_sets") {
        return [
            {
                q: "Функции принадлежности",
                a: "Треугольная функция задаётся тремя точками a, b, c. Трапециевидная задаётся четырьмя точками a, b, c, d."
            },
            {
                q: "Вердикт",
                a: "Если принадлежность к терму «Высокий» больше 0.7, возвращается «Рекомендовано». Если «Средний» больше 0.5 — «Требует уточнения». Иначе — «Отказ»."
            }
        ];
    }

    return null;
}

function getFaqPlaceholder(algId) {
    if (algId === "ahp") {
        return "В начале пользователю необходимо ввести варианты, среди которых ему необходимо выбрать наилучший – альтернативы, а также критерии, по которым будет происходить сравнение. После ввода чисел, пользователь должен нажать кнопку создать матрицы, для продолжения заполнения параметров. Пользователь может задать собственные имена для критериев и альтернатив.\n" +
            "Дальнейшие значения для матриц задаются по шкале Саати (1–9), где 1 означает равную важность, а 9 — абсолютное превосходство одного элемента над другим.\n";
    }

    if (algId === "multi_criteria") {
        return "В начале пользователю необходимо задать количество критериев и количество переменных оптимизации.\n" +
            "Критерий – некая функция, значение которой необходимо максимизировать или минимизировать.\n";
    }

    if (algId === "fuzzy_sets") {
        return "Задайте переменную, шкалу, три терма и текущее значение x. Координаты термов должны идти по возрастанию.";
    }

    return "Выберите алгоритм.";
}

function buildMethodHeaderHtml(title) {
    return `
        <div class="method-header">
            <h3>${title}</h3>
            <button type="button" class="faq-toggle" aria-label="FAQ" aria-expanded="false">?</button>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatFaqText(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
}

function renderFaqModal(algId, title, container) {
    const modalId = `faq-modal-${algId}`;
    const existing = container.querySelector(`#${modalId}`);
    if (existing) {
        existing.remove();
    }

    const faqItems = getFaqContent(algId) || [];
    const placeholder = getFaqPlaceholder(algId);

    const listHtml = faqItems.length
        ? `
            <ul class="faq-list">
                ${faqItems.map(item => `
                    <li>
                        <strong>${escapeHtml(item.q)}</strong><br>
                        ${formatFaqText(item.a)}
                    </li>
                `).join("")}
            </ul>
        `
        : "";

    const placeholderHtml = placeholder
        ? `<div class="faq-placeholder">${formatFaqText(placeholder)}</div>`
        : "";

    const modal = document.createElement("div");
    modal.className = "faq-modal";
    modal.id = modalId;
    modal.hidden = true;
    modal.innerHTML = `
        <div class="faq-modal-backdrop" data-faq-close></div>
        <div class="faq-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
            <div class="faq-modal-header">
                <h4 id="${modalId}-title">FAQ — ${escapeHtml(title)}</h4>
                <button type="button" class="faq-modal-close" aria-label="Закрыть">×</button>
            </div>
            ${placeholderHtml}
            ${listHtml}
        </div>
    `;

    container.appendChild(modal);

    const toggle = container.querySelector(".faq-toggle");
    if (!toggle) {
        return;
    }

    const closeBtn = modal.querySelector(".faq-modal-close");
    const backdrop = modal.querySelector(".faq-modal-backdrop");

    const closeModal = () => {
        modal.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        document.removeEventListener("keydown", handleEsc);
    };

    const handleEsc = (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    };

    toggle.setAttribute("aria-controls", modalId);
    toggle.addEventListener("click", () => {
        modal.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        document.addEventListener("keydown", handleEsc);
        closeBtn.focus();
    });

    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);
}


// ────────────────────────────────────────────────
// Отрисовка формы в зависимости от метода
function renderInputForm(algId, container) {
    container.innerHTML = '<div class="form-inner"></div>';
    const inner = container.querySelector(".form-inner");

    if (algId === "ahp") {
       inner.innerHTML = `
            ${buildMethodHeaderHtml("Метод анализа иерархий (AHP)")}

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

        renderFaqModal(algId, "Метод анализа иерархий (AHP)", container);

        // ==================== Обработчик кнопки "Создать структуру" ====================
        document.getElementById("generate-struct").addEventListener("click", () => {
            const critCount = parseInt(document.getElementById("crit-count").value);
            const altCount  = parseInt(document.getElementById("alt-count").value);

            if (critCount < 2 || critCount > 20 || altCount < 2 || altCount > 20) {
                alert("Количество критериев и альтернатив должно быть от 2 до 20");
                return;
            }

            const prevState = getAhpFormState();
            generateAHPStructure(critCount, altCount, inner);
            if (prevState) {
                applyAhpFormState(prevState);
            }
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
            ${buildMethodHeaderHtml("Метод главного критерия")}

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

        renderFaqModal(algId, "Метод главного критерия", container);

        document.getElementById("generate-mc-form").addEventListener("click", () => {
            const dim = parseInt(document.getElementById("dim-count").value);
            const crit = parseInt(document.getElementById("crit-count").value);

            if (dim < 1 || dim > 5 || crit < 2 || crit > 3) {
                alert("Переменные 1–5, критерии 2–3");
                return;
            }

            const prevState = getMcFormState();
            renderMultiCriteriaForm(dim, crit);  // ← здесь вызывается функция
            if (prevState) {
                applyMcFormState(prevState);
            }
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
                } else if (algId === "fuzzy_sets") {
            inner.innerHTML = `
                ${buildMethodHeaderHtml("Нечеткие множества")}

                <div class="fuzzy-form">
                    <div class="fuzzy-grid">
                        <div class="name-card">
                            <label for="fuzzy-variable-name">Название переменной</label>
                            <input type="text" id="fuzzy-variable-name" value="Квалификация">
                        </div>
                        <div class="name-card">
                            <label for="fuzzy-x">Текущее значение x</label>
                            <input type="number" id="fuzzy-x" value="72" step="0.1">
                        </div>
                        <div class="name-card">
                            <label for="fuzzy-scale-min">Минимум шкалы</label>
                            <input type="number" id="fuzzy-scale-min" value="0" step="0.1">
                        </div>
                        <div class="name-card">
                            <label for="fuzzy-scale-max">Максимум шкалы</label>
                            <input type="number" id="fuzzy-scale-max" value="100" step="0.1">
                        </div>
                    </div>

                    <h4 class="section-title">Термы и функции принадлежности</h4>
                    <div id="fuzzy-terms" class="fuzzy-terms"></div>
                </div>

                <button id="submit-btn" class="primary-btn" style="margin-top:2rem; width:100%;">
                    Рассчитать степени принадлежности
                </button>
            `;

            renderFaqModal(algId, "Нечеткие множества", container);
            renderFuzzyTerms();

                } else if (algId === "pair_games") {
            inner.innerHTML = `
                ${buildMethodHeaderHtml("Парные игры")}

                <div class="setup-block setup-centered" style="margin:2rem 0;">
                    <div class="setup-row">
                        <label>Количество стратегий Игрока 1:</label>
                        <input type="number" id="player1-strategies" min="2" value="4" style="width:80px;">

                        <label style="margin-left:2rem;">Количество стратегий Игрока 2:</label>
                        <input type="number" id="player2-strategies" min="2" value="4" style="width:80px;">
                    </div>
                    <div class="setup-buttons">
                        <button id="generate-pair-matrix" class="primary-btn">Создать матрицу</button>
                        <button id="random-pair-game" class="secondary-btn">Случайно заполнить</button>
                        <button id="load-example-pair" class="secondary-btn">Загрузить пример</button>
                    </div>
                </div>

                <div id="players-names-section" style="margin:2.5rem 0;"></div>
                <div id="pair-matrix-section" style="margin:2rem 0;"></div>

                <button id="submit-btn" class="primary-btn" style="display:none; margin-top:2rem; width:100%;">
                    Найти оптимальные стратегии и цену игры
                </button>
            `;

            // Обработчики
            document.getElementById("generate-pair-matrix").addEventListener("click", () => {
                const p1 = parseInt(document.getElementById("player1-strategies").value);
                const p2 = parseInt(document.getElementById("player2-strategies").value);
                if (p1 < 2 || p2 < 2) {
                    alert("Количество стратегий должно быть не меньше 2");
                    return;
                }
                generatePairGameStructure(p1, p2);
                document.getElementById("submit-btn").style.display = "block";
            });

            document.getElementById("random-pair-game").addEventListener("click", () => {
                const p1 = parseInt(document.getElementById("player1-strategies").value);
                const p2 = parseInt(document.getElementById("player2-strategies").value);
                generatePairGameStructure(p1, p2);
                setTimeout(randomizePairGame, 80);
                document.getElementById("submit-btn").style.display = "block";
            });

            document.getElementById("load-example-pair").addEventListener("click", () => {
                loadExample("pair_games");
            });

                } else if (algId === "nature_games") {
            inner.innerHTML = `
                ${buildMethodHeaderHtml("Игры с природой")}

                <div class="setup-block setup-centered" style="margin:2rem 0;">
                    <div class="setup-row">
                        <label>Количество стратегий Игрока:</label>
                        <input type="number" id="nature-strategies" min="2" value="4" style="width:80px;">

                        <label style="margin-left:2rem;">Количество состояний природы:</label>
                        <input type="number" id="nature-states" min="2" value="4" style="width:80px;">
                    </div>
                    <div class="setup-buttons">
                        <button id="generate-nature-matrix" class="primary-btn">Создать матрицу</button>
                        <button id="random-nature-game" class="secondary-btn">Случайно заполнить</button>
                        <button id="load-example-nature" class="secondary-btn">Загрузить пример</button>
                    </div>
                </div>

                <!-- Блок выбора критериев -->
                <div id="criteria-section" style="margin:2rem 0; padding:1.8rem; background:#f8fafc; border-radius:12px; display:none;">
                    <h4 style="margin-bottom:1.5rem; color:var(--color-primary-darker);">Выберите критерии оптимальности</h4>
                    <div class="criteria-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem;">
                        <label class="criterion-item">
                            <input type="checkbox" id="wald" class="nature-criterion" value="wald" checked>
                            <strong>Критерий Вальда</strong> (максимин)
                        </label>
                        <label class="criterion-item">
                            <input type="checkbox" id="laplace" class="nature-criterion" value="laplace" checked>
                            <strong>Критерий Лапласа</strong> (равновероятностный)
                        </label>
                        <label class="criterion-item">
                            <input type="checkbox" id="hurwicz" class="nature-criterion" value="hurwicz" checked>
                            <strong>Критерий Гурвица</strong>
                            <div style="margin-top:8px;">
                                Коэффициент α:
                                <input type="number" id="hurwicz-alpha" value="0.5" min="0" max="1" step="0.1" style="width:65px;">
                            </div>
                        </label>
                        <label class="criterion-item">
                            <input type="checkbox" id="savage" class="nature-criterion" value="savage" checked>
                            <strong>Критерий Сэвиджа</strong> (минимакс сожаления)
                        </label>
                    </div>
                </div>

                <div id="nature-players-section" style="margin:2.5rem 0;"></div>
                <div id="nature-matrix-section" style="margin:2rem 0;"></div>

                <button id="submit-btn" class="primary-btn" style="display:none; margin-top:2rem; width:100%;">
                    Рассчитать по выбранным критериям
                </button>
            `;

            document.getElementById("generate-nature-matrix").addEventListener("click", () => {
                const strategies = parseInt(document.getElementById("nature-strategies").value);
                const states = parseInt(document.getElementById("nature-states").value);
                if (strategies < 2 || states < 2) {
                    alert("Количество должно быть не меньше 2");
                    return;
                }
                generateNatureGameStructure(strategies, states);
                document.getElementById("criteria-section").style.display = "block";
                document.getElementById("submit-btn").style.display = "block";
            });

            document.getElementById("random-nature-game").addEventListener("click", () => {
                const strategies = parseInt(document.getElementById("nature-strategies").value);
                const states = parseInt(document.getElementById("nature-states").value);
                generateNatureGameStructure(strategies, states);
                setTimeout(randomizeNatureGame, 80);
                document.getElementById("criteria-section").style.display = "block";
                document.getElementById("submit-btn").style.display = "block";
            });

            document.getElementById("load-example-nature").addEventListener("click", () => {
                loadExample("nature_games");
            });
        }
}

// ====================== НЕЧЕТКИЕ МНОЖЕСТВА ======================

function renderFuzzyTerms() {
    const container = document.getElementById("fuzzy-terms");
    if (!container) return;

    const defaults = [
        { name: "Низкий", function_type: "trapezoid", points: [0, 0, 25, 45] },
        { name: "Средний", function_type: "triangle", points: [30, 50, 70] },
        { name: "Высокий", function_type: "trapezoid", points: [55, 75, 100, 100] }
    ];

    container.innerHTML = defaults.map((term, index) => buildFuzzyTermHtml(term, index)).join("");

    container.querySelectorAll(".fuzzy-function-type").forEach(select => {
        select.addEventListener("change", () => updateFuzzyPointInputs(select.closest(".fuzzy-term-card")));
    });

    container.querySelectorAll(".fuzzy-term-card").forEach(updateFuzzyPointInputs);
}

function buildFuzzyTermHtml(term, index) {
    return `
        <div class="fuzzy-term-card" data-term-index="${index}">
            <div class="fuzzy-term-head">
                <div class="name-card">
                    <label>Название терма</label>
                    <input type="text" class="fuzzy-term-name" value="${term.name}">
                </div>
                <div class="name-card">
                    <label>Тип функции</label>
                    <select class="fuzzy-function-type">
                        <option value="triangle" ${term.function_type === "triangle" ? "selected" : ""}>Треугольник</option>
                        <option value="trapezoid" ${term.function_type === "trapezoid" ? "selected" : ""}>Трапеция</option>
                    </select>
                </div>
            </div>
            <div class="fuzzy-points" data-default-points="${term.points.join(",")}"></div>
        </div>
    `;
}

function updateFuzzyPointInputs(card) {
    if (!card) return;
    const type = card.querySelector(".fuzzy-function-type").value;
    const pointsContainer = card.querySelector(".fuzzy-points");
    const current = Array.from(pointsContainer.querySelectorAll(".fuzzy-point")).map(input => input.value);
    const fallback = (pointsContainer.dataset.defaultPoints || "").split(",");
    const labels = type === "triangle" ? ["a", "b", "c"] : ["a", "b", "c", "d"];

    pointsContainer.innerHTML = labels.map((label, idx) => `
        <label>
            <span>${label}</span>
            <input type="number" class="fuzzy-point" value="${current[idx] ?? fallback[idx] ?? 0}" step="0.1">
        </label>
    `).join("");
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
                    value="Альтернатиива ${i}"
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
    if (algId === "fuzzy_sets") {
        const scaleMin = parseFloat(document.getElementById("fuzzy-scale-min").value);
        const scaleMax = parseFloat(document.getElementById("fuzzy-scale-max").value);
        const x = parseFloat(document.getElementById("fuzzy-x").value);

        if (!Number.isFinite(scaleMin) || !Number.isFinite(scaleMax) || scaleMin >= scaleMax) {
            throw new Error("Минимум шкалы должен быть меньше максимума");
        }
        if (!Number.isFinite(x)) {
            throw new Error("Введите текущее значение x");
        }

        const terms = Array.from(document.querySelectorAll(".fuzzy-term-card")).map((card, idx) => {
            const name = card.querySelector(".fuzzy-term-name").value.trim() || `Терм ${idx + 1}`;
            const functionType = card.querySelector(".fuzzy-function-type").value;
            const points = Array.from(card.querySelectorAll(".fuzzy-point")).map(input => parseFloat(input.value));

            if (points.some(value => !Number.isFinite(value))) {
                throw new Error(`Заполните все координаты для терма «${name}»`);
            }
            if (points.some((value, pointIdx) => pointIdx > 0 && points[pointIdx - 1] > value)) {
                throw new Error(`Координаты терма «${name}» должны идти по возрастанию`);
            }

            return {
                name,
                function_type: functionType,
                points
            };
        });

        if (terms.length !== 3) {
            throw new Error("Нужно задать ровно 3 терма");
        }

        return {
            algorithm_id: algId,
            input: {
                variable_name: document.getElementById("fuzzy-variable-name").value.trim() || "Переменная",
                scale: {
                    min: scaleMin,
                    max: scaleMax
                },
                terms,
                x
            }
        };
    }

    if (algId === "pair_games") {
        const matrix = [];
        const rows = document.querySelectorAll("#pair-game-matrix tbody tr");

        rows.forEach(row => {
            const rowData = [];
            row.querySelectorAll(".pair-cell").forEach(cell => {
                rowData.push(parseFloat(cell.value) || 0);
            });
            matrix.push(rowData);
        });

        if (!matrix.length || !matrix[0] || matrix[0].length === 0) {
            throw new Error("Заполните матрицу выигрышей (минимум 2x2)");
        }
        const rowCount = matrix.length;
        const colCount = matrix[0].length;
        if (rowCount < 2 || colCount < 2) {
            throw new Error("Матрица должна быть минимум 2x2");
        }
        if (rowCount > 12 || colCount > 12) {
            throw new Error("Матрица не должна превышать 12x12");
        }
        if (matrix.some(row => row.length !== colCount)) {
            throw new Error("Матрица должна быть прямоугольной");
        }

        const player1Name = document.getElementById("player1-name")?.value?.trim() || "Игрок 1";
        const player2Name = document.getElementById("player2-name")?.value?.trim() || "Игрок 2";
        const player1Strategies = Array.from({ length: rowCount }, (_, i) => `A${i + 1}`);
        const player2Strategies = Array.from({ length: colCount }, (_, i) => `B${i + 1}`);

        return {
            algorithm_id: algId,
            input: {
                payoff_matrix: matrix,
                player1_name: player1Name,
                player2_name: player2Name,
                player1_strategies: player1Strategies,
                player2_strategies: player2Strategies,
                is_zero_sum: true,
                description: "Матричная игра двух лиц с нулевой суммой"
            }
        };
    }
    if (algId === "nature_games") {
        const matrix = [];
        const rows = document.querySelectorAll("#nature-game-matrix tbody tr");

        rows.forEach(row => {
            const rowData = [];
            row.querySelectorAll(".pair-cell").forEach(cell => {
                rowData.push(parseFloat(cell.value) || 0);
            });
            matrix.push(rowData);
        });

        if (!matrix.length || !matrix[0] || matrix[0].length === 0) {
            throw new Error("Заполните матрицу выигрышей (минимум 2x2)");
        }
        const rowCount = matrix.length;
        const colCount = matrix[0].length;
        if (rowCount < 2 || colCount < 2) {
            throw new Error("Матрица должна быть минимум 2x2");
        }
        if (rowCount > 12 || colCount > 12) {
            throw new Error("Матрица не должна превышать 12x12");
        }
        if (matrix.some(row => row.length !== colCount)) {
            throw new Error("Матрица должна быть прямоугольной");
        }

        const selectedCriteria = [];
        document.querySelectorAll('.nature-criterion:checked').forEach(chk => {
            selectedCriteria.push(chk.value);
        });

        if (selectedCriteria.length === 0) {
            throw new Error("Выберите хотя бы один критерий оптимальности");
        }

        const hurwiczAlpha = parseFloat(document.getElementById("hurwicz-alpha")?.value) || 0.5;
        if (hurwiczAlpha < 0 || hurwiczAlpha > 1) {
            throw new Error("Коэффициент Гурвица должен быть от 0 до 1");
        }

        const strategies = Array.from({ length: rowCount }, (_, i) => `X${i + 1}`);
        const states = Array.from({ length: colCount }, (_, i) => `S${i + 1}`);

        return {
            algorithm_id: algId,
            input: {
                payoff_matrix: matrix,
                decision_maker: document.getElementById("decision-maker")?.value || "ЛПР",
                strategies,
                states_of_nature: states,
                selected_criteria: selectedCriteria,
                hurwicz_alpha: hurwiczAlpha,
                optimization: "max"
            }
        };
    }
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
            for (let col = 0; col <= dimCount; col++) {
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

        variable_bounds.forEach((bounds, idx) => {
            if (bounds[0] >= bounds[1]) {
                throw new Error(`Границы переменной x${idx + 1}: min должен быть меньше max`);
            }
        });

        criteria.forEach((crit) => {
            if (crit.func_type === "logarithmic") {
                variable_bounds.forEach((bounds, idx) => {
                    if (bounds[0] <= 0) {
                        throw new Error(`Для логарифмической функции x${idx + 1} должен быть > 0`);
                    }
                });
            }
        });

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

// Вспомогательная функция — вытаскиет матрицу из конкретной таблицы
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
        const rowLabel = names[i] || (type === "crit" ? `Критерий ${i+1}` : `Альтернатиива ${i+1}`);
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
    html += '<th>a0</th>';
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
        for (let col = 0; col <= dimCount; col++) {
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

function applyPrefill(algId, inputData) {
    if (!inputData) {
        return;
    }
    if (algId === "ahp") {
        applyAhpPrefill(inputData);
    } else if (algId === "multi_criteria") {
        applyMultiCriteriaPrefill(inputData);
    }
}

function fillMatrix(tableId, matrix) {
    const table = document.getElementById(tableId);
    if (!table || !Array.isArray(matrix)) {
        return;
    }
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row, i) => {
        const inputs = row.querySelectorAll("input");
        inputs.forEach((input, j) => {
            if (matrix[i] && matrix[i][j] !== undefined) {
                input.value = matrix[i][j];
            }
        });
    });
}

function applyAhpPrefill(inputData) {
    const criteria = Array.isArray(inputData.criteria) ? inputData.criteria : [];
    const alternatives = Array.isArray(inputData.alternatives) ? inputData.alternatives : [];
    const matrix = Array.isArray(inputData.matrix) ? inputData.matrix : [];
    const altMatrices = inputData.alt_matrices || {};

    const critCount = Math.max(criteria.length, 2);
    const altCount = Math.max(alternatives.length, 2);

    const critCountInput = document.getElementById("crit-count");
    const altCountInput = document.getElementById("alt-count");
    if (critCountInput) critCountInput.value = critCount;
    if (altCountInput) altCountInput.value = altCount;

    const inner = document.querySelector(".form-inner");
    if (!inner) {
        return;
    }

    generateAHPStructure(critCount, altCount, inner);

    document.querySelectorAll(".crit-name").forEach((input, idx) => {
        if (criteria[idx]) {
            input.value = criteria[idx];
        }
    });
    document.querySelectorAll(".alt-name").forEach((input, idx) => {
        if (alternatives[idx]) {
            input.value = alternatives[idx];
        }
    });

    renderPairwiseMatrix("criteria-matrix", critCount, "crit");
    renderAlternativeMatrices("alt-matrices", critCount, altCount);

    fillMatrix("criteria-matrix", matrix);

    criteria.forEach((name, idx) => {
        const altMatrix = altMatrices[name];
        if (altMatrix) {
            fillMatrix(`alt-matrix-${idx}`, altMatrix);
        }
    });

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
        submitBtn.style.display = "block";
    }
}

function applyMultiCriteriaPrefill(inputData) {
    const criteria = Array.isArray(inputData.criteria) ? inputData.criteria : [];
    const constraints = inputData.constraints || {};
    const mainCriterion = inputData.main_criterion || null;
    const variableBounds = Array.isArray(inputData.variable_bounds) ? inputData.variable_bounds : [];

    const coeffLengths = criteria.map(item => (item.params && item.params.coeffs ? item.params.coeffs.length : 0));
    const coeffDims = coeffLengths.map(len => Math.max(len - 1, 0));
    const dimCount = Math.max(variableBounds.length || 0, ...coeffDims, 1);
    const critCount = Math.max(criteria.length, 1);

    const dimInput = document.getElementById("dim-count");
    const critInput = document.getElementById("crit-count");
    if (dimInput) dimInput.value = dimCount;
    if (critInput) critInput.value = critCount;

    renderMultiCriteriaForm(dimCount, critCount);

    const nameInputs = document.querySelectorAll(".crit-name");
    const funcSelects = document.querySelectorAll(".crit-func-type");
    const directionSelects = document.querySelectorAll(".crit-direction");
    const operatorSelects = document.querySelectorAll(".crit-operator");
    const limitInputs = document.querySelectorAll(".crit-limit");
    const mainChecks = document.querySelectorAll(".main-crit-check");

    criteria.forEach((item, idx) => {
        if (nameInputs[idx]) nameInputs[idx].value = item.name || nameInputs[idx].value;
        if (funcSelects[idx] && item.func_type) funcSelects[idx].value = item.func_type;
        if (directionSelects[idx] && item.direction) directionSelects[idx].value = item.direction;
    });

    directionSelects.forEach(select => {
        select.dispatchEvent(new Event("change"));
    });

    criteria.forEach((item, idx) => {
        const coeffs = item.params && Array.isArray(item.params.coeffs) ? item.params.coeffs : [];
        coeffs.forEach((value, colIdx) => {
            const input = document.querySelector(`.crit-coeff[data-row="${idx + 1}"][data-col="${colIdx}"]`);
            if (input) {
                input.value = value;
            }
        });

        if (mainChecks[idx] && item.name && item.name === mainCriterion) {
            mainChecks[idx].checked = true;
        }
    });

    const mainIndex = criteria.findIndex(item => item.name === mainCriterion);
    if (mainIndex >= 0 && mainChecks[mainIndex]) {
        mainChecks[mainIndex].dispatchEvent(new Event("change"));
    }

    criteria.forEach((item, idx) => {
        if (item.name && item.name === mainCriterion) {
            return;
        }
        const constraint = item.name ? constraints[item.name] : null;
        if (!constraint) {
            return;
        }
        if (operatorSelects[idx] && limitInputs[idx]) {
            if (constraint.min !== undefined && constraint.min !== null) {
                operatorSelects[idx].value = "≥";
                limitInputs[idx].value = constraint.min;
            } else if (constraint.max !== undefined && constraint.max !== null) {
                operatorSelects[idx].value = "≤";
                limitInputs[idx].value = constraint.max;
            }
        }
    });

    const varMinInputs = document.querySelectorAll(".var-min");
    const varMaxInputs = document.querySelectorAll(".var-max");
    variableBounds.forEach((bounds, idx) => {
        if (varMinInputs[idx]) varMinInputs[idx].value = bounds[0];
        if (varMaxInputs[idx]) varMaxInputs[idx].value = bounds[1];
    });

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
        submitBtn.style.display = "block";
    }
}

function getMcFormState() {
    const nameInputs = document.querySelectorAll(".crit-name");
    const funcSelects = document.querySelectorAll(".crit-func-type");
    const directionSelects = document.querySelectorAll(".crit-direction");
    const operatorSelects = document.querySelectorAll(".crit-operator");
    const limitInputs = document.querySelectorAll(".crit-limit");
    const mainChecks = document.querySelectorAll(".main-crit-check");
    const coeffInputs = document.querySelectorAll(".crit-coeff");
    const varMinInputs = document.querySelectorAll(".var-min");
    const varMaxInputs = document.querySelectorAll(".var-max");

    if (!nameInputs.length || !coeffInputs.length) {
        return null;
    }

    const criteria = Array.from(nameInputs).map((input, idx) => {
        const coeffs = [];
        coeffInputs.forEach(inp => {
            if (parseInt(inp.dataset.row) === idx + 1) {
                coeffs.push(parseFloat(inp.value) || 0);
            }
        });

        return {
            name: input.value,
            func_type: funcSelects[idx] ? funcSelects[idx].value : "linear",
            direction: directionSelects[idx] ? directionSelects[idx].value : "max",
            operator: operatorSelects[idx] ? operatorSelects[idx].value : "≥",
            limit: limitInputs[idx] ? limitInputs[idx].value : "",
            is_main: mainChecks[idx] ? mainChecks[idx].checked : false,
            coeffs
        };
    });

    const variable_bounds = [];
    varMinInputs.forEach((input, idx) => {
        const maxInput = varMaxInputs[idx];
        variable_bounds.push([
            parseFloat(input.value) || 0,
            maxInput ? (parseFloat(maxInput.value) || 0) : 0
        ]);
    });

    return {
        dim_count: varMinInputs.length,
        crit_count: criteria.length,
        criteria,
        variable_bounds
    };
}

function applyMcFormState(state) {
    if (!state || !state.criteria) {
        return;
    }

    const nameInputs = document.querySelectorAll(".crit-name");
    const funcSelects = document.querySelectorAll(".crit-func-type");
    const directionSelects = document.querySelectorAll(".crit-direction");
    const operatorSelects = document.querySelectorAll(".crit-operator");
    const limitInputs = document.querySelectorAll(".crit-limit");
    const mainChecks = document.querySelectorAll(".main-crit-check");

    state.criteria.forEach((item, idx) => {
        if (nameInputs[idx]) nameInputs[idx].value = item.name || nameInputs[idx].value;
        if (funcSelects[idx] && item.func_type) funcSelects[idx].value = item.func_type;
        if (directionSelects[idx] && item.direction) directionSelects[idx].value = item.direction;
    });

    directionSelects.forEach(select => {
        select.dispatchEvent(new Event("change"));
    });

    state.criteria.forEach((item, idx) => {
        const coeffs = Array.isArray(item.coeffs) ? item.coeffs : [];
        coeffs.forEach((value, colIdx) => {
            const input = document.querySelector(`.crit-coeff[data-row="${idx + 1}"][data-col="${colIdx}"]`);
            if (input) {
                input.value = value;
            }
        });

        if (mainChecks[idx]) {
            mainChecks[idx].checked = Boolean(item.is_main);
        }
    });

    const mainIndex = state.criteria.findIndex(item => item.is_main);
    if (mainIndex >= 0 && mainChecks[mainIndex]) {
        mainChecks[mainIndex].dispatchEvent(new Event("change"));
    }

    state.criteria.forEach((item, idx) => {
        if (item.is_main) {
            return;
        }
        if (operatorSelects[idx] && item.operator) {
            operatorSelects[idx].value = item.operator;
        }
        if (limitInputs[idx] && item.limit !== undefined) {
            limitInputs[idx].value = item.limit;
        }
    });

    const varMinInputs = document.querySelectorAll(".var-min");
    const varMaxInputs = document.querySelectorAll(".var-max");
    (state.variable_bounds || []).forEach((bounds, idx) => {
        if (varMinInputs[idx]) varMinInputs[idx].value = bounds[0];
        if (varMaxInputs[idx]) varMaxInputs[idx].value = bounds[1];
    });
}

function getAhpFormState() {
    const critInputs = document.querySelectorAll(".crit-name");
    const altInputs = document.querySelectorAll(".alt-name");
    const critCount = critInputs.length;
    const altCount = altInputs.length;

    if (!critCount || !altCount) {
        return null;
    }

    const criteria = Array.from(critInputs).map(input => input.value);
    const alternatives = Array.from(altInputs).map(input => input.value);

    const matrix = getMatrixSafe("criteria-matrix", critCount);
    const alt_matrices = {};
    for (let i = 0; i < critCount; i++) {
        alt_matrices[criteria[i]] = getMatrixSafe(`alt-matrix-${i}`, altCount);
    }

    return { criteria, alternatives, matrix, alt_matrices };
}

function applyAhpFormState(state) {
    if (!state) {
        return;
    }
    const criteria = Array.isArray(state.criteria) ? state.criteria : [];
    const alternatives = Array.isArray(state.alternatives) ? state.alternatives : [];
    const matrix = Array.isArray(state.matrix) ? state.matrix : [];
    const altMatrices = state.alt_matrices || {};

    document.querySelectorAll(".crit-name").forEach((input, idx) => {
        if (criteria[idx] !== undefined) {
            input.value = criteria[idx];
        }
    });
    document.querySelectorAll(".alt-name").forEach((input, idx) => {
        if (alternatives[idx] !== undefined) {
            input.value = alternatives[idx];
        }
    });

    fillMatrix("criteria-matrix", matrix);

    document.querySelectorAll(".crit-name").forEach((input, idx) => {
        const critName = input.value || criteria[idx];
        const altMatrix = altMatrices[critName] || altMatrices[criteria[idx]];
        if (altMatrix) {
            fillMatrix(`alt-matrix-${idx}`, altMatrix);
        }
    });
}

function getMatrixSafe(tableId, size) {
    const table = document.getElementById(tableId);
    if (!table) {
        return [];
    }

    const matrix = [];
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach((row, i) => {
        if (i >= size) {
            return;
        }
        matrix[i] = [];
        const inputs = row.querySelectorAll("input");
        inputs.forEach((input, j) => {
            if (j < size) {
                matrix[i][j] = parseFloat(input.value) || 1;
            }
        });
    });

    return matrix;
}

// ====================== ПАРНЫЕ ИГРЫ ======================

function renderPairGameMatrix(rows, cols) {
    const container = document.getElementById("pair-matrix-section");
    if (!container) return;

    let html = `
        <h4 style="text-align:center; margin:2rem 0 1rem; color:var(--color-primary-darker);">
            Платежная матрица (выигрыш Игрока 1)
        </h4>
        <div class="table-wrapper">
            <table class="pair-game-table" id="pair-game-matrix">
                <thead>
                    <tr>
                        <th></th>`;

    for (let j = 1; j <= cols; j++) {
        html += `<th>Стратегия B${j}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let i = 1; i <= rows; i++) {
        html += `<tr><th>Стратегия A${i}</th>`;
        for (let j = 1; j <= cols; j++) {
            html += `
                <td>
                    <input type="number"
                           class="pair-cell"
                           data-row="${i-1}"
                           data-col="${j-1}"
                           value="${(Math.random()*10 - 2).toFixed(1)}"
                           step="0.1">
                </td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    container.innerHTML = html;
}

function randomizePairGameMatrix() {
    document.querySelectorAll(".pair-cell").forEach(cell => {
        cell.value = (Math.random() * 12 - 3).toFixed(1);
    });
}

// ====================== ПАРНЫЕ ИГРЫ — УЛУЧШЕННАЯ ВЕРСИЯ ======================

function generatePairGameStructure(newRows, newCols) {
    const playersSection = document.getElementById("players-names-section");
    const matrixSection = document.getElementById("pair-matrix-section");

    // Сохраняем предыдущие данные (если они есть)
    const oldMatrix = getCurrentPairMatrix();
    const oldPlayer1Name = document.getElementById("player1-name") ? document.getElementById("player1-name").value : "Игрок 1";
    const oldPlayer2Name = document.getElementById("player2-name") ? document.getElementById("player2-name").value : "Игрок 2";

    // === Имена игроков (сохраняем введённые значения) ===
    playersSection.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem;">
            <div>
                <h4 style="margin-bottom: 1rem; text-align: center; color: var(--color-primary-darker);">Игрок 1</h4>
                <div class="name-card">
                    <label for="player1-name">Имя Игрока 1</label>
                    <input type="text" id="player1-name" class="player-name" value="${oldPlayer1Name}" style="width:100%;">
                </div>
            </div>
            <div>
                <h4 style="margin-bottom: 1rem; text-align: center; color: var(--color-primary-darker);">Игрок 2</h4>
                <div class="name-card">
                    <label for="player2-name">Имя Игрока 2</label>
                    <input type="text" id="player2-name" class="player-name" value="${oldPlayer2Name}" style="width:100%;">
                </div>
            </div>
        </div>
    `;

    // === Создаём новую матрицу с сохранением старых данных ===
    let html = `
        <h4 style="text-align:center; margin:1.5rem 0 1rem; color:var(--color-primary-darker);" id="matrix-title">
            Платежная матрица (выигрыш ${oldPlayer1Name})
        </h4>
        <div class="table-wrapper">
            <table class="pair-game-table" id="pair-game-matrix">
                <thead>
                    <tr>
                        <th></th>`;

    for (let j = 0; j < newCols; j++) {
        html += `<th class="col-header" data-col="${j}">B${j+1}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let i = 0; i < newRows; i++) {
        html += `<tr><th class="row-header" data-row="${i}">A${i+1}</th>`;
        for (let j = 0; j < newCols; j++) {
            // Берём старое значение, если оно было, иначе случайное или 0
            const oldValue = (oldMatrix[i] && oldMatrix[i][j] !== undefined)
                           ? oldMatrix[i][j]
                           : (Math.random() * 8 - 2).toFixed(1);

            html += `
                <td>
                    <input type="number"
                           class="pair-cell"
                           data-row="${i}"
                           data-col="${j}"
                           value="${oldValue}"
                           step="0.1">
                </td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    matrixSection.innerHTML = html;

    // Подключаем слушатели
    setupPairGameNameListeners();
}

function setupPairGameNameListeners() {
    const player1Input = document.getElementById("player1-name");
    if (!player1Input) return;

    function updateMatrixTitle() {
        const p1Name = player1Input.value.trim() || "Игрок 1";
        const titleEl = document.getElementById("matrix-title");
        if (titleEl) {
            titleEl.textContent = `Платежная матрица (выигрыш ${p1Name})`;
        }
    }

    player1Input.addEventListener("input", updateMatrixTitle);
    updateMatrixTitle(); // начальное значение
}

function randomizePairGame() {
    // Заполняем матрицу случайными значениями
    document.querySelectorAll(".pair-cell").forEach(cell => {
        cell.value = (Math.random() * 12 - 4).toFixed(1);
    });

    // Случайные имена игроков
    const p1 = document.getElementById("player1-name");
    const p2 = document.getElementById("player2-name");
    if (p1) p1.value = ["Игрок 1", "Первый игрок", "Алексей", "Команда A"][Math.floor(Math.random()*4)];
    if (p2) p2.value = ["Игрок 2", "Второй игрок", "Мария", "Команда B"][Math.floor(Math.random()*4)];

    // Обновляем заголовок
    const titleEl = document.getElementById("matrix-title");
    if (titleEl && p1) titleEl.textContent = `Платежная матрица (выигрыш ${p1.value})`;
}

// Получает текущую матрицу из таблицы (для сохранения данных при изменении размера)
function getCurrentPairMatrix() {
    const table = document.getElementById("pair-game-matrix");
    if (!table) return [];

    const matrix = [];
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll(".pair-cell").forEach(cell => {
            rowData.push(parseFloat(cell.value) || 0);
        });
        matrix.push(rowData);
    });

    return matrix;
}

// ====================== ИГРЫ С ПРИРОДОЙ ======================

function generateNatureGameStructure(rows, cols) {
    const playersSection = document.getElementById("nature-players-section");
    const matrixSection = document.getElementById("nature-matrix-section");

    // Сохраняем старые данные при изменении размера
    const oldMatrix = getCurrentNatureMatrix();

    playersSection.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem; text-align: center; color: var(--color-primary-darker);">Лицо, принимающее решение</h4>
            <div class="name-card" style="max-width: 400px; margin: 0 auto;">
                <label for="decision-maker">Название ЛПР (опционально)</label>
                <input type="text" id="decision-maker" class="player-name" value="Лицо, принимающее решение" style="width:100%;">
            </div>
        </div>
    `;

    let html = `
        <h4 style="text-align:center; margin:1.5rem 0 1rem; color:var(--color-primary-darker);" id="nature-matrix-title">
            Матрица "Стратегии × Состояния природы"
        </h4>
        <div class="table-wrapper">
            <table class="pair-game-table" id="nature-game-matrix">
                <thead>
                    <tr>
                        <th></th>`;

    for (let j = 0; j < cols; j++) {
        html += `<th class="col-header" data-col="${j}">S${j+1}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let i = 0; i < rows; i++) {
        html += `<tr><th class="row-header" data-row="${i}">X${i+1}</th>`;
        for (let j = 0; j < cols; j++) {
            const oldValue = (oldMatrix[i] && oldMatrix[i][j] !== undefined)
                           ? oldMatrix[i][j]
                           : (Math.random() * 10 - 2).toFixed(1);

            html += `
                <td>
                    <input type="number"
                           class="pair-cell"
                           data-row="${i}"
                           data-col="${j}"
                           value="${oldValue}"
                           step="0.1">
                </td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    matrixSection.innerHTML = html;

    setupNatureNameListeners();
}

function getCurrentNatureMatrix() {
    const table = document.getElementById("nature-game-matrix");
    if (!table) return [];

    const matrix = [];
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll(".pair-cell").forEach(cell => {
            rowData.push(parseFloat(cell.value) || 0);
        });
        matrix.push(rowData);
    });

    return matrix;
}

function setupNatureNameListeners() {
    // Можно расширить позже для названий стратегий и состояний природы
    const titleEl = document.getElementById("nature-matrix-title");
    if (titleEl) {
        titleEl.textContent = `Матрица "Стратегии × Состояния природы"`;
    }
}

function randomizeNatureGame() {
    document.querySelectorAll("#nature-game-matrix .pair-cell").forEach(cell => {
        cell.value = (Math.random() * 12 - 3).toFixed(1);
    });

    const dm = document.getElementById("decision-maker");
    if (dm) dm.value = ["Руководитель", "Компания", "Фермер", "Инвестор"][Math.floor(Math.random()*4)];
}

// ====================== ЗАГРУЗКА ПРИМЕРА ======================

async function loadExample(algorithmId) {
    try {
        const res = await fetch("mocks/examples.json");
        if (!res.ok) {
            throw new Error("Не удалось загрузить примеры");
        }
        const payload = await res.json();
        const all = Array.isArray(payload.examples) ? payload.examples : [];
        const type = algorithmId === "pair_games" ? "two_player_game" : "nature_game";
        const example = all.find(item => item.type === type);

        if (!example) {
            alert("Пример не найден");
            return;
        }

        if (algorithmId === "pair_games") {
            applyPairGameExample(example.data || {});
        } else if (algorithmId === "nature_games") {
            applyNatureGameExample(example.data || {});
        }
    } catch (err) {
        console.error("Ошибка загрузки примера:", err);
        alert("Не удалось загрузить пример");
    }
}

function applyPairGameExample(data) {
    const matrix = Array.isArray(data.payoff_matrix) ? data.payoff_matrix : [];
    const rows = matrix.length || 2;
    const cols = matrix[0] ? matrix[0].length : 2;

    generatePairGameStructure(rows, cols);

    const p1 = document.getElementById("player1-name");
    const p2 = document.getElementById("player2-name");
    if (p1) p1.value = data.player1_name || "Игрок 1";
    if (p2) p2.value = data.player2_name || "Игрок 2";

    fillPairGameMatrix(matrix);
}

function applyNatureGameExample(data) {
    const matrix = Array.isArray(data.payoff_matrix) ? data.payoff_matrix : [];
    const rows = matrix.length || 2;
    const cols = matrix[0] ? matrix[0].length : 3;

    generateNatureGameStructure(rows, cols);

    const dm = document.getElementById("decision-maker");
    if (dm) dm.value = data.decision_maker || "ЛПР";

    const lambda = document.getElementById("hurwicz-alpha");
    if (lambda && data.lambda !== undefined) {
        lambda.value = data.lambda;
    }

    fillNatureGameMatrix(matrix);
}

function fillPairGameMatrix(matrix) {
    const table = document.getElementById("pair-game-matrix");
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row, rIdx) => {
        const cells = row.querySelectorAll(".pair-cell");
        cells.forEach((cell, cIdx) => {
            if (matrix[rIdx] && matrix[rIdx][cIdx] !== undefined) {
                cell.value = matrix[rIdx][cIdx];
            }
        });
    });
}

function fillNatureGameMatrix(matrix) {
    const table = document.getElementById("nature-game-matrix");
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row, rIdx) => {
        const cells = row.querySelectorAll(".pair-cell");
        cells.forEach((cell, cIdx) => {
            if (matrix[rIdx] && matrix[rIdx][cIdx] !== undefined) {
                cell.value = matrix[rIdx][cIdx];
            }
        });
    });
}
