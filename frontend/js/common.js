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
    const res = await fetch("./mocks/algorithms.json");
    return await res.json();
  }
  const res = await fetch(`${API_BASE}/api/algorithms`);
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