# DecisionTheory

Flask-приложение с методами принятия решений (AHP и многокритериальная оптимизация),
статическим frontend и сохранением результатов в MongoDB. Сейчас доступен только AHP.

## Быстрый запуск (локально)

1. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
2. Убедитесь, что MongoDB доступна (по умолчанию `mongodb://mongo:27017/decision_theory`).
3. Запустите сервер:
   ```bash
   python run.py
   ```
4. Откройте `http://localhost:8000`.

## Запуск через Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Frontend доступен на `http://localhost:8000`.

## API

- `GET /health` → `{"status": "ok"}`
- `GET /api/algorithms` → список алгоритмов (часть может быть помечена как недоступная)
- `POST /api/runs` → `{ "algorithm_id": "...", "input": { ... } }`
- `GET /api/reports/<run_id>` → отчёт в формате markdown

## Экспорт отчётов

После генерации отчёта автоматически создаются файлы:

- `reports/<run_id>.csv`
- `reports/<run_id>.pdf`

Папка вывода настраивается через `REPORT_OUTPUT_DIR`.

## Структура

- `app/` — backend и алгоритмы
- `frontend/` — статический интерфейс
- `docker/` — контейнеризация

```text
DecisionTheory/
│
├─ app/                        # Backend (Flask)
│   ├─ __init__.py             # Создание Flask-приложения, роуты, подключение MongoDB
│   ├─ algorithms/             # Реализации методов
│   │   ├─ ahp.py              # Метод аналитической иерархии (AHP): дискретные данные, проверка consistency (CR >0.1 — ошибка + предложения по фиксу)
│   │   └─ multi_criteria.py   # Многокритериальная оптимизация: непрерывные данные, функции (линейная для прибыли, квадратичная для расстояния, экспоненциальная для логистики, логарифмическая для энтропии). Подметод: напр., главный критерий (зафиксируйте один).
│   ├─ run_service.py          # Логика запуска: валидация, вызов алгоритма, сравнительный анализ (симуляция сценариев), сохранение в MongoDB
│   ├─ reporter.py             # Генерация отчета (текст + base64-графики)
│   ├─ utils.py                # Вспомогательные: валидация, графики (Matplotlib), MongoDB-хелперы
│   └─ db.py                   # Подключение к MongoDB (аналог mongo.py в оригинале)
│
├─ frontend/                   # Статический frontend (сервируется Flask'ом)
│   ├─ css/                    # Стили
│   │   ├─ main.css
│   │   ├─ input.css
│   │   └─ report.css
│   ├─ js/                     # Скрипты
│   │   ├─ main.js             # Выбор метода
│   │   ├─ input.js            # Формы, API-вызовы
│   │   └─ report.js           # Отображение отчета (Chart.js для графиков)
│   ├─ index.html              # Главная: выбор метода
│   ├─ input.html              # Ввод данных (адаптировано под метод)
│   └─ report.html             # Отчет: результаты, сравнение, графики
│
├─ tests/                      # Базовые тесты (pytest)
│   ├─ test_ahp.py             # Тесты AHP: на согласованные/несогласованные данные, ошибки
│   └─ test_multi_criteria.py  # Тесты многокритериальной: разные сценарии, функции
│
├─ docker/                     # Docker
│   ├─ Dockerfile              # Для backend-образа (копирует app, устанавливает зависимости)
│   └─ docker-compose.yml     # Запускает backend + MongoDB (volumes для данных)
│
├─ requirements.txt            # Зависимости: flask, numpy, scipy, matplotlib, pymongo, pytest
├─ README.md                   # Инструкции: как запустить (docker-compose up), добавить алгоритм, тесты
└─ run.py                      # Локальный запуск без Docker: python run.py
```
