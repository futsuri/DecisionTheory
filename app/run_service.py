"""
run_service.py — Логика запуска:
  • валидация входных данных
  • диспатч на нужный алгоритм
  • обновление статуса задачи в MongoDB
  • сравнительный анализ (заготовка)
"""
from bson.objectid import ObjectId
from flask import current_app

from app.db import get_db, update_doc
from app.utils import (
    isoformat,
    serialize_job,
    utc_now,
    validate_ahp_payload,
    validate_method,
    validate_multi_criteria_payload,
    validate_payload,
)


# ---------------------------------------------------------------------------
#  CRUD задач
# ---------------------------------------------------------------------------

def create_job(payload):
    """
    Создаёт новую задачу.
    payload должен содержать ключ 'method' ('ahp' | 'multi_criteria')
    и данные, соответствующие этому методу.
    """
    payload = validate_payload(payload)

    method = validate_method(
        payload.get("method"),
        current_app.config["ALLOWED_METHODS"],
    )

    # Валидация данных под конкретный метод
    _validate_for_method(method, payload)

    db = get_db()
    now = utc_now()
    doc = {
        "method": method,
        "payload": payload,
        "status": "queued",
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }
    result = db.jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_job(doc)


def get_job(job_id):
    """Возвращает задачу по ID или None."""
    db = get_db()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        return None
    doc = db.jobs.find_one({"_id": obj_id})
    if doc is None:
        return None
    return serialize_job(doc)


def list_jobs(method=None, status=None, limit=50):
    """Список задач с опциональной фильтрацией."""
    db = get_db()
    query = {}
    if method:
        query["method"] = method
    if status:
        query["status"] = status
    cursor = db.jobs.find(query).sort("created_at", -1).limit(limit)
    return [serialize_job(doc) for doc in cursor]


# ---------------------------------------------------------------------------
#  Запуск алгоритма
# ---------------------------------------------------------------------------

def run_job(job_id):
    """
    Запускает вычисление для задачи: обновляет статус → running,
    вызывает нужный алгоритм, сохраняет результат или ошибку.
    """
    db = get_db()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        return None

    doc = db.jobs.find_one({"_id": obj_id})
    if doc is None:
        return None

    # Переводим в running
    now = utc_now()
    update_doc("jobs", {"_id": obj_id}, {"status": "running", "updated_at": now})

    method = doc.get("method")
    payload = doc.get("payload", {})

    try:
        result = _dispatch(method, payload)
        update_doc("jobs", {"_id": obj_id}, {
            "status": "done",
            "result": result,
            "updated_at": utc_now(),
        })
    except Exception as exc:
        update_doc("jobs", {"_id": obj_id}, {
            "status": "error",
            "error": str(exc),
            "updated_at": utc_now(),
        })

    # Перечитываем и возвращаем
    return serialize_job(db.jobs.find_one({"_id": obj_id}))


# ---------------------------------------------------------------------------
#  Внутренние хелперы
# ---------------------------------------------------------------------------

def _validate_for_method(method, payload):
    """Валидация данных под конкретный метод."""
    validators = {
        "ahp": validate_ahp_payload,
        "multi_criteria": validate_multi_criteria_payload,
    }
    validator = validators.get(method)
    if validator:
        validator(payload)


def _dispatch(method, payload):
    """
    Вызывает нужный алгоритм и возвращает результат (dict).
    Алгоритмы будут реализованы в app/algorithms/.
    Сейчас — заглушки (TODO).
    """
    if method == "ahp":
        # TODO: from app.algorithms.ahp import run_ahp; return run_ahp(payload)
        raise NotImplementedError("AHP algorithm not yet implemented")

    if method == "multi_criteria":
        # TODO: from app.algorithms.multi_criteria import run_multi_criteria; return run_multi_criteria(payload)
        raise NotImplementedError("Multi-criteria algorithm not yet implemented")

    raise ValueError(f"No dispatcher for method '{method}'")
