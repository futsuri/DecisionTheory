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

    try {
        const methods = await fetchAlgorithms();
        console.log("Методы успешно получены:", methods);

        // Очищаем контейнер от лоадера
        container.innerHTML = "";

        if (!Array.isArray(methods) || methods.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b; padding:2rem;">Методы не найдены</p>';
            return;
        }

        // Создаём карточки для каждого метода
        methods.filter(method => method.available !== false).forEach(method => {
            const card = document.createElement("div");
            card.classList.add("method-card");

            card.innerHTML = `
                <h3>${method.name || "Метод без названия"}</h3>
                <p style="margin:0.5rem 0 0; color:#64748b;">
                    ID: <code>${method.id}</code>
                </p>
            `;

            // Делаем карточку кликабельной
            card.style.cursor = "pointer";
            card.addEventListener("click", () => {
                save("algorithm_id", method.id);
                console.log(`Выбран метод: ${method.id} → сохраняем в localStorage`);
                window.location.href = "/input";
            });

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Ошибка при загрузке или отрисовке методов:", err);
        showError("methods-container", "Не удалось загрузить методы<br>" + err.message);
    }
});