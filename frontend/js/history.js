// js/history.js — страница истории отчётов

console.log("history.js загружен, режим:", APP_MODE);

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("history-container");
    const paginationEl = document.getElementById("pagination");

    if (!container) {
        console.error("Элемент #history-container не найден");
        return;
    }

    showLoading("history-container", "Загрузка истории отчётов...");

    try {
        const data = await fetchReportsList(1, 50);
        const items = data.items || [];

        container.innerHTML = "";

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Отчётов пока нет</p>
                    <p style="color:var(--color-text-light); font-size:0.95rem;">
                        Запустите расчёт, и он появится здесь
                    </p>
                    <button onclick="goHome()" class="primary-btn" style="margin-top:1.5rem;">
                        Перейти к расчётам
                    </button>
                </div>
            `;
            return;
        }

        // Строим таблицу
        let html = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Метод</th>
                        <th>Имя отчёта</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;

        items.forEach((item, idx) => {
            const algName = getMethodNameById(item.algorithm_id);
            const date = item.created_at
                ? formatDate(item.created_at)
                : "—";
            const reportName = item.report_name || item.run_id.slice(-8);

            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${algName}</td>
                    <td title="${item.run_id}">${reportName}</td>
                    <td>${date}</td>
                    <td class="actions-cell">
                        <button class="action-btn view-btn" data-run-id="${item.run_id}">
                            Открыть
                        </button>
                        <a href="/api/reports/${item.run_id}/csv" download class="action-btn csv-btn">
                            CSV
                        </a>
                        <a href="/api/reports/${item.run_id}/pdf" download class="action-btn pdf-btn">
                            PDF
                        </a>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

        // Обработчик кнопки "Открыть"
        container.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const runId = btn.dataset.runId;
                save("run_id", runId);
                window.location.href = "/report";
            });
        });

        // Показать кнопку "Очистить историю"
        const clearSection = document.getElementById("clear-section");
        const clearBtn = document.getElementById("clear-history-btn");
        if (clearSection && clearBtn) {
            clearSection.style.display = "flex";
            clearBtn.addEventListener("click", async () => {
                if (!confirm("Удалить все отчёты? Это действие нельзя отменить.")) return;
                try {
                    await clearReports();
                    location.reload();
                } catch (err) {
                    showError("history-container", "Ошибка очистки: " + err.message);
                }
            });
        }

        // Пагинация
        if (data.total > data.limit && paginationEl) {
            const totalPages = Math.ceil(data.total / data.limit);
            let pagHtml = "";
            for (let p = 1; p <= totalPages; p++) {
                const active = p === data.page ? "active" : "";
                pagHtml += `<button class="page-btn ${active}" data-page="${p}">${p}</button>`;
            }
            paginationEl.innerHTML = pagHtml;
            paginationEl.querySelectorAll(".page-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const page = parseInt(btn.dataset.page);
                    showLoading("history-container", "Загрузка...");
                    try {
                        const pageData = await fetchReportsList(page, 50);
                        // Re-render (simple approach: reload)
                        location.reload();
                    } catch (err) {
                        showError("history-container", "Ошибка: " + err.message);
                    }
                });
            });
        }

        console.log(`Загружено ${items.length} отчётов`);
    } catch (err) {
        console.error("Ошибка загрузки истории:", err);
        showError("history-container", "Не удалось загрузить историю отчётов<br>" + err.message);
    }
});
