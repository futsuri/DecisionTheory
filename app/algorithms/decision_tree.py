"""Decision-tree classifier for information security candidates."""


DEFAULT_THRESHOLDS = {
    "x1": 60.0,
    "x2": 70.0,
    "x3": 65.0,
}


def classify_candidates(payload):
    thresholds = payload.get("thresholds") or {}
    t1 = _number(thresholds.get("x1", DEFAULT_THRESHOLDS["x1"]), "T1")
    t2 = _number(thresholds.get("x2", DEFAULT_THRESHOLDS["x2"]), "T2")
    t3 = _number(thresholds.get("x3", DEFAULT_THRESHOLDS["x3"]), "T3")
    candidates = payload.get("candidates") or []
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("Нужно передать список кандидатов")

    results = []
    for index, candidate in enumerate(candidates, start=1):
        name = str(candidate.get("name") or f"Кандидат {index}")
        x1 = _score(candidate.get("x1"), f"{name}: X1")
        x2 = _score(candidate.get("x2"), f"{name}: X2")
        x3 = _score(candidate.get("x3"), f"{name}: X3")
        verdict, steps = _classify_one(name, x1, x2, x3, t1, t2, t3)
        results.append({
            "name": name,
            "x1": x1,
            "x2": x2,
            "x3": x3,
            "verdict": verdict,
            "steps": steps,
        })

    return {
        "thresholds": {"x1": t1, "x2": t2, "x3": t3},
        "results": results,
        "summary": _summary(results),
    }


def _classify_one(name, x1, x2, x3, t1, t2, t3):
    steps = [f"{name}: старт классификации"]
    if x1 >= t1:
        steps.append(f"if X1 >= T1: {x1} >= {t1} — да, проверяем X2")
    else:
        steps.append(f"if X1 >= T1: {x1} >= {t1} — нет")
        steps.append("else -> Не подходит")
        return "Не подходит", steps

    if x2 >= t2:
        steps.append(f"if X2 >= T2: {x2} >= {t2} — да, проверяем X3")
    else:
        steps.append(f"if X2 >= T2: {x2} >= {t2} — нет")
        steps.append("else -> Подходит условно")
        return "Подходит условно", steps

    if x3 >= t3:
        steps.append(f"if X3 >= T3: {x3} >= {t3} — да")
        steps.append("then -> Подходит")
        return "Подходит", steps

    steps.append(f"if X3 >= T3: {x3} >= {t3} — нет")
    steps.append("else -> Подходит условно")
    return "Подходит условно", steps


def _summary(results):
    counts = {"Подходит": 0, "Подходит условно": 0, "Не подходит": 0}
    for item in results:
        counts[item["verdict"]] += 1
    return counts


def _score(value, label):
    number = _number(value, label)
    if number < 0 or number > 100:
        raise ValueError(f"{label} должно быть в диапазоне 0–100")
    return number


def _number(value, label):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label}: некорректное число")
