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

