"""Fuzzy sets algorithm: membership functions, fuzzification and verdict."""


def triangular_membership(x, points):
    """Calculate triangular membership by three points [a, b, c]."""
    a, b, c = points
    if a > b or b > c:
        raise ValueError("Triangle points must satisfy a <= b <= c")

    if x <= a or x >= c:
        return 0.0
    if x == b:
        return 1.0
    if a < x < b:
        return _safe_ratio(x - a, b - a)
    return _safe_ratio(c - x, c - b)


def trapezoidal_membership(x, points):
    """Calculate trapezoidal membership by four points [a, b, c, d]."""
    a, b, c, d = points
    if a > b or b > c or c > d:
        raise ValueError("Trapezoid points must satisfy a <= b <= c <= d")

    if b <= x <= c:
        return 1.0
    if x <= a or x >= d:
        return 0.0
    if a < x < b:
        return _safe_ratio(x - a, b - a)
    return _safe_ratio(d - x, d - c)


def run_fuzzy_sets(payload):
    variable_name = payload.get("variable_name") or "Переменная"
    current_value = float(payload.get("x"))
    terms = payload.get("terms") or []
    scale = payload.get("scale") or {}
    scale_min = float(scale.get("min", 0))
    scale_max = float(scale.get("max", 100))

    memberships = []
    for term in terms:
        name = term.get("name") or "Терм"
        function_type = term.get("function_type")
        points = [float(value) for value in (term.get("points") or [])]

        if function_type == "triangle":
            if len(points) != 3:
                raise ValueError(f"Term '{name}': triangle requires 3 points")
            value = triangular_membership(current_value, points)
        elif function_type == "trapezoid":
            if len(points) != 4:
                raise ValueError(f"Term '{name}': trapezoid requires 4 points")
            value = trapezoidal_membership(current_value, points)
        else:
            raise ValueError(f"Term '{name}': unknown function type '{function_type}'")

        memberships.append({
            "term": name,
            "function_type": function_type,
            "points": points,
            "membership": round(max(0.0, min(1.0, value)), 6),
        })

    verdict = _build_verdict(memberships)

    return {
        "variable_name": variable_name,
        "x": current_value,
        "memberships": memberships,
        "membership_degrees": memberships,
        "verdict": verdict,
        "visualization_data": _build_visualization_data(
            terms=memberships,
            scale_min=scale_min,
            scale_max=scale_max,
            current_value=current_value,
        ),
    }


def _build_visualization_data(terms, scale_min, scale_max, current_value):
    return {
        "x_axis": {
            "min": scale_min,
            "max": scale_max,
        },
        "y_axis": {
            "min": 0.0,
            "max": 1.0,
        },
        "term_lines": [
            {
                "term": term["term"],
                "function_type": term["function_type"],
                "points": _build_term_line_points(term["function_type"], term["points"]),
            }
            for term in terms
        ],
        "current_x_line": {
            "x": current_value,
            "points": [
                [current_value, 0.0],
                [current_value, 1.0],
            ],
        },
    }


def _build_term_line_points(function_type, points):
    if function_type == "triangle":
        a, b, c = points
        return [
            [a, 0.0],
            [b, 1.0],
            [c, 0.0],
        ]

    a, b, c, d = points
    return [
        [a, 0.0],
        [b, 1.0],
        [c, 1.0],
        [d, 0.0],
    ]


def _build_verdict(memberships):
    high = _find_membership(memberships, "высок")
    medium = _find_membership(memberships, "сред")

    if high > 0.7:
        return "Рекомендовано"
    if medium > 0.5:
        return "Требует уточнения"
    return "Отказ"


def _find_membership(memberships, needle):
    for item in memberships:
        if needle in item.get("term", "").lower():
            return float(item.get("membership", 0.0))
    return 0.0


def _safe_ratio(numerator, denominator):
    if denominator == 0:
        return 1.0 if numerator == 0 else 0.0
    return numerator / denominator
