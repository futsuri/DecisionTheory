// js/common.js — общая логика
const APP_MODE = "mock";           // ← поменяй на "real" когда подключишь backend
const API_BASE = APP_MODE === "mock" ? "" : "http://localhost:5000";

window.APP_MODE = APP_MODE; // для отладки

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
  if (APP_MODE === "mock") {
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
  if (APP_MODE === "mock") {
    return { run_id: "demo-run-001" }; // имитация
  }
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Ошибка создания расчёта");
  return await res.json();
}

async function fetchReport(runId) {
  if (APP_MODE === "mock") {
    const res = await fetch("./mocks/report.json");
    return await res.json();
  }
  const res = await fetch(`${API_BASE}/api/reports/${runId}`);
  if (!res.ok) throw new Error("Ошибка загрузки отчёта");
  return await res.json();
}

// ==================== УТИЛИТЫ ====================
function showLoading(elementId, text = "Загрузка...") {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="loading">${text}</div>`;
}

function showError(elementId, msg) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="error">❌ ${msg}</div>`;
}