// js/main.js — страница выбора метода (index.html)

console.log("main.js загружен, режим:", APP_MODE);

const ALGORITHM_RECOMMENDATION_DICTIONARY = [
    {
        id: "id3",
        url: "/id3",
        label: "Алгоритмическое дерево решений (ID3)",
        keywords: [
            "id3", "энтроп", "информационный выигрыш", "категориаль",
            "дерево решений", "обучающая выборка", "целевой класс",
            "признаки", "классификация объекта", "обучить дерево",
            "таблица признаков", "играть", "погода", "контроль доступа",
            "роль", "тип запроса", "решение", "класс"
        ],
        reason: "В описании найдена задача построения дерева решений по категориальным признакам."
    },
    {
        id: "decision_tree",
        url: "/decision-tree",
        label: "Решающее дерево",
        keywords: [
            "классифиц", "класс", "решающее дерево", "дерево решений", "порог",
            "пороговое условие", "if", "else", "услови", "вердикт", "отбор",
            "кандидат", "пропустить", "не пропустить", "категория", "сегмент"
        ],
        reason: "В описании найдены признаки классификации по условиям, порогам или правилам if-else."
    },
    {
        id: "fuzzy_sets",
        url: "/fuzzy",
        label: "Нечёткие множества",
        keywords: [
            "нечет", "нечёт", "fuzzy", "принадлеж", "степень принадлежности",
            "лингвист", "низкий", "средний", "высокий", "малый", "большой",
            "размыт", "примерно", "около", "слабо", "сильно"
        ],
        reason: "В описании найдены размытые, лингвистические или нечёткие оценки."
    },
    {
        id: "pair_games",
        url: "/pair-game",
        label: "Парные игры",
        keywords: [
            "конкурент", "конкуренц", "оппонент", "противник", "соперник",
            "игрок", "стратег", "равновес", "нэш", "матрица выигрышей",
            "конфликт", "двухсторон", "атака", "защита"
        ],
        reason: "В описании найдена конфликтная постановка с активным оппонентом или конкурентом."
    },
    {
        id: "nature_games",
        url: "/nature-game",
        label: "Игры с природой",
        keywords: [
            "неопредел", "природ", "состояние среды", "состояние природы",
            "погода", "рынок", "спрос", "риск", "сценар", "вероятност",
            "вальд", "лаплас", "гурвиц", "сэвидж", "байес", "случайн"
        ],
        reason: "В описании найдена задача выбора в условиях неопределённости или риска."
    },
    {
        id: "ahp",
        url: "/input",
        label: "Метод анализа иерархий (AHP)",
        keywords: [
            "эксперт", "экспертная оценка", "попарн", "сравнен", "иерарх",
            "ahp", "саати", "приоритет", "вес критер", "субъектив",
            "альтернатив", "выбрать лучший", "ранжирован"
        ],
        reason: "В описании найдены экспертные оценки, попарные сравнения или выбор лучшей альтернативы."
    },
    {
        id: "multi_criteria",
        url: "/input",
        label: "Многокритериальная оптимизация",
        keywords: [
            "многокритери", "критери", "оптимизац", "ограничен",
            "целевая функция", "функция выгоды", "функция полезности",
            "числовые параметры", "минимиз", "максимиз", "баланс",
            "ресурс", "затраты", "прибыль", "срок", "качество"
        ],
        reason: "В описании найдены числовые критерии, ограничения или функции полезности."
    }
];

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM готов, запускаем загрузку методов");

    const container = document.getElementById("methods-container");
    if (!container) {
        console.error("Элемент #methods-container не найден в HTML");
        return;
    }

    // Показываем индикатор загрузки
    showLoading("methods-container", "Загрузка методов...");

    let methods = [];
    try {
        methods = await fetchAlgorithms();
    } catch (err) {
        console.error("Ошибка загрузки методов:", err);
        showError("methods-container", "Не удалось загрузить список методов");
        return;
    }

    // Убираем лоадер
    container.innerHTML = "";

    // Если методов нет (маловероятно, но оставляем проверку)
    if (!Array.isArray(methods) || methods.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding:2rem;">Методы не найдены</p>';
        return;
    }

    // Создаём карточки
    methods.filter(method => method.available !== false).forEach(method => {
        const card = document.createElement("div");
        card.classList.add("method-card");
        card.dataset.methodId = method.id;

        card.innerHTML = `
            <h3>${method.name}</h3>
            <p style="margin:0.6rem 0 0; color:#64748b; font-size:0.95rem;">
                ${method.description}
            </p>
        `;

        card.style.cursor = "pointer";
        card.addEventListener("click", () => {
            if (method.id === "pair_games") {
                window.location.href = "/pair-game";
                return;
            }
            if (method.id === "nature_games") {
                window.location.href = "/nature-game";
                return;
            }
            if (method.id === "fuzzy_sets") {
                window.location.href = "/fuzzy";
                return;
            }
            if (method.id === "decision_tree") {
                window.location.href = "/decision-tree";
                return;
            }
            if (method.id === "id3") {
                window.location.href = "/id3";
                return;
            }
            save("algorithm_id", method.id);
            console.log(`Выбран метод: ${method.id} → сохраняем в localStorage`);
            window.location.href = "/input";
        });

        container.appendChild(card);
    });

    initTextRecommendationPreview();
});

// Добавьте эту функцию в конец файла js/main.js

function focusMethod(taskType) {
    // Карта соответствия задач и методов
    const taskMapping = {
        'selection': ['ahp', 'multi_criteria'], // Для выбора лучшего
        'conflict': ['pair_games'],            // Для конкуренции
        'risk': ['nature_games'],              // Для игр с природой
        'fuzzy': ['fuzzy_sets'],
        'id3': ['id3'],
        'classification': ['decision_tree']
    };

    const targetMethods = taskMapping[taskType];
    const allCards = document.querySelectorAll('.method-card');

    // Снимаем выделение со всех
    allCards.forEach(card => {
        card.style.border = "none";
        card.style.opacity = "0.5";
        card.style.transform = "scale(0.95)";
    });

    // Подсвечиваем нужные
    let firstFound = null;
    allCards.forEach(card => {
        // Ищем ID метода. В коде main.js мы можем добавить data-id при создании
        const methodTitle = card.querySelector('h3').innerText.toLowerCase();

        const isMatch = targetMethods.some(id =>
            methodTitle.includes(id) ||
            (id === 'ahp' && methodTitle.includes('иерархий')) ||
            (id === 'multi_criteria' && methodTitle.includes('многокритериальная')) ||
            (id === 'pair_games' && methodTitle.includes('парные')) ||
            (id === 'nature_games' && methodTitle.includes('природой')) ||
            (id === 'fuzzy_sets' && methodTitle.includes('нечёткие')) ||
            (id === 'id3' && methodTitle.includes('id3')) ||
            (id === 'decision_tree' && methodTitle.includes('решающее'))
        );

        if (isMatch) {
            card.style.opacity = "1";
            card.style.transform = "scale(1.05)";
            card.style.border = "2px solid #3b82f6";
            card.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.2)";
            if (!firstFound) firstFound = card;
        }
    });

    // Плавный скролл к первому подходящему методу
    if (firstFound) {
        firstFound.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

document.addEventListener('change', (e) => {
    const inputs = {
        opponent: document.getElementById('param-opponent'),
        nature: document.getElementById('param-uncertainty'),
        math: document.getElementById('param-math'),
        expert: document.getElementById('param-opinion')
    };

    if (!inputs.opponent || !inputs.nature) return;

    // Функция-помощник для наглядного включения/выключения
    const toggleField = (element, forceDisable) => {
        element.disabled = forceDisable;
        const container = element.closest('.check-item');
        if (forceDisable) {
            container.classList.add('disabled');
            element.checked = false; // сбрасываем галочку, если поле блокируется
        } else {
            container.classList.remove('disabled');
        }
    };

    // 1. Конфликт: Оппонент vs Природа
    if (e.target === inputs.opponent) {
        toggleField(inputs.nature, inputs.opponent.checked);
    } else if (e.target === inputs.nature) {
        toggleField(inputs.opponent, inputs.nature.checked);
    }

    // 2. Конфликт: Математика vs Эксперты
    if (e.target === inputs.math) {
        toggleField(inputs.expert, inputs.math.checked);
    } else if (e.target === inputs.expert) {
        toggleField(inputs.math, inputs.expert.checked);
    }
});

function analyzeTaskAndRedirect() {
    const p = {
        opponent: document.getElementById('param-opponent').checked,
        uncertainty: document.getElementById('param-uncertainty').checked,
        alt: document.getElementById('param-alternatives').checked,
        crit: document.getElementById('param-criteria').checked,
        expert: document.getElementById('param-opinion').checked,
        math: document.getElementById('param-math').checked,
        fuzzy: document.getElementById('param-fuzzy').checked,
        classification: document.getElementById('param-classification').checked,
        id3: document.getElementById('param-id3').checked
    };

    const taskDescription = document.getElementById('task-text').value;
    save("user_task_description", taskDescription); // Сохраняем для отчета[cite: 3]

    let decision = { id: "", url: "", reason: "" };
    const textDecision = detectMethodFromText(taskDescription);
    const hasCheckboxDecision = Object.values(p).some(Boolean);

    if (!hasCheckboxDecision && textDecision) {
        decision = textDecision;
    } else {
        decision = detectMethodFromCheckboxes(p) || textDecision || decision;
    }

    if (decision.id) {
        save("algorithm_id", decision.id);
        save("selection_reason", decision.reason);
        window.location.href = decision.url;
    } else {
        alert("Пожалуйста, уточните параметры задачи для подбора метода.");
    }
}

function detectMethodFromCheckboxes(p) {
    if (p.id3) {
        return {
            id: "id3", url: "/id3",
            reason: "Для таблицы категориальных признаков и целевого класса подходит алгоритм ID3."
        };
    }
    if (p.classification) {
        return {
            id: "decision_tree", url: "/decision-tree",
            reason: "Задача формулируется как классификация по пороговым условиям, поэтому подходит решающее дерево."
        };
    }
    if (p.fuzzy) {
        return {
            id: "fuzzy_sets", url: "/fuzzy",
            reason: "В задаче используются размытые оценки и степени принадлежности, поэтому подходит модуль нечётких множеств."
        };
    }
    if (p.opponent) {
        return {
            id: "pair_games", url: "/pair-game",
            reason: "Так как в задаче есть активный оппонент, мы используем теорию игр."
        };
    }
    if (p.uncertainty) {
        return {
            id: "nature_games", url: "/nature-game",
            reason: "Для условий неопределенности лучше всего подходят критерии игр с природой."
        };
    }
    if (p.expert || (p.alt && p.crit && !p.math)) {
        return {
            id: "ahp", url: "/input",
            reason: "Метод анализа иерархий подходит для выбора по качественным оценкам экспертов."
        };
    }
    if (p.math || p.crit) {
        return {
            id: "multi_criteria", url: "/input",
            reason: "Многокритериальная оптимизация поможет сбалансировать числовые параметры."
        };
    }
    return null;
}

function detectMethodFromText(text) {
    const normalized = normalizeTaskText(text);
    if (!normalized) return null;

    let best = null;
    for (const item of ALGORITHM_RECOMMENDATION_DICTIONARY) {
        const matches = item.keywords.filter(word => normalized.includes(normalizeTaskText(word)));
        const score = matches.reduce((sum, word) => sum + Math.max(1, word.length / 8), 0);
        if (score > 0 && (!best || score > best.score)) {
            best = { ...item, score, matches };
        }
    }
    if (!best) return null;
    return {
        id: best.id,
        url: best.url,
        label: best.label,
        reason: best.reason,
        matches: best.matches
    };
}

function normalizeTaskText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function initTextRecommendationPreview() {
    const input = document.getElementById("task-text");
    if (!input) return;

    const preview = document.createElement("div");
    preview.id = "keyword-recommendation";
    preview.className = "keyword-recommendation hidden";
    preview.setAttribute("aria-live", "polite");
    input.insertAdjacentElement("afterend", preview);

    input.addEventListener("input", () => {
        const decision = detectMethodFromText(input.value);
        renderTextRecommendation(decision, preview);
        highlightRecommendedMethod(decision ? decision.id : null);
    });
}

function renderTextRecommendation(decision, preview) {
    if (!decision) {
        preview.classList.add("hidden");
        preview.innerHTML = "";
        return;
    }

    const matchedWords = decision.matches.slice(0, 4).join(", ");
    preview.classList.remove("hidden");
    preview.innerHTML = `
        <strong>Рекомендация по описанию: ${decision.label}</strong>
        <span>${decision.reason}</span>
        <small>Ключевые слова: ${matchedWords}</small>
    `;
}

function highlightRecommendedMethod(methodId) {
    document.querySelectorAll(".method-card").forEach(card => {
        const isMatch = methodId && card.dataset.methodId === methodId;
        card.classList.toggle("method-card-recommended", Boolean(isMatch));
    });
}
