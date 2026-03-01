# DecisionTheory

Веб-приложение для принятия решений: **AHP** (метод аналитической иерархии) и **многокритериальная оптимизация**.

## Быстрый старт (Docker)

```bash
cd docker
docker-compose up --build
```

Приложение: [http://localhost:8000](http://localhost:8000)

## Локальный запуск (без Docker)

1. Убедитесь, что MongoDB запущена на `localhost:27017`.
2. Установите зависимости:

```bash
pip install -r requirements.txt
```

3. Запустите:

```bash
python run.py
```

## API

| Метод  | URL                              | Описание                         |
|--------|----------------------------------|----------------------------------|
| GET    | `/api/health`                    | Статус приложения                |
| GET    | `/api/ready`                     | Проверка подключения к MongoDB   |
| POST   | `/api/v1/jobs`                   | Создать задачу (method + данные) |
| GET    | `/api/v1/jobs`                   | Список задач (?method=&status=)  |
| GET    | `/api/v1/jobs/<id>`              | Получить задачу по ID            |
| POST   | `/api/v1/jobs/<id>/run`          | Запустить вычисление             |
| GET    | `/api/v1/jobs/<id>/report`       | Получить отчёт                   |

### Пример: создание AHP-задачи

```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "method": "ahp",
    "criteria": ["price", "quality", "delivery"],
    "alternatives": ["A", "B", "C"],
    "matrix": [[1, 3, 5], [0.333, 1, 3], [0.2, 0.333, 1]]
  }'
```

## Структура проекта

```
app/
  __init__.py         — Flask app factory, роуты, подключение MongoDB
  config.py           — Конфигурация (env-переменные)
  db.py               — Подключение к MongoDB, хелперы
  run_service.py      — Логика запуска: валидация → алгоритм → сохранение
  reporter.py         — Генерация отчёта (текст + base64-графики)
  utils.py            — Валидация, сериализация, вспомогательные функции
  algorithms/
    ahp.py            — AHP (TODO)
    multi_criteria.py — Многокритериальная оптимизация (TODO)
frontend/             — Статический фронтенд (HTML/CSS/JS)
tests/                — pytest-тесты
docker/               — Dockerfile + docker-compose.yml
```

## Тесты

```bash
pytest tests/ -v
```

## Как добавить алгоритм

1. Создайте функцию в `app/algorithms/your_algo.py` с сигнатурой `run_your_algo(payload) -> dict`.
2. Добавьте метод в `Config.ALLOWED_METHODS` (`app/config.py`).
3. Добавьте валидатор в `app/utils.py` → `validate_your_algo_payload()`.
4. Подключите диспатч в `app/run_service.py` → `_dispatch()`.
5. Добавьте генерацию отчёта в `app/reporter.py`.