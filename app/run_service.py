"""
run_service.py — Логика запуска:
  • валидация входных данных
  • диспатч на нужный алгоритм
  • сохранение run и report в MongoDB
"""
import numpy as np
from bson.objectid import ObjectId
from flask import current_app

from app.algorithms.ahp import run_ahp
from app.algorithms.multi_criteria import run_multi_criteria
from app.db import get_db, insert_doc, update_doc
from app.reporter import build_report
from app.utils import (
    utc_now,
    validate_ahp_payload,
    validate_method,
    validate_multi_criteria_payload,
    validate_payload,
)


ALGORITHMS = [
    {
        "id": "ahp",
        "name": "Метод анализа иерархий (AHP)",
        "description": "Попарные сравнения критериев и альтернатив с проверкой согласованности.",
        "input_schema": {
            "criteria": "list[str]",
            "alternatives": "list[str]",
            "matrix": "list[list[float]]",
            "alt_matrices": "dict[str, list[list[float]]]",
        },
        "available": True,
    },
    {
        "id": "multi_criteria",
        "name": "Многокритериальная оптимизация",
        "description": "Непрерывные данные и функции полезности для критериев.",
        "input_schema": {
            "criteria": "list[{name, weight, func_type, direction, params}]",
            "constraints": "dict[str, {min, max}]",
            "main_criterion": "str|None",
        },
        "available": True,
    },
]


def list_algorithms():
    return ALGORITHMS


def create_run(algorithm_id, input_data):
    """Создаёт run, запускает алгоритм, сохраняет отчёт и возвращает run_id."""
    input_data = validate_payload(input_data)
    algorithm_id = validate_method(algorithm_id, current_app.config["ALLOWED_METHODS"])

    normalized_input = _normalize_input(algorithm_id, input_data)
    _validate_for_algorithm(algorithm_id, normalized_input)

    now = utc_now()
    run_doc = {
        "algorithm_id": algorithm_id,
        "input": normalized_input,
        "status": "running",
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }

    run_id = insert_doc("runs", run_doc)
    run_obj_id = ObjectId(run_id)

    try:
        result = _dispatch(algorithm_id, normalized_input)
        result = _sanitize_result(result)
        update_doc("runs", {"_id": run_obj_id}, {
            "status": "done",
            "result": result,
            "updated_at": utc_now(),
        })

        report = build_report(run_id, algorithm_id, normalized_input, result)
        report_doc = {
            "run_id": run_id,
            "algorithm_id": algorithm_id,
            "report": report,
            "created_at": utc_now(),
            "updated_at": utc_now(),
        }
        insert_doc("reports", report_doc)
    except Exception as exc:
        update_doc("runs", {"_id": run_obj_id}, {
            "status": "error",
            "error": str(exc),
            "updated_at": utc_now(),
        })
        raise

    return run_id


def get_run(run_id):
    db = get_db()
    try:
        obj_id = ObjectId(run_id)
    except Exception:
        return None
    return db.runs.find_one({"_id": obj_id})


def _normalize_input(algorithm_id, input_data):
    if algorithm_id == "ahp":
        return _normalize_ahp_input(input_data)
    if algorithm_id == "multi_criteria":
        return _normalize_multi_criteria_input(input_data)
    return input_data


def _sanitize_result(obj):
    """Рекурсивно конвертирует numpy-типы в нативные Python-типы.

    scipy возвращает numpy.bool_, numpy.float64 и т.д., которые
    BSON-энкодер pymongo не умеет сериализовать. Эта функция
    обходит весь результат и приводит всё к int/float/bool/str/list/dict.
    """
    if isinstance(obj, dict):
        return {k: _sanitize_result(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_result(v) for v in obj]
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def _normalize_ahp_input(input_data):
    if "criteria" in input_data:
        criteria = input_data.get("criteria", [])
    else:
        criteria = input_data.get("criteria_names", [])

    if "alternatives" in input_data:
        alternatives = input_data.get("alternatives", [])
    else:
        alternatives = input_data.get("alternatives_names", [])

    matrix = input_data.get("matrix") or input_data.get("criteria_matrix")
    alt_matrices = input_data.get("alt_matrices")
    alt_matrices_list = input_data.get("alternative_matrices")

    if alt_matrices is None and isinstance(alt_matrices_list, list):
        alt_matrices = {}
        for idx, crit in enumerate(criteria):
            if idx < len(alt_matrices_list):
                alt_matrices[crit] = alt_matrices_list[idx]

    normalized_matrix = _sanitize_pairwise_matrix(matrix)

    normalized_alt_matrices = {}
    for name, mtx in (alt_matrices or {}).items():
        normalized_alt_matrices[name] = _sanitize_pairwise_matrix(mtx)

    return {
        "criteria": criteria,
        "alternatives": alternatives,
        "matrix": normalized_matrix,
        "alt_matrices": normalized_alt_matrices,
    }


def _normalize_multi_criteria_input(input_data):
    """Приведение входных данных multi_criteria к каноническому виду."""
    criteria = input_data.get("criteria", [])
    constraints = input_data.get("constraints", {})
    main_criterion = input_data.get("main_criterion")
    variable_bounds = input_data.get("variable_bounds", [])

    # Привести variable_bounds к списку кортежей
    normalized_bounds = []
    for b in variable_bounds:
        if isinstance(b, (list, tuple)) and len(b) == 2:
            normalized_bounds.append([float(b[0]), float(b[1])])
        else:
            normalized_bounds.append([0.0, 100.0])

    # Привести коэффициенты в params.coeffs к float
    normalized_criteria = []
    for c in criteria:
        nc = dict(c)
        params = nc.get("params", {})
        if "coeffs" in params:
            params["coeffs"] = [float(v) for v in params["coeffs"]]
        nc["params"] = params
        # Гарантировать наличие name
        if "name" not in nc or not nc["name"]:
            nc["name"] = f"criterion_{len(normalized_criteria) + 1}"
        # Гарантировать direction
        if nc.get("direction") not in ("min", "max"):
            nc["direction"] = "max"
        # Гарантировать func_type
        allowed_funcs = {"linear", "quadratic", "exponential", "logarithmic"}
        if nc.get("func_type") not in allowed_funcs:
            nc["func_type"] = "linear"
        normalized_criteria.append(nc)

    # Привести constraints к нормальному виду
    normalized_constraints = {}
    for name, value in constraints.items():
        if isinstance(value, dict):
            entry = {}
            if "min" in value and value["min"] is not None:
                entry["min"] = float(value["min"])
            if "max" in value and value["max"] is not None:
                entry["max"] = float(value["max"])
            if entry:
                normalized_constraints[name] = entry

    return {
        "criteria": normalized_criteria,
        "constraints": normalized_constraints,
        "main_criterion": main_criterion,
        "variable_bounds": normalized_bounds,
    }


def _sanitize_pairwise_matrix(matrix, precision=10):
    if not isinstance(matrix, list) or not matrix:
        return matrix

    size = len(matrix)
    sanitized = [[1.0 for _ in range(size)] for _ in range(size)]

    for i in range(size):
        for j in range(size):
            if i == j:
                sanitized[i][j] = 1.0
                continue
            if i < j:
                try:
                    value = float(matrix[i][j])
                except Exception:
                    value = 1.0
                if value <= 0:
                    value = 1.0
                sanitized[i][j] = round(value, precision)
                sanitized[j][i] = round(1.0 / value, precision)

    return sanitized


def _validate_for_algorithm(algorithm_id, payload):
    validators = {
        "ahp": validate_ahp_payload,
        "multi_criteria": validate_multi_criteria_payload,
    }
    validator = validators.get(algorithm_id)
    if validator:
        validator(payload)

    if algorithm_id == "ahp":
        _validate_ahp_alt_matrices(payload)
        _validate_ahp_reciprocity(payload)

    if algorithm_id == "multi_criteria":
        _validate_multi_criteria_deep(payload)


def _validate_ahp_alt_matrices(payload):
    criteria = payload.get("criteria") or []
    alternatives = payload.get("alternatives") or []
    alt_matrices = payload.get("alt_matrices") or {}

    if not criteria or not alternatives:
        return

    missing = [name for name in criteria if name not in alt_matrices]
    if missing:
        raise ValueError(
            f"AHP: 'alt_matrices' missing matrices for criteria: {', '.join(missing)}"
        )

    expected = len(alternatives)
    for name, matrix in alt_matrices.items():
        if not isinstance(matrix, list) or len(matrix) != expected:
            raise ValueError(
                f"AHP: alternative matrix for '{name}' must be {expected}x{expected}"
            )
        if any(not isinstance(row, list) or len(row) != expected for row in matrix):
            raise ValueError(
                f"AHP: alternative matrix for '{name}' must be {expected}x{expected}"
            )


def _validate_ahp_reciprocity(payload):
    criteria = payload.get("criteria") or []
    alternatives = payload.get("alternatives") or []
    criteria_matrix = payload.get("matrix") or []
    alt_matrices = payload.get("alt_matrices") or {}

    if criteria_matrix:
        _check_matrix_reciprocity(
            criteria_matrix,
            "criteria",
            criteria,
            criteria,
        )

    for crit_name, matrix in alt_matrices.items():
        _check_matrix_reciprocity(
            matrix,
            f"alternatives for criterion '{crit_name}'",
            alternatives,
            alternatives,
        )


def _check_matrix_reciprocity(matrix, table_label, row_labels, col_labels, tol=1e-4):
    size = len(matrix)
    for i in range(size):
        for j in range(i + 1, size):
            try:
                a = float(matrix[i][j])
                b = float(matrix[j][i])
            except Exception:
                raise ValueError(
                    f"AHP: некорректное число в таблице '{table_label}' в ячейке [{i + 1},{j + 1}]"
                )

            if a <= 0 or b <= 0:
                raise ValueError(
                    f"AHP: неположительное значение в таблице '{table_label}' в ячейке [{i + 1},{j + 1}]"
                )

            expected = 1.0 / a
            expected_rounded = round(expected, 4)
            actual_rounded = round(b, 4)
            if abs(actual_rounded - expected_rounded) > tol:
                row_name = row_labels[i] if i < len(row_labels) else str(i + 1)
                col_name = col_labels[j] if j < len(col_labels) else str(j + 1)
                raise ValueError(
                    "AHP: нарушено свойство взаимности в таблице '{table}' для "
                    "пары [{row},{col}]. Значение {a} предполагает, что "
                    "[{col},{row}] должно быть {expected}, но получено {b}."
                    .format(
                        table=table_label,
                        row=row_name,
                        col=col_name,
                        a=a,
                        b=actual_rounded,
                        expected=expected_rounded,
                    )
                )


def _validate_multi_criteria_deep(payload):
    """Глубокая валидация для многокритериальной оптимизации."""
    criteria = payload.get("criteria", [])
    constraints = payload.get("constraints", {})
    main_criterion = payload.get("main_criterion")
    variable_bounds = payload.get("variable_bounds", [])

    # --- variable_bounds ---
    if not variable_bounds:
        raise ValueError("MultiCriteria: 'variable_bounds' обязателен (список пар [min, max])")

    if len(variable_bounds) > 5:
        raise ValueError("MultiCriteria: размерность (variable_bounds) не должна превышать 5")

    for i, b in enumerate(variable_bounds):
        if not isinstance(b, (list, tuple)) or len(b) != 2:
            raise ValueError(f"MultiCriteria: variable_bounds[{i}] должен быть парой [min, max]")
        lb, ub = b
        if lb >= ub:
            raise ValueError(
                f"MultiCriteria: variable_bounds[{i}]: min ({lb}) должен быть меньше max ({ub})"
            )

    dim = len(variable_bounds)

    # --- criteria ---
    if not criteria or len(criteria) < 1:
        raise ValueError("MultiCriteria: необходим хотя бы один критерий")

    if len(criteria) > 3:
        raise ValueError("MultiCriteria: количество критериев не должно превышать 3")

    crit_names = set()
    for i, c in enumerate(criteria):
        name = c.get("name", "")
        if not name:
            raise ValueError(f"MultiCriteria: criteria[{i}] — отсутствует 'name'")
        if name in crit_names:
            raise ValueError(f"MultiCriteria: дублирующееся имя критерия '{name}'")
        crit_names.add(name)

        # Проверка coeffs
        params = c.get("params", {})
        coeffs = params.get("coeffs", [])
        if not isinstance(coeffs, list) or len(coeffs) == 0:
            raise ValueError(
                f"MultiCriteria: criteria[{i}] ('{name}') — 'params.coeffs' должен быть непустым списком"
            )
        for j, v in enumerate(coeffs):
            try:
                float(v)
            except (TypeError, ValueError):
                raise ValueError(
                    f"MultiCriteria: criteria[{i}].params.coeffs[{j}] — некорректное число"
                )

    # --- main_criterion ---
    if main_criterion is not None:
        if main_criterion not in crit_names:
            raise ValueError(
                f"MultiCriteria: main_criterion '{main_criterion}' не найден среди критериев "
                f"({', '.join(sorted(crit_names))})"
            )

    # --- constraints ---
    for name, cons in constraints.items():
        if name not in crit_names:
            raise ValueError(
                f"MultiCriteria: ограничение для неизвестного критерия '{name}'"
            )
        if not isinstance(cons, dict):
            raise ValueError(
                f"MultiCriteria: ограничение для '{name}' должно быть объектом с min/max"
            )


def _dispatch(algorithm_id, payload):
    if algorithm_id == "ahp":
        return run_ahp(payload)
    if algorithm_id == "multi_criteria":
        return run_multi_criteria(payload)
    raise ValueError(f"No dispatcher for algorithm '{algorithm_id}'")
