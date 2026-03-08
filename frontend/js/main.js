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
    // Показываем лоадер (можно оставить)
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
        }
        // Если захочешь третий метод позже — просто добавь сюда ещё один объект
    ];

    // Убираем лоадер
    container.innerHTML = "";

    // Если методов нет (маловероятно, но оставляем проверку)
    if (!Array.isArray(methods) || methods.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding:2rem;">Методы не найдены</p>';
        return;
    }

    // Создаём карточки (улучшенная версия без ID и с описанием)
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