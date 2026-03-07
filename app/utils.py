from datetime import datetime, timezone


# ---------------------------------------------------------------------------
#  Время
# ---------------------------------------------------------------------------

def utc_now():
    """Текущее время UTC."""
    return datetime.now(timezone.utc)


def isoformat(dt):
    """Безопасное преобразование datetime → ISO-строку."""
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
#  Валидация входных данных
# ---------------------------------------------------------------------------

def validate_payload(payload):
    """Базовая проверка: payload должен быть словарём."""
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    return payload


def validate_method(method, allowed):
    """Проверяет, что выбранный метод допустим."""
    if not method or method not in allowed:
        raise ValueError(
            f"Unknown method '{method}'. Allowed: {', '.join(sorted(allowed))}"
        )
    return method


def validate_ahp_payload(payload):
    """
    Проверяет структуру payload для AHP.
    Ожидает: criteria (list[str]), alternatives (list[str]),
             matrix (list[list[float]]) — попарные сравнения критериев.
    """
    criteria = payload.get("criteria")
    alternatives = payload.get("alternatives")
    matrix = payload.get("matrix")

    if not criteria or not isinstance(criteria, list):
        raise ValueError("AHP: 'criteria' must be a non-empty list of strings")
    if not alternatives or not isinstance(alternatives, list):
        raise ValueError("AHP: 'alternatives' must be a non-empty list of strings")
    if not matrix or not isinstance(matrix, list):
        raise ValueError("AHP: 'matrix' must be a non-empty 2D list")

    n = len(criteria)
    if len(matrix) != n or any(len(row) != n for row in matrix):
        raise ValueError(
            f"AHP: 'matrix' must be {n}×{n} (matching number of criteria)"
        )

    return payload


def validate_multi_criteria_payload(payload):
    """
    Проверяет структуру payload для многокритериальной оптимизации.
    Ожидает: criteria (list[dict]) — каждый с name, weight, func_type;
             constraints (dict) — ограничения;
             main_criterion (str, опционально).
    """
    criteria = payload.get("criteria")
    if not criteria or not isinstance(criteria, list):
        raise ValueError("MultiCriteria: 'criteria' must be a non-empty list")

    allowed_funcs = {"linear", "quadratic", "exponential", "logarithmic"}
    for i, c in enumerate(criteria):
        if not isinstance(c, dict):
            raise ValueError(f"MultiCriteria: criteria[{i}] must be an object")
        if "name" not in c:
            raise ValueError(f"MultiCriteria: criteria[{i}] missing 'name'")
        func_type = c.get("func_type", "linear")
        if func_type not in allowed_funcs:
            raise ValueError(
                f"MultiCriteria: criteria[{i}] unknown func_type '{func_type}'. "
                f"Allowed: {', '.join(sorted(allowed_funcs))}"
            )

    return payload




# ---------------------------------------------------------------------------
#  Сериализация MongoDB-документов
# ---------------------------------------------------------------------------

def serialize_job(doc):
    """Превращает MongoDB-документ задачи в JSON-совместимый dict."""
    return {
        "id": str(doc.get("_id")),
        "method": doc.get("method"),
        "status": doc.get("status"),
        "payload": doc.get("payload", {}),
        "result": doc.get("result"),
        "error": doc.get("error"),
        "created_at": isoformat(doc.get("created_at")),
        "updated_at": isoformat(doc.get("updated_at")),
    }