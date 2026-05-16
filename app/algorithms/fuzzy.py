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
        "recommendations": _recommendations(candidates, specialties, max_min, max_prod),
    }


def run_inference(payload):
    candidate_name = str(payload.get("candidate_name") or "Кандидат")
    input_vars = payload.get("input_vars") or []
    output_var = payload.get("output_var") or _default_output_var()
    rules = payload.get("rules") or []
    crisp_values = payload.get("crisp_values") or {}

    if not isinstance(input_vars, list) or not (2 <= len(input_vars) <= 10):
        raise ValueError("Нужно задать от 2 до 10 входных лингвистических переменных")
    if not isinstance(rules, list) or not (3 <= len(rules) <= 20):
        raise ValueError("База правил должна содержать от 3 до 20 правил")

    variables = [_validate_linguistic_var(item, f"Вход {i + 1}") for i, item in enumerate(input_vars)]
    output = _validate_linguistic_var(output_var, "Выход")
    if output["min"] != 0 or output["max"] != 100:
        raise ValueError("Выходная переменная должна иметь диапазон [0, 100]")

    variable_names = {item["name"] for item in variables}
    output_terms = {term["name"] for term in output["terms"]}
    values = {}
    for var in variables:
        value = _to_float(crisp_values.get(var["name"]), var["name"])
        if value < var["min"] or value > var["max"]:
            raise ValueError(f"{var['name']}: значение должно быть в диапазоне [{var['min']}, {var['max']}]")
        values[var["name"]] = value

    fuzzification = {}
    for var in variables:
        fuzzification[var["name"]] = {
            term["name"]: _round(_membership(values[var["name"]], term))
            for term in var["terms"]
        }

    points = [_round(output["min"] + i * (output["max"] - output["min"]) / 200) for i in range(201)]
    aggregated = [0.0 for _ in points]
    rule_results = []

    for index, rule in enumerate(rules, start=1):
        antecedents = rule.get("antecedents") or []
        consequent_term = str(rule.get("consequent_term") or "").strip()
        if not antecedents:
            raise ValueError(f"Правило {index}: нужно указать хотя бы одно условие")
        if consequent_term not in output_terms:
            raise ValueError(f"Правило {index}: неизвестный терм вывода '{consequent_term}'")

        memberships = []
        normalized_antecedents = []
        for antecedent in antecedents:
            var_name = str(antecedent.get("var_name") or "").strip()
            term_name = str(antecedent.get("term") or "").strip()
            if var_name not in variable_names:
                raise ValueError(f"Правило {index}: неизвестная переменная '{var_name}'")
            if term_name not in fuzzification[var_name]:
                raise ValueError(f"Правило {index}: неизвестный терм '{term_name}' для '{var_name}'")
            memberships.append(fuzzification[var_name][term_name])
            normalized_antecedents.append({"var_name": var_name, "term": term_name, "mu": fuzzification[var_name][term_name]})

        strength = min(memberships) if memberships else 0.0
        consequent = next(term for term in output["terms"] if term["name"] == consequent_term)
        clipped = [_round(min(strength, _membership(x, consequent))) for x in points]
        aggregated = [max(current, clipped_value) for current, clipped_value in zip(aggregated, clipped)]
        rule_results.append({
            "index": index,
            "antecedents": normalized_antecedents,
            "consequent_term": consequent_term,
            "strength": _round(strength),
            "clipped_mu": clipped,
        })

    denominator = sum(aggregated)
    defuzzified = sum(x * mu for x, mu in zip(points, aggregated)) / denominator if denominator else 0.0
    interpretation = _interpret_output(defuzzified, output)

    return {
        "candidate_name": candidate_name,
        "input_vars": variables,
        "output_var": output,
        "crisp_values": values,
        "fuzzification": fuzzification,
        "rule_results": rule_results,
        "aggregated": {
            "points": points,
            "mu": [_round(value) for value in aggregated],
        },
        "defuzzified": _round(defuzzified),
        "interpretation": interpretation,
        "steps": {
            "formula": "x̄ = Σ xᵢ·μ(xᵢ) / Σ μ(xᵢ)",
            "numerator": _round(sum(x * mu for x, mu in zip(points, aggregated))),
            "denominator": _round(denominator),
            "points_count": len(points),
            "rules_count": len(rules),
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


def _recommendations(candidates, specialties, max_min, max_prod):
    rows = []
    for j, specialty in enumerate(specialties):
        min_rank = _rank_for_specialty(candidates, max_min, j)
        prod_rank = _rank_for_specialty(candidates, max_prod, j)
        min_best = min_rank[0]
        prod_best = prod_rank[0]
        agreed = min_best["candidate"] == prod_best["candidate"]

        recommended = min_best if agreed else _combined_winner(candidates, max_min, max_prod, j)
        min_margin = _round(min_best["value"] - min_rank[1]["value"]) if len(min_rank) > 1 else min_best["value"]
        prod_margin = _round(prod_best["value"] - prod_rank[1]["value"]) if len(prod_rank) > 1 else prod_best["value"]
        confidence = _confidence_label(agreed, min_margin, prod_margin)

        if agreed:
            explanation = (
                f"Обе композиции выбрали {recommended['candidate']}: "
                f"max-min={_round(min_best['value'])}, max-prod={_round(prod_best['value'])}. "
                f"Отрыв от ближайшей альтернативы: max-min={min_margin}, max-prod={prod_margin}."
            )
        else:
            explanation = (
                f"Методы дали разные первые места ({min_best['candidate']} и {prod_best['candidate']}); "
                f"по среднему значению двух композиций предпочтительнее {recommended['candidate']}."
            )

        rows.append({
            "specialty": specialty,
            "recommended_candidate": recommended["candidate"],
            "confidence": confidence,
            "max_min_candidate": min_best["candidate"],
            "max_min_value": _round(min_best["value"]),
            "max_min_margin": min_margin,
            "max_prod_candidate": prod_best["candidate"],
            "max_prod_value": _round(prod_best["value"]),
            "max_prod_margin": prod_margin,
            "methods_agree": agreed,
            "explanation": explanation,
        })
    return rows


def _rank_for_specialty(candidates, matrix, specialty_index):
    rows = []
    for i, candidate in enumerate(candidates):
        rows.append({
            "candidate": candidate,
            "value": matrix[i][specialty_index],
        })
    return sorted(rows, key=lambda item: item["value"], reverse=True)


def _combined_winner(candidates, max_min, max_prod, specialty_index):
    best = None
    for i, candidate in enumerate(candidates):
        value = _round((max_min[i][specialty_index] + max_prod[i][specialty_index]) / 2)
        if best is None or value > best["value"]:
            best = {"candidate": candidate, "value": value}
    return best


def _confidence_label(agreed, min_margin, prod_margin):
    if agreed and min_margin >= 0.15 and prod_margin >= 0.15:
        return "уверенный выбор"
    if agreed:
        return "согласованный выбор"
    return "требует экспертной проверки"


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


def _validate_linguistic_var(value, label):
    if not isinstance(value, dict):
        raise ValueError(f"{label}: ожидается объект переменной")
    name = str(value.get("name") or label).strip()
    x_min = _to_float(value.get("min"), f"{name}.min")
    x_max = _to_float(value.get("max"), f"{name}.max")
    if x_min >= x_max:
        raise ValueError(f"{name}: min должен быть меньше max")
    terms = value.get("terms") or []
    if not isinstance(terms, list) or len(terms) != 3:
        raise ValueError(f"{name}: нужно задать ровно 3 терма")
    clean_terms = [_validate_term(term, name) for term in terms]
    return {"name": name, "min": x_min, "max": x_max, "terms": clean_terms}


def _validate_term(value, var_name):
    if not isinstance(value, dict):
        raise ValueError(f"{var_name}: терм должен быть объектом")
    name = str(value.get("name") or "").strip()
    mf_type = str(value.get("type") or "tri").strip()
    params = value.get("params") or []
    if not name:
        raise ValueError(f"{var_name}: у терма должно быть название")
    if mf_type not in ("tri", "trap"):
        raise ValueError(f"{var_name}.{name}: тип должен быть tri или trap")
    expected = 3 if mf_type == "tri" else 4
    if not isinstance(params, list) or len(params) != expected:
        raise ValueError(f"{var_name}.{name}: нужно {expected} параметра")
    clean_params = [_to_float(item, f"{var_name}.{name}.p{i + 1}") for i, item in enumerate(params)]
    if any(clean_params[i] > clean_params[i + 1] for i in range(len(clean_params) - 1)):
        raise ValueError(f"{var_name}.{name}: параметры должны идти по возрастанию")
    return {"name": name, "type": mf_type, "params": clean_params}


def _membership(x, term):
    params = term["params"]
    if term["type"] == "tri":
        return _triangular(x, params[0], params[1], params[2])
    return _trapezoid_mf(x, params[0], params[1], params[2], params[3])


def _triangular(x, a, b, c):
    if x <= a or x >= c:
        return 1.0 if (a == b and x == a) or (b == c and x == c) else 0.0
    if x == b:
        return 1.0
    if x < b:
        return (x - a) / (b - a) if b != a else 1.0
    return (c - x) / (c - b) if c != b else 1.0


def _trapezoid_mf(x, a, b, c, d):
    if x < a or x > d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if a <= x < b:
        return (x - a) / (b - a) if b != a else 1.0
    if c < x <= d:
        return (d - x) / (d - c) if d != c else 1.0
    return 0.0


def _default_output_var():
    return {
        "name": "Пригодность кандидата",
        "min": 0,
        "max": 100,
        "terms": [
            {"name": "Низкий", "type": "trap", "params": [0, 0, 30, 45]},
            {"name": "Средний", "type": "tri", "params": [35, 55, 75]},
            {"name": "Высокий", "type": "trap", "params": [65, 85, 100, 100]},
        ],
    }


def _interpret_output(value, output):
    memberships = [(term["name"], _membership(value, term)) for term in output["terms"]]
    best_name, _ = max(memberships, key=lambda item: item[1])
    labels = {
        "Низкий": "Низкая пригодность",
        "Средний": "Средняя пригодность",
        "Высокий": "Высокая пригодность",
    }
    return labels.get(best_name, f"{best_name} пригодность")


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
