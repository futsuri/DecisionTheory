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

    // Вместо загрузки из JSON — сразу задаём список методов
    const methods = [
        {
            id: "ahp",
            name: "Метод анализа иерархий (AHP)",
            description: "Попарные сравнения критериев и альтернатив.",
            available: true
        },
        {
            id: "multi_criteria",
            name: "Многокритериальная оптимизация",
            description: "Непрерывные данные и функции полезности для критериев.",
            available: true
        },
        {
            id: "pair_games",
            name: "Парные игры",
            description: "Анализ двухсторонних матричных игр, поиск равновесий и оптимальных стратегий.",
            available: true
        },
        {
            id: "nature_games",
            name: "Игры с природой",
            description: "Принятие решений в условиях неопределённости (критерии Вальда, Лапласа, Гурвица и др.).",
            available: true
        }
        // Добавляй новые методы сюда — они автоматически появятся на странице
    ];

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
            save("algorithm_id", method.id);
            console.log(`Выбран метод: ${method.id} → сохраняем в localStorage`);
            window.location.href = "/input";
        });

        container.appendChild(card);
    });
});