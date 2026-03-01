"""
reporter.py — Генерация отчёта (текст + base64-графики).
Подключается после реализации алгоритмов.
"""
import base64
import io

from app.db import get_db
from bson.objectid import ObjectId


def generate_report(job_id):
    """
    Строит отчёт по завершённой задаче.
    Возвращает dict с текстовым описанием и списком графиков (base64 PNG).
    """
    db = get_db()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        return None

    doc = db.jobs.find_one({"_id": obj_id})
    if doc is None:
        return None
    if doc.get("status") != "done":
        return {"error": "Job is not finished yet", "status": doc.get("status")}

    method = doc.get("method")
    result = doc.get("result", {})
    payload = doc.get("payload", {})

    report = {
        "job_id": str(obj_id),
        "method": method,
        "summary": _build_summary(method, payload, result),
        "charts": _build_charts(method, payload, result),
    }
    return report


# ---------------------------------------------------------------------------
#  Текстовое резюме
# ---------------------------------------------------------------------------

def _build_summary(method, payload, result):
    """Формирует текстовое описание результатов."""
    if method == "ahp":
        return _summary_ahp(payload, result)
    if method == "multi_criteria":
        return _summary_multi_criteria(payload, result)
    return "Unknown method"


def _summary_ahp(payload, result):
    # TODO: заполнить после реализации AHP
    return "AHP report summary — will be generated after algorithm is implemented."


def _summary_multi_criteria(payload, result):
    # TODO: заполнить после реализации multi_criteria
    return "Multi-criteria report summary — will be generated after algorithm is implemented."


# ---------------------------------------------------------------------------
#  Графики (base64 PNG)
# ---------------------------------------------------------------------------

def _build_charts(method, payload, result):
    """
    Возвращает список dict: [{"title": "...", "image_base64": "..."}].
    Каждый график — PNG, закодированный в base64.
    """
    # TODO: реализовать после алгоритмов (matplotlib)
    return []


def _fig_to_base64(fig):
    """Вспомогательная: matplotlib Figure → base64-строка PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    return encoded
