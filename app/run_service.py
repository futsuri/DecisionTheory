"""
run_service.py — Логика запуска:
  • валидация входных данных
  • диспатч на нужный алгоритм
  • сохранение run и report в MongoDB
"""
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
        "available": False,
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
        update_doc("runs", {"_id": run_obj_id}, {
            "status": "done",
            "result": result,
            "updated_at": utc_now(),
        })

        report = build_report(run_id, algorithm_id, normalized_input, result)
        report_doc = {
            "run_id": run_id,
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
    return input_data


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


def _dispatch(algorithm_id, payload):
    if algorithm_id == "ahp":
        return run_ahp(payload)
    if algorithm_id == "multi_criteria":
        try:
            return run_multi_criteria(payload)
        except NotImplementedError as exc:
            raise ValueError("Multi-criteria algorithm is not implemented yet") from exc
    raise ValueError(f"No dispatcher for algorithm '{algorithm_id}'")
