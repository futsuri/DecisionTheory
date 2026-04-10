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