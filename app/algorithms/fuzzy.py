"""Calculations for fuzzy sets and fuzzy relation composition."""

from math import sqrt


def run_task1(payload):
    concept = str(payload.get("concept") or "Понятие")
    terms = payload.get("terms") or ["малый", "средний", "большой"]
    if len(terms) != 3:
        raise ValueError("Нужно указать три терма")

    x_min = _to_float(payload.get("x_min"), "x_min")
    x_max = _to_float(payload.get("x_max"), "x_max")
    step = _to_float(payload.get("step"), "step")
    x0 = _to_float(payload.get("x0"), "x0")
    if x_min >= x_max:
        raise ValueError("x_min должен быть меньше x_max")
    if step <= 0:
        raise ValueError("Шаг должен быть положительным")

    points = _build_points(x_min, x_max, step)
    if len(points) < 5 or len(points) > 50:
        raise ValueError("Количество точек дискретизации должно быть от 5 до 50")

    params = payload.get("params") or {}
    a1 = params.get("a1") or {}
    a2 = params.get("a2") or {}
    a3 = params.get("a3") or {}

    a1_a = _to_float(a1.get("a"), "A1.a")
    a1_c = _to_float(a1.get("c"), "A1.c")
    a2_a = _to_float(a2.get("a"), "A2.a")
    a2_b = _to_float(a2.get("b"), "A2.b")
    a2_c = _to_float(a2.get("c"), "A2.c")
    a2_d = _to_float(a2.get("d"), "A2.d")
    a3_a = _to_float(a3.get("a"), "A3.a")
    a3_c = _to_float(a3.get("c"), "A3.c")
    if not (a1_a < a1_c and a2_a < a2_b <= a2_c < a2_d and a3_a < a3_c):
        raise ValueError("Проверьте порядок параметров: A1 a<c, A2 a<b<=c<d, A3 a<c")

    rows = []
    operations = []
    for x in points:
        m1 = _z_shape(x, a1_a, a1_c)
        m2 = _trapezoid(x, a2_a, a2_b, a2_c, a2_d)
        m3 = _s_shape(x, a3_a, a3_c)
        very = m2 * m2
        fairly = sqrt(m2)
        rows.append({
            "x": x,
            "a1": _round(m1),
            "a2": _round(m2),
            "a3": _round(m3),
            "a2_very": _round(very),
            "a2_fairly": _round(fairly),
        })
        operations.append({
            "x": x,
            "not_a1": _round(1 - m1),
            "t_min": _round(min(m1, m2)),
            "t_prod": _round(m1 * m2),
            "t_bounded": _round(max(0, m1 + m2 - 1)),
            "t_drastic": _round(_t_drastic(m1, m2)),
            "s_max": _round(max(m1, m2)),
            "s_sum": _round(m1 + m2 - m1 * m2),
            "s_bounded": _round(min(m1 + m2, 1)),
            "s_drastic": _round(_s_drastic(m1, m2)),
        })

    return {
        "concept": concept,
        "terms": terms,
        "points_count": len(points),
        "values": rows,
        "x0_values": {
            "x": x0,
            "a1": _round(_z_shape(x0, a1_a, a1_c)),
            "a2": _round(_trapezoid(x0, a2_a, a2_b, a2_c, a2_d)),
            "a3": _round(_s_shape(x0, a3_a, a3_c)),
        },
        "a2_properties": {
            "support": [_round(a2_a), _round(a2_d)],
            "support_label": f"({_round(a2_a)}, {_round(a2_d)})",
            "core": [_round(a2_b), _round(a2_c)],
            "transition_points": [_round((a2_a + a2_b) / 2), _round((a2_c + a2_d) / 2)],
        },
        "operations": operations,
    }


def run_task2(payload):
    candidates = _clean_names(payload.get("candidates"), "X", 1, 10)
    characteristics = _clean_names(payload.get("characteristics"), "Y", 1, 10)
    specialties = _clean_names(payload.get("specialties"), "Z", 1, 10)
    r1 = _matrix(payload.get("R1"), len(characteristics), len(specialties), "R1")
    r2 = _matrix(payload.get("R2"), len(characteristics), len(candidates), "R2")

    max_min, min_steps = _compose(candidates, characteristics, specialties, r1, r2, "min")
    max_prod, prod_steps = _compose(candidates, characteristics, specialties, r1, r2, "prod")

    return {
        "max_min": {"matrix": max_min, "steps": min_steps},
        "max_prod": {"matrix": max_prod, "steps": prod_steps},
        "best_match": {
            "max_min": _best(candidates, specialties, max_min),
            "max_prod": _best(candidates, specialties, max_prod),
        },
    }


def _compose(candidates, characteristics, specialties, r1, r2, method):
    matrix = []
    steps = []
    for i, candidate in enumerate(candidates):
        row = []
        for j, specialty in enumerate(specialties):
            parts = []
            for h, characteristic in enumerate(characteristics):
                left = r2[h][i]
                right = r1[h][j]
                value = min(left, right) if method == "min" else left * right
                parts.append({
                    "characteristic": characteristic,
                    "r2": _round(left),
                    "r1": _round(right),
                    "value": _round(value),
                })
            result = max(part["value"] for part in parts)
            row.append(_round(result))
            steps.append({
                "candidate": candidate,
                "specialty": specialty,
                "method": "max-min" if method == "min" else "max-prod",
                "parts": parts,
                "result": _round(result),
            })
        matrix.append(row)
    return matrix, steps


def _best(candidates, specialties, matrix):
    rows = []
    for j, specialty in enumerate(specialties):
        best_i = max(range(len(candidates)), key=lambda i: matrix[i][j])
        rows.append({
            "specialty": specialty,
            "candidate": candidates[best_i],
            "value": matrix[best_i][j],
        })
    return rows


def _build_points(x_min, x_max, step):
    points = []
    x = x_min
    guard = 0
    while x <= x_max + step * 1e-9 and guard < 1000:
        points.append(_round(x))
        x += step
        guard += 1
    if points[-1] < x_max and abs(points[-1] - x_max) > 1e-9:
        points.append(_round(x_max))
    return points


def _z_shape(x, a, c):
    if x <= a:
        return 1.0
    if x >= c:
        return 0.0
    return (c - x) / (c - a)


def _s_shape(x, a, c):
    if x <= a:
        return 0.0
    if x >= c:
        return 1.0
    return (x - a) / (c - a)


def _trapezoid(x, a, b, c, d):
    if x <= a or x >= d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if a < x < b:
        return (x - a) / (b - a)
    return (d - x) / (d - c)


def _t_drastic(a, b):
    if _is_one(b):
        return a
    if _is_one(a):
        return b
    return 0.0


def _s_drastic(a, b):
    if _is_zero(b):
        return a
    if _is_zero(a):
        return b
    return 1.0


def _matrix(value, rows, cols, name):
    if not isinstance(value, list) or len(value) != rows:
        raise ValueError(f"{name} должна иметь размер {rows}x{cols}")
    result = []
    for i, row in enumerate(value):
        if not isinstance(row, list) or len(row) != cols:
            raise ValueError(f"{name} должна иметь размер {rows}x{cols}")
        result_row = []
        for j, cell in enumerate(row):
            number = _to_float(cell, f"{name}[{i + 1},{j + 1}]")
            if number < 0 or number > 1:
                raise ValueError(f"{name}[{i + 1},{j + 1}] должно быть в диапазоне [0,1]")
            result_row.append(number)
        result.append(result_row)
    return result


def _clean_names(value, prefix, min_len, max_len):
    if not isinstance(value, list) or not (min_len <= len(value) <= max_len):
        raise ValueError(f"{prefix}: количество элементов должно быть от {min_len} до {max_len}")
    return [str(item).strip() or f"{prefix}{i + 1}" for i, item in enumerate(value)]


def _to_float(value, label):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label}: некорректное число")


def _round(value):
    return round(float(value), 4)


def _is_one(value):
    return abs(value - 1.0) < 1e-9


def _is_zero(value):
    return abs(value) < 1e-9


def _run_methodical_self_check():
    characteristics = [f"y{i}" for i in range(1, 11)]
    r1_manager = [0.9, 0.9, 0.8, 0.4, 0.5, 0.3, 0.6, 0.2, 0.9, 0.8]
    r2_petrov = [0.9, 0.6, 0.5, 0.5, 1.0, 0.4, 0.5, 0.5, 0.8, 0.3]
    matrix, _ = _compose(
        ["Петров"],
        characteristics,
        ["Менеджер"],
        [[value] for value in r1_manager],
        [[value] for value in r2_petrov],
        "min",
    )
    if matrix[0][0] != 0.9:
        raise RuntimeError("Fuzzy max-min self-check failed: μ(Петров, Менеджер) must be 0.9")


_run_methodical_self_check()
