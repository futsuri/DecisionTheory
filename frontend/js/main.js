// js/main.js — страница выбора метода (index.html)

console.log("main.js загружен, режим:", APP_MODE);

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
            save("algorithm_id", method.id);
            console.log(`Выбран метод: ${method.id} → сохраняем в localStorage`);
            window.location.href = "/input";
        });

        container.appendChild(card);
    });
});

// Добавьте эту функцию в конец файла js/main.js

function focusMethod(taskType) {
    // Карта соответствия задач и методов
    const taskMapping = {
        'selection': ['ahp', 'multi_criteria'], // Для выбора лучшего
        'conflict': ['pair_games'],            // Для конкуренции
        'risk': ['nature_games']               // Для игр с природой
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
            (id === 'nature_games' && methodTitle.includes('природой'))
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
        math: document.getElementById('param-math').checked
    };

    const taskDescription = document.getElementById('task-text').value;
    save("user_task_description", taskDescription); // Сохраняем для отчета[cite: 3]

    let decision = { id: "", url: "", reason: "" };

    if (p.opponent) {
        decision = {
            id: "pair_games", url: "/pair-game",
            reason: "Так как в задаче есть активный оппонент, мы используем теорию игр."
        };
    } else if (p.uncertainty) {
        decision = {
            id: "nature_games", url: "/nature-game",
            reason: "Для условий неопределенности лучше всего подходят критерии игр с природой."
        };
    } else if (p.expert || (p.alt && p.crit && !p.math)) {
        decision = {
            id: "ahp", url: "/input",
            reason: "Метод анализа иерархий идеален для выбора по качественным оценкам экспертов."
        };
    } else if (p.math || p.crit) {
        decision = {
            id: "multi_criteria", url: "/input",
            reason: "Многокритериальная оптимизация поможет сбалансировать числовые параметры."
        };
    }

    if (decision.id) {
        save("algorithm_id", decision.id);
        save("selection_reason", decision.reason);
        window.location.href = decision.url;
    } else {
        alert("Пожалуйста, уточните параметры задачи для подбора метода.");
    }
}
