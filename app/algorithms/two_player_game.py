"""
Two-player matrix games.

Features:
- dominance reduction (strict)
- saddle point check (maximin == minimax)
- mixed strategies via linear programming (scipy.optimize.linprog)
- 2x2 analytic solution when possible
- optional bimatrix general-sum Nash equilibria via support enumeration
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy.optimize import linprog


@dataclass
class _DominanceStep:
    kind: str  # "row" or "col"
    removed: str
    by: str
    reason: str


def run_algorithm(input_data: Dict[str, Any]) -> Dict[str, Any]:
    metadata = {
        "algorithm_id": "two_player_game",
        "name": "Two-Player Zero-Sum Matrix Game",
        "description": "Saddle point or mixed strategies with dominance reduction.",
        "version": "1.0.0",
    }

    try:
        parsed = _parse_and_validate(input_data)
        matrix = parsed["payoff_matrix"]
        row_names = parsed["player1_strategies"]
        col_names = parsed["player2_strategies"]

        if not parsed["is_zero_sum"]:
            result = _solve_general_sum_game(parsed)
            report_data = {
                "player1_name": parsed["player1_name"],
                "player2_name": parsed["player2_name"],
                "player1_strategies": parsed["player1_strategies"],
                "player2_strategies": parsed["player2_strategies"],
                "payoff_matrix": parsed["payoff_matrix"].tolist(),
                "player2_payoff_matrix": (
                    parsed["player2_payoff_matrix"].tolist()
                    if parsed["player2_payoff_matrix"] is not None
                    else None
                ),
                "is_zero_sum": parsed["is_zero_sum"],
                "equilibria": result["equilibria"],
                "recommendation": result["recommendation"],
            }
            return {
                "status": "success",
                "result": result,
                "metadata": metadata,
                "report_data": report_data,
            }

        reduced = _reduce_by_dominance(matrix, row_names, col_names)
        red_matrix = reduced["matrix"]
        red_rows = reduced["row_names"]
        red_cols = reduced["col_names"]

        saddle = _find_saddle_point(red_matrix, red_rows, red_cols)

        if saddle["exists"]:
            strategy_probabilities = _pure_strategy_probabilities(
                row_names,
                col_names,
                saddle["player1_strategies"],
                saddle["player2_strategies"],
            )
            result = {
                "is_zero_sum": parsed["is_zero_sum"],
                "game_type": "zero_sum",
                "reduction": reduced["reduction"],
                "reduced_matrix": red_matrix.tolist(),
                "saddle_point": saddle,
                "mixed_strategies": None,
                "strategy_probabilities": strategy_probabilities,
                "value": float(saddle["value"]),
                "optimal_strategies": {
                    "player1": saddle["player1_strategies"],
                    "player2": saddle["player2_strategies"],
                },
            }
        else:
            mixed = _solve_mixed_strategies(red_matrix, red_rows, red_cols)
            strategy_probabilities = _expand_mixed_probabilities(
                mixed,
                row_names,
                col_names,
            )
            result = {
                "is_zero_sum": parsed["is_zero_sum"],
                "game_type": "zero_sum",
                "reduction": reduced["reduction"],
                "reduced_matrix": red_matrix.tolist(),
                "saddle_point": saddle,
                "mixed_strategies": mixed,
                "strategy_probabilities": strategy_probabilities,
                "value": float(mixed["value"]),
                "optimal_strategies": {
                    "player1": mixed["player1"],
                    "player2": mixed["player2"],
                },
            }

        result["recommendation"] = _build_zero_sum_recommendation(result)

        report_data = {
            "player1_name": parsed["player1_name"],
            "player2_name": parsed["player2_name"],
            "player1_strategies": parsed["player1_strategies"],
            "player2_strategies": parsed["player2_strategies"],
            "payoff_matrix": parsed["payoff_matrix"].tolist(),
            "is_zero_sum": parsed["is_zero_sum"],
            "reduction": reduced["reduction"],
            "saddle_point": result["saddle_point"],
            "mixed_strategies": result["mixed_strategies"],
            "strategy_probabilities": result["strategy_probabilities"],
            "recommendation": result["recommendation"],
            "value": result["value"],
        }

        return {
            "status": "success",
            "result": result,
            "metadata": metadata,
            "report_data": report_data,
        }
    except Exception as exc:  # pragma: no cover - defensive for API
        return {
            "status": "error",
            "result": {"error": str(exc)},
            "metadata": metadata,
            "report_data": {},
        }


def _parse_and_validate(input_data: Dict[str, Any]) -> Dict[str, Any]:
    player1_name = str(input_data.get("player1_name", "Player 1"))
    player2_name = str(input_data.get("player2_name", "Player 2"))
    row_names = input_data.get("player1_strategies", [])
    col_names = input_data.get("player2_strategies", [])
    matrix = input_data.get("payoff_matrix", [])
    matrix2 = (
        input_data.get("player2_payoff_matrix")
        or input_data.get("payoff_matrix_player2")
        or input_data.get("payoff_matrix_2")
    )
    is_zero_sum = bool(input_data.get("is_zero_sum", True))

    if not isinstance(row_names, list) or not row_names:
        raise ValueError("'player1_strategies' must be a non-empty list")
    if not isinstance(col_names, list) or not col_names:
        raise ValueError("'player2_strategies' must be a non-empty list")
    if not isinstance(matrix, list) or not matrix:
        raise ValueError("'payoff_matrix' must be a non-empty 2D list")

    m = len(row_names)
    n = len(col_names)

    if len(matrix) != m or any(not isinstance(row, list) or len(row) != n for row in matrix):
        raise ValueError(f"'payoff_matrix' must be {m}x{n}")

    player2_payoff = None
    if matrix2 is not None:
        if not isinstance(matrix2, list) or len(matrix2) != m:
            raise ValueError(f"'player2_payoff_matrix' must be {m}x{n}")
        if any(not isinstance(row, list) or len(row) != n for row in matrix2):
            raise ValueError(f"'player2_payoff_matrix' must be {m}x{n}")
        player2_payoff = np.array(matrix2, dtype=float)

    return {
        "player1_name": player1_name,
        "player2_name": player2_name,
        "player1_strategies": [str(x) for x in row_names],
        "player2_strategies": [str(x) for x in col_names],
        "payoff_matrix": np.array(matrix, dtype=float),
        "player2_payoff_matrix": player2_payoff,
        "is_zero_sum": is_zero_sum,
    }


def _reduce_by_dominance(
    matrix: np.ndarray,
    row_names: List[str],
    col_names: List[str],
    tol: float = 1e-9,
) -> Dict[str, Any]:
    rows = list(range(matrix.shape[0]))
    cols = list(range(matrix.shape[1]))
    steps: List[_DominanceStep] = []

    changed = True
    while changed:
        changed = False

        # Row dominance (player 1 maximizes).
        for i in list(rows):
            if i not in rows:
                continue
            for k in rows:
                if k == i:
                    continue
                row_i = matrix[i, cols]
                row_k = matrix[k, cols]
                if np.all(row_k >= row_i - tol) and np.any(row_k > row_i + tol):
                    steps.append(_DominanceStep(
                        kind="row",
                        removed=row_names[i],
                        by=row_names[k],
                        reason="dominated",
                    ))
                    rows.remove(i)
                    changed = True
                    break
            if changed:
                break

        if changed:
            continue

        # Column dominance (player 2 minimizes).
        for j in list(cols):
            if j not in cols:
                continue
            for k in cols:
                if k == j:
                    continue
                col_j = matrix[rows, j]
                col_k = matrix[rows, k]
                if np.all(col_k <= col_j + tol) and np.any(col_k < col_j - tol):
                    steps.append(_DominanceStep(
                        kind="col",
                        removed=col_names[j],
                        by=col_names[k],
                        reason="dominated",
                    ))
                    cols.remove(j)
                    changed = True
                    break
            if changed:
                break

    reduced_matrix = matrix[np.ix_(rows, cols)]

    return {
        "matrix": reduced_matrix,
        "row_names": [row_names[i] for i in rows],
        "col_names": [col_names[j] for j in cols],
        "row_indices": rows,
        "col_indices": cols,
        "reduction": {
            "steps": [step.__dict__ for step in steps],
            "removed_rows": [s.removed for s in steps if s.kind == "row"],
            "removed_cols": [s.removed for s in steps if s.kind == "col"],
        },
    }


def _find_saddle_point(
    matrix: np.ndarray,
    row_names: List[str],
    col_names: List[str],
    tol: float = 1e-9,
) -> Dict[str, Any]:
    row_mins = matrix.min(axis=1)
    col_maxs = matrix.max(axis=0)

    alpha = float(row_mins.max())
    beta = float(col_maxs.min())

    if abs(alpha - beta) > tol:
        return {
            "exists": False,
            "value": None,
            "player1_strategies": [],
            "player2_strategies": [],
            "points": [],
            "alpha": alpha,
            "beta": beta,
        }

    points = []
    p1 = []
    p2 = []
    for i, row_min in enumerate(row_mins):
        if abs(row_min - alpha) <= tol:
            for j, col_max in enumerate(col_maxs):
                if abs(col_max - beta) <= tol and abs(matrix[i, j] - alpha) <= tol:
                    points.append({
                        "row": row_names[i],
                        "col": col_names[j],
                        "value": float(matrix[i, j]),
                    })
                    p1.append(row_names[i])
                    p2.append(col_names[j])

    return {
        "exists": True,
        "value": alpha,
        "player1_strategies": sorted(set(p1)),
        "player2_strategies": sorted(set(p2)),
        "points": points,
        "alpha": alpha,
        "beta": beta,
    }


def _solve_mixed_strategies(
    matrix: np.ndarray,
    row_names: List[str],
    col_names: List[str],
) -> Dict[str, Any]:
    m, n = matrix.shape

    # Prefer analytic solution for 2x2 games.
    if m == 2 and n == 2:
        analytic = _solve_2x2(matrix, row_names, col_names)
        if analytic is not None:
            return analytic

    p, v1 = _lp_player1(matrix)
    q, v2 = _lp_player2(matrix)

    if p is None or q is None:
        raise ValueError("LP solver failed for mixed strategies")

    value = float(np.dot(p, matrix).dot(q))
    if v1 is not None and v2 is not None:
        value = float((v1 + v2) / 2.0)

    return {
        "value": value,
        "player1": {
            "strategies": row_names,
            "probabilities": [float(x) for x in p],
        },
        "player2": {
            "strategies": col_names,
            "probabilities": [float(x) for x in q],
        },
        "solver": "scipy.optimize.linprog",
    }


def _solve_2x2(
    matrix: np.ndarray,
    row_names: List[str],
    col_names: List[str],
    tol: float = 1e-12,
) -> Optional[Dict[str, Any]]:
    a, b = matrix[0, 0], matrix[0, 1]
    c, d = matrix[1, 0], matrix[1, 1]
    denom = a - b - c + d

    if abs(denom) < tol:
        return None

    p = (d - c) / denom
    q = (d - b) / denom

    if not (0.0 <= p <= 1.0 and 0.0 <= q <= 1.0):
        return None

    p_vec = np.array([p, 1.0 - p], dtype=float)
    q_vec = np.array([q, 1.0 - q], dtype=float)
    value = float(np.dot(p_vec, matrix).dot(q_vec))

    return {
        "value": value,
        "player1": {
            "strategies": row_names,
            "probabilities": [float(p_vec[0]), float(p_vec[1])],
        },
        "player2": {
            "strategies": col_names,
            "probabilities": [float(q_vec[0]), float(q_vec[1])],
        },
        "solver": "analytic_2x2",
    }


def _lp_player1(matrix: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[float]]:
    m, n = matrix.shape
    c = np.array([0.0] * m + [-1.0], dtype=float)

    A_ub = []
    b_ub = []
    for j in range(n):
        coeffs = [-matrix[i, j] for i in range(m)] + [1.0]
        A_ub.append(coeffs)
        b_ub.append(0.0)

    A_eq = [[1.0] * m + [0.0]]
    b_eq = [1.0]

    bounds = [(0.0, None)] * m + [(None, None)]

    res = linprog(
        c=c,
        A_ub=np.array(A_ub, dtype=float),
        b_ub=np.array(b_ub, dtype=float),
        A_eq=np.array(A_eq, dtype=float),
        b_eq=np.array(b_eq, dtype=float),
        bounds=bounds,
        method="highs",
    )
    if not res.success:
        return None, None

    p = np.array(res.x[:-1], dtype=float)
    v = float(res.x[-1])
    return p, v


def _lp_player2(matrix: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[float]]:
    m, n = matrix.shape
    c = np.array([0.0] * n + [1.0], dtype=float)

    A_ub = []
    b_ub = []
    for i in range(m):
        coeffs = [matrix[i, j] for j in range(n)] + [-1.0]
        A_ub.append(coeffs)
        b_ub.append(0.0)

    A_eq = [[1.0] * n + [0.0]]
    b_eq = [1.0]

    bounds = [(0.0, None)] * n + [(None, None)]

    res = linprog(
        c=c,
        A_ub=np.array(A_ub, dtype=float),
        b_ub=np.array(b_ub, dtype=float),
        A_eq=np.array(A_eq, dtype=float),
        b_eq=np.array(b_eq, dtype=float),
        bounds=bounds,
        method="highs",
    )
    if not res.success:
        return None, None

    q = np.array(res.x[:-1], dtype=float)
    v = float(res.x[-1])
    return q, v


def _pure_strategy_probabilities(
    row_names: List[str],
    col_names: List[str],
    p1_optimal: List[str],
    p2_optimal: List[str],
) -> Dict[str, Any]:
    p1_set = set(p1_optimal)
    p2_set = set(p2_optimal)
    p1_share = 1.0 / len(p1_set) if p1_set else 0.0
    p2_share = 1.0 / len(p2_set) if p2_set else 0.0

    return {
        "player1": {
            "strategies": row_names,
            "probabilities": [p1_share if name in p1_set else 0.0 for name in row_names],
        },
        "player2": {
            "strategies": col_names,
            "probabilities": [p2_share if name in p2_set else 0.0 for name in col_names],
        },
        "note": (
            "Показана чистая оптимальная стратегия. Если седловых стратегий несколько, "
            "вероятности распределены поровну между равнозначными чистыми оптимумами."
        ),
    }


def _expand_mixed_probabilities(
    mixed: Dict[str, Any],
    row_names: List[str],
    col_names: List[str],
) -> Dict[str, Any]:
    p1_probs = {name: prob for name, prob in zip(
        mixed.get("player1", {}).get("strategies", []),
        mixed.get("player1", {}).get("probabilities", []),
    )}
    p2_probs = {name: prob for name, prob in zip(
        mixed.get("player2", {}).get("strategies", []),
        mixed.get("player2", {}).get("probabilities", []),
    )}

    return {
        "player1": {
            "strategies": row_names,
            "probabilities": [float(p1_probs.get(name, 0.0)) for name in row_names],
        },
        "player2": {
            "strategies": col_names,
            "probabilities": [float(p2_probs.get(name, 0.0)) for name in col_names],
        },
        "note": "Доминируемые стратегии получают вероятность 0 в полном профиле исходных стратегий.",
    }


def _build_zero_sum_recommendation(result: Dict[str, Any], tol: float = 1e-9) -> Dict[str, Any]:
    value = result.get("value")
    if result.get("saddle_point", {}).get("exists"):
        p1 = result["strategy_probabilities"]["player1"]
        p2 = result["strategy_probabilities"]["player2"]
        p1_active = _active_strategy_names(p1, tol)
        p2_active = _active_strategy_names(p2, tol)
        return {
            "type": "pure",
            "summary": (
                f"Игроку 1 стоит использовать чистую оптимальную стратегию: {', '.join(p1_active)}. "
                f"Оптимальный ответ игрока 2: {', '.join(p2_active)}."
            ),
            "player1_best": p1_active,
            "player2_best": p2_active,
            "value": value,
            "reason": (
                "Седловая точка существует, поэтому ни один игрок не улучшит гарантированный "
                "результат односторонним отклонением от рекомендованной чистой стратегии."
            ),
        }

    p1 = result["strategy_probabilities"]["player1"]
    p2 = result["strategy_probabilities"]["player2"]
    return {
        "type": "mixed",
        "summary": (
            "Используйте смешанный профиль из таблицы вероятностей: отдельные чистые "
            "стратегии в этой игре уязвимы."
        ),
        "player1_best": _active_strategy_names(p1, tol),
        "player2_best": _active_strategy_names(p2, tol),
        "value": value,
        "reason": (
            "Седловой точки нет. Оптимальное распределение уравнивает лучшие ответы "
            "соперника и гарантирует цену игры."
        ),
    }


def _active_strategy_names(profile: Dict[str, Any], tol: float = 1e-9) -> List[str]:
    names = profile.get("strategies", [])
    probs = profile.get("probabilities", [])
    return [name for name, prob in zip(names, probs) if float(prob) > tol]


def _solve_general_sum_game(parsed: Dict[str, Any]) -> Dict[str, Any]:
    matrix_a = parsed["payoff_matrix"]
    matrix_b = parsed["player2_payoff_matrix"]
    notes = []
    if matrix_b is None:
        matrix_b = -matrix_a
        notes.append(
            "Матрица выигрышей игрока 2 не передана; для игрока 2 игра интерпретирована как нулевая сумма."
        )

    equilibria = _find_bimatrix_equilibria(
        matrix_a,
        matrix_b,
        parsed["player1_strategies"],
        parsed["player2_strategies"],
    )
    recommendation = _build_general_sum_recommendation(equilibria)

    return {
        "is_zero_sum": False,
        "game_type": "general_sum",
        "payoff_matrix": matrix_a.tolist(),
        "player2_payoff_matrix": matrix_b.tolist(),
        "equilibria": equilibria,
        "strategy_probabilities": equilibria[0]["strategy_probabilities"] if equilibria else None,
        "recommendation": recommendation,
        "notes": notes,
    }


def _find_bimatrix_equilibria(
    matrix_a: np.ndarray,
    matrix_b: np.ndarray,
    row_names: List[str],
    col_names: List[str],
    tol: float = 1e-8,
) -> List[Dict[str, Any]]:
    m, n = matrix_a.shape
    equilibria: List[Dict[str, Any]] = []

    for i in range(m):
        for j in range(n):
            if _is_pure_nash(matrix_a, matrix_b, i, j, tol):
                p = np.zeros(m)
                q = np.zeros(n)
                p[i] = 1.0
                q[j] = 1.0
                equilibria.append(_make_bimatrix_equilibrium(
                    "pure",
                    p,
                    q,
                    matrix_a,
                    matrix_b,
                    row_names,
                    col_names,
                ))

    for support_size in range(2, min(m, n) + 1):
        for rows in combinations(range(m), support_size):
            for cols in combinations(range(n), support_size):
                equilibrium = _solve_support_equilibrium(
                    matrix_a,
                    matrix_b,
                    list(rows),
                    list(cols),
                    row_names,
                    col_names,
                    tol,
                )
                if equilibrium is not None:
                    equilibria.append(equilibrium)

    return _deduplicate_equilibria(equilibria)


def _is_pure_nash(
    matrix_a: np.ndarray,
    matrix_b: np.ndarray,
    row: int,
    col: int,
    tol: float,
) -> bool:
    p1_payoff = matrix_a[row, col]
    p2_payoff = matrix_b[row, col]
    return (
        p1_payoff >= matrix_a[:, col].max() - tol
        and p2_payoff >= matrix_b[row, :].max() - tol
    )


def _solve_support_equilibrium(
    matrix_a: np.ndarray,
    matrix_b: np.ndarray,
    rows: List[int],
    cols: List[int],
    row_names: List[str],
    col_names: List[str],
    tol: float,
) -> Optional[Dict[str, Any]]:
    try:
        sub_a = matrix_a[np.ix_(rows, cols)]
        left_a = np.block([
            [sub_a, -np.ones((len(rows), 1))],
            [np.ones((1, len(cols))), np.zeros((1, 1))],
        ])
        right_a = np.array([0.0] * len(rows) + [1.0])
        solved_q = np.linalg.solve(left_a, right_a)

        sub_b = matrix_b[np.ix_(rows, cols)]
        left_b = np.block([
            [sub_b.T, -np.ones((len(cols), 1))],
            [np.ones((1, len(rows))), np.zeros((1, 1))],
        ])
        right_b = np.array([0.0] * len(cols) + [1.0])
        solved_p = np.linalg.solve(left_b, right_b)
    except np.linalg.LinAlgError:
        return None

    q_support = solved_q[:-1]
    p_support = solved_p[:-1]

    if np.any(q_support < -tol) or np.any(p_support < -tol):
        return None

    q_support = np.maximum(q_support, 0.0)
    p_support = np.maximum(p_support, 0.0)
    if q_support.sum() <= tol or p_support.sum() <= tol:
        return None
    q_support = q_support / q_support.sum()
    p_support = p_support / p_support.sum()

    p = np.zeros(matrix_a.shape[0])
    q = np.zeros(matrix_a.shape[1])
    for idx, row in enumerate(rows):
        p[row] = p_support[idx]
    for idx, col in enumerate(cols):
        q[col] = q_support[idx]

    p1_payoffs = matrix_a.dot(q)
    p2_payoffs = p.dot(matrix_b)
    value1 = float(p.dot(matrix_a).dot(q))
    value2 = float(p.dot(matrix_b).dot(q))

    if any(p1_payoffs[i] > value1 + tol for i in range(matrix_a.shape[0]) if i not in rows):
        return None
    if any(p2_payoffs[j] > value2 + tol for j in range(matrix_a.shape[1]) if j not in cols):
        return None

    return _make_bimatrix_equilibrium(
        "mixed",
        p,
        q,
        matrix_a,
        matrix_b,
        row_names,
        col_names,
    )


def _make_bimatrix_equilibrium(
    equilibrium_type: str,
    p: np.ndarray,
    q: np.ndarray,
    matrix_a: np.ndarray,
    matrix_b: np.ndarray,
    row_names: List[str],
    col_names: List[str],
) -> Dict[str, Any]:
    value1 = float(p.dot(matrix_a).dot(q))
    value2 = float(p.dot(matrix_b).dot(q))
    profile = {
        "player1": {
            "strategies": row_names,
            "probabilities": [float(x) for x in p],
        },
        "player2": {
            "strategies": col_names,
            "probabilities": [float(x) for x in q],
        },
    }
    return {
        "type": equilibrium_type,
        "payoffs": {
            "player1": value1,
            "player2": value2,
        },
        "strategy_probabilities": profile,
        "active_strategies": {
            "player1": _active_strategy_names(profile["player1"]),
            "player2": _active_strategy_names(profile["player2"]),
        },
    }


def _deduplicate_equilibria(equilibria: List[Dict[str, Any]], precision: int = 8) -> List[Dict[str, Any]]:
    seen = set()
    unique = []
    for equilibrium in equilibria:
        profile = equilibrium["strategy_probabilities"]
        key = (
            tuple(round(x, precision) for x in profile["player1"]["probabilities"]),
            tuple(round(x, precision) for x in profile["player2"]["probabilities"]),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(equilibrium)
    return unique


def _build_general_sum_recommendation(equilibria: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not equilibria:
        return {
            "type": "none",
            "summary": "Доступный перебор носителей не нашел равновесие Нэша.",
            "reason": (
                "Для больших или вырожденных игр общей суммы может потребоваться внешний "
                "решатель равновесий."
            ),
        }

    pure = [eq for eq in equilibria if eq.get("type") == "pure"]
    chosen = pure[0] if pure else equilibria[0]
    p1 = chosen["active_strategies"]["player1"]
    p2 = chosen["active_strategies"]["player2"]
    return {
        "type": chosen.get("type"),
        "summary": (
            f"Рекомендуемое равновесие Нэша: игрок 1 использует {', '.join(p1)}, "
            f"игрок 2 использует {', '.join(p2)}."
        ),
        "player1_best": p1,
        "player2_best": p2,
        "payoffs": chosen.get("payoffs"),
        "reason": (
            "В этом профиле выбранная стратегия каждого игрока является лучшим ответом "
            "на стратегию второго, поэтому одностороннее отклонение невыгодно."
        ),
    }
