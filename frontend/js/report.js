// js/report.js

console.log("report.js загружен, режим:", APP_MODE);

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded → загружаем отчёт");

    const contentEl = document.getElementById("report-content");
    const actionsEl = document.getElementById("report-actions");

    if (!contentEl) {
        console.error("Элемент #report-content не найден");
        return;
    }

    showLoading("report-content", "Загрузка отчёта...");

    // 1. Читаем run_id
    const runId = load("run_id");

    if (!runId) {
        showError("report-content", "Нет идентификатора расчёта. Вернитесь на предыдущую страницу.");
        return;
    }

    try {
        console.log("Загружаем отчёт для run_id:", runId);

        const reportData = await fetchReport(runId);

        // Очищаем лоадер
        contentEl.innerHTML = "";

        if (reportData.markdown) {
            // Преобразуем markdown в HTML
            const html = marked.parse(reportData.markdown);

            // Вставляем готовый HTML
            contentEl.innerHTML = html;

            // Если в отчёте есть графики Chart.js — инициализируем их
            initChartsIfPresent();
            renderReportActions(actionsEl, runId, reportData);
        } else {
            contentEl.innerHTML = "<p style='color:#dc2626; text-align:center; padding:2rem;'>" +
                                 "Отчёт не содержит данных (markdown отсутствует)</p>";
        }

        console.log("Отчёт успешно отображён");
    } catch (err) {
        console.error("Ошибка загрузки отчёта:", err);
        showError("report-content", "Не удалось загрузить отчёт<br>" + err.message);
    }
});

function renderReportActions(container, runId, reportData) {
    if (!container) return;
    const csvUrl = `/api/reports/${runId}/csv`;
    const pdfUrl = `/api/reports/${runId}/pdf`;

    container.innerHTML = `
        <a href="${csvUrl}" download>Скачать CSV</a>
        <a href="${pdfUrl}" class="secondary" download>Скачать PDF</a>
    `;
}

// Простая функция для поиска и инициализации Chart.js графиков (если они есть в markdown)
function initChartsIfPresent() {
    // Пример: ищем canvas с id="myChart" и инициализируем, если найден
    const canvas = document.getElementById("myChart");
    if (canvas && typeof Chart !== "undefined") {
        // Здесь можно добавить пример графика (для теста)
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['A', 'B', 'C'],
                datasets: [{
                    label: 'Приоритет',
                    data: [0.65, 0.25, 0.10],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
        console.log("Chart.js график инициализирован");
    }
}