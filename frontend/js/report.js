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

            renderFuzzyVisualization(contentEl, reportData);

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

function renderFuzzyVisualization(container, reportData) {
    const visualization = reportData.visualization_data;
    if (!container || !visualization || !Array.isArray(visualization.term_lines)) {
        return;
    }
    if (typeof Chart === "undefined") {
        console.warn("Chart.js не загружен, визуализация нечетких множеств пропущена");
        return;
    }

    const section = document.createElement("section");
    section.className = "fuzzy-chart-section";
    section.innerHTML = `
        <h2>Графики функций принадлежности</h2>
        <div class="fuzzy-chart-wrap">
            <canvas id="fuzzy-membership-chart" aria-label="Графики функций принадлежности"></canvas>
        </div>
    `;
    container.appendChild(section);

    const canvas = section.querySelector("#fuzzy-membership-chart");
    const colors = ["#2563eb", "#16a34a", "#dc2626"];
    const termDatasets = visualization.term_lines.map((line, index) => ({
        label: line.term || `Терм ${index + 1}`,
        data: normalizeChartPoints(line.points),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length],
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0,
        fill: false,
        showLine: true
    }));

    const currentLine = visualization.current_x_line;
    if (currentLine && Array.isArray(currentLine.points)) {
        termDatasets.push({
            label: `Текущее x = ${currentLine.x}`,
            data: normalizeChartPoints(currentLine.points),
            borderColor: "#111827",
            backgroundColor: "#111827",
            borderWidth: 2,
            borderDash: [6, 6],
            pointRadius: 0,
            tension: 0,
            fill: false,
            showLine: true
        });
    }

    new Chart(canvas, {
        type: "line",
        data: {
            datasets: termDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const point = ctx.raw || {};
                            return `${ctx.dataset.label}: (${formatChartNumber(point.x)}, ${formatChartNumber(point.y)})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min: visualization.x_axis?.min,
                    max: visualization.x_axis?.max,
                    title: {
                        display: true,
                        text: "Значение переменной"
                    }
                },
                y: {
                    min: visualization.y_axis?.min ?? 0,
                    max: visualization.y_axis?.max ?? 1,
                    title: {
                        display: true,
                        text: "Степень принадлежности"
                    }
                }
            }
        }
    });
}

function normalizeChartPoints(points) {
    return points.map(point => {
        if (Array.isArray(point)) {
            return { x: Number(point[0]), y: Number(point[1]) };
        }
        return { x: Number(point.x), y: Number(point.y) };
    });
}

function formatChartNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return Number.isInteger(num) ? String(num) : num.toFixed(3);
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

// ===== Навигационные кнопки =====

document.addEventListener("DOMContentLoaded", () => {

    const backBtn = document.getElementById("btn-back");
    const homeBtn = document.getElementById("btn-home");

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.history.back();
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            window.location.href = "/";
        });
    }

});
