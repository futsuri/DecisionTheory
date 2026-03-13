// js/common.js — общая логика

// ==================== РЕЖИМ real / demo ====================
const APP_MODE = localStorage.getItem("app_mode") || "real";
const API_BASE = "";

window.APP_MODE = APP_MODE;

function toggleMode() {
  const current = localStorage.getItem("app_mode") || "real";
  const next = current === "real" ? "demo" : "real";
  localStorage.setItem("app_mode", next);
  window.location.reload();
}

// Показать текущий режим + сделать кнопку-тогглер
function _initModeDisplay() {
  const modeEl = document.getElementById("mode-display");
  if (modeEl) {
    modeEl.textContent = APP_MODE;
    modeEl.style.cursor = "pointer";
    modeEl.title = "Нажмите для переключения режима";
    modeEl.addEventListener("click", toggleMode);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _initModeDisplay);
} else {
  _initModeDisplay();
}

// ==================== ХРАНИЛИЩЕ ====================
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key, defaultVal = null) {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : defaultVal;
}

// ==================== API ====================
async function fetchAlgorithms() {
  if (APP_MODE === "demo") {
    try {
      // Вариант 1 — самый частый рабочий локально
      let url = "mocks/algorithms.json";           // без точки и слеша в начале

      // Если не сработает — раскомментируй следующий:
      // let url = "./mocks/algorithms.json";

      console.log("Пытаемся загрузить методы из:", url);   // ← для отладки

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Успешно загружено:", data);   // ← увидишь в консоли
      return data;
    } catch (err) {
      console.error("Ошибка загрузки методов:", err);
      throw err;   // чтобы showError сработал
    }
  }

  // real mode (не трогаем пока)
  const res = await fetch(`${API_BASE}/api/algorithms`);
  if (!res.ok) throw new Error("Ошибка загрузки методов");
  return await res.json();
}

async function createRun(payload) {
  if (APP_MODE === "demo") {
    return { run_id: "demo-run-001" };
  }
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error ? `: ${data.error}` : "";
    throw new Error(`Ошибка создания расчёта${detail}`);
  }
  return data;
}

async function fetchReport(runId) {
  if (APP_MODE === "demo") {
    const res = await fetch("mocks/report.json");
    return await res.json();
  }
  const res = await fetch(`${API_BASE}/api/reports/${runId}`);
  if (!res.ok) throw new Error("Ошибка загрузки отчёта");
  return await res.json();
}

async function fetchRun(runId) {
  if (APP_MODE === "demo") {
    const isMulti = /002/.test(runId);
    if (isMulti) {
      return {
        run_id: runId,
        algorithm_id: "multi_criteria",
        input: {
          criteria: [
            {
              name: "Прибыль",
              func_type: "linear",
              direction: "max",
              params: { coeffs: [1, 0.5, 0.2] }
            },
            {
              name: "Риск",
              func_type: "quadratic",
              direction: "min",
              params: { coeffs: [0.2, 1, 0] }
            },
            {
              name: "Стабильность",
              func_type: "linear",
              direction: "max",
              params: { coeffs: [0.4, 0.4, 0.4] }
            }
          ],
          constraints: {
            Риск: { max: 8 }
          },
          main_criterion: "Прибыль",
          variable_bounds: [[0, 10], [0, 10], [0, 10]]
        }
      };
    }
    return {
      run_id: runId,
      algorithm_id: "ahp",
      input: {
        criteria: ["Цена", "Качество", "Срок"],
        alternatives: ["A", "B", "C"],
        matrix: [
          [1, 3, 5],
          [1/3, 1, 2],
          [1/5, 1/2, 1]
        ],
        alt_matrices: {
          "Цена": [
            [1, 1/2, 2],
            [2, 1, 3],
            [1/2, 1/3, 1]
          ],
          "Качество": [
            [1, 4, 6],
            [1/4, 1, 2],
            [1/6, 1/2, 1]
          ],
          "Срок": [
            [1, 2, 4],
            [1/2, 1, 3],
            [1/4, 1/3, 1]
          ]
        }
      }
    };
  }
  const res = await fetch(`${API_BASE}/api/runs/${runId}`);
  if (!res.ok) throw new Error("Ошибка загрузки данных расчёта");
  return await res.json();
}

async function fetchReportsList(page = 1, limit = 50) {
  if (APP_MODE === "demo") {
    const res = await fetch("mocks/reports_list.json");
    return await res.json();
  }
  const res = await fetch(`${API_BASE}/api/reports?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error("Ошибка загрузки истории отчётов");
  return await res.json();
}

async function clearReports() {
  if (APP_MODE === "demo") {
    return { deleted: 0 };
  }
  const res = await fetch(`${API_BASE}/api/reports`, { method: "DELETE" });
  if (!res.ok) throw new Error("Ошибка очистки истории");
  return await res.json();
}

// ==================== УТИЛИТЫ ====================
function showLoading(elementId, text = "Загрузка...") {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="loading">${text}</div>`;
}

function showError(elementId, msg) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="error">${msg}</div>`;
}

/**
 * Форматирует ISO-строку даты в формат hh:mm dd.mm.yy
 * @param {string} isoString — дата в ISO 8601
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} ${dd}.${mo}.${yy}`;
}

// Возвращает название метода по id (для отображения на input.html)
function getMethodNameById(id) {
  const known = {
    ahp: "Метод анализа иерархий (AHP)",
    multi_criteria: "Многокритериальная оптимизация"
  };
  return known[id] || "Неизвестный метод";
}

// ====================== Навигация по сайту ======================

// переход на главную
function goHome() {
    window.location.href = "/";
}

// переход к истории
function goHistory() {
    window.location.href = "/history";
}

// переход назад
function goBack() {
    if (document.referrer) {
        window.history.back();
    } else {
        goHome();
    }
}