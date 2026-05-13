"""
Decision under uncertainty (games with nature).

Computes:
- risk (regret) matrix
- Wald, Savage, Hurwicz, Laplace, Bayes criteria
- comparative table with recommended strategies
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np


def run_algorithm(input_data: Dict[str, Any]) -> Dict[str, Any]:
    metadata = {
        "algorithm_id": "decision_under_uncertainty",
        "name": "Decision Under Uncertainty",
        "description": "Wald, Savage, Hurwicz, Laplace, Bayes with regret matrix.",
        "version": "1.0.0",
    }

    try:
        parsed = _parse_and_validate(input_data)

        payoff = parsed["payoff_matrix"]
        utility = _to_utility(payoff, parsed["optimization"])

        risk = _risk_matrix(utility)
        criteria = _compute_criteria(
            utility=utility,
            risk=risk,
            hurwicz_lambda=parsed["hurwicz_lambda"],
            probabilities=parsed["probabilities"],
        )
        comparison = _build_comparison_table(parsed["strategies"], criteria)
        recommendation = _build_recommendation(
            parsed["strategies"],
            criteria,
            parsed["selected_criteria"],
        )
        hurwicz_interpretation = _interpret_hurwicz(parsed["hurwicz_lambda"])

        result = {
            "decision_maker": parsed["decision_maker"],
            "optimization": parsed["optimization"],
            "strategies": parsed["strategies"],
            "states_of_nature": parsed["states_of_nature"],
            "payoff_matrix": payoff.tolist(),
            "risk_matrix": risk.tolist(),
            "criteria": criteria,
            "comparison_table": comparison,
            "probabilities": (
                [float(x) for x in parsed["probabilities"]]
                if parsed["probabilities"] is not None
                else None
            ),
            "selected_criteria": parsed["selected_criteria"],
            "hurwicz_interpretation": hurwicz_interpretation,
            "recommendation": recommendation,
            "notes": parsed["notes"],
        }

        return {
            "status": "success",
            "result": result,
            "metadata": metadata,
            "report_data": result,
        }
    except Exception as exc:  # pragma: no cover - defensive for API
        return {
            "status": "error",
            "result": {"error": str(exc)},
            "metadata": metadata,
            "report_data": {},
        }


def _parse_and_validate(input_data: Dict[str, Any]) -> Dict[str, Any]:
    decision_maker = str(input_data.get("decision_maker", "Decision maker"))
    strategies = input_data.get("strategies", [])
    states = input_data.get("states_of_nature", [])
    matrix = input_data.get("payoff_matrix", [])
    optimization = str(input_data.get("optimization", "max")).lower().strip()
    hurwicz_lambda = float(input_data.get("lambda", 0.5))
    probabilities = input_data.get("probabilities")
    selected_criteria = input_data.get("selected_criteria")
    if selected_criteria is None:
        selected_criteria = input_data.get("criteria")

    if not isinstance(strategies, list) or not strategies:
        raise ValueError("'strategies' must be a non-empty list")
    if not isinstance(states, list) or not states:
        raise ValueError("'states_of_nature' must be a non-empty list")
    if not isinstance(matrix, list) or not matrix:
        raise ValueError("'payoff_matrix' must be a non-empty 2D list")

    m = len(strategies)
    n = len(states)
    if len(matrix) != m or any(not isinstance(row, list) or len(row) != n for row in matrix):
        raise ValueError(f"'payoff_matrix' must be {m}x{n}")

    if optimization not in ("max", "min"):
        optimization = "max"

    if not (0.0 <= hurwicz_lambda <= 1.0):
        raise ValueError("'lambda' must be between 0 and 1")

    probs = None
    if probabilities is not None:
        if not isinstance(probabilities, list) or len(probabilities) != n:
            raise ValueError("'probabilities' must be a list with length = states_of_nature")
        probs = np.array(probabilities, dtype=float)
        if probs.sum() <= 0:
            raise ValueError("'probabilities' must sum to a positive value")
        probs = probs / probs.sum()

    selected = None
    if isinstance(selected_criteria, list) and selected_criteria:
        allowed = {"wald", "savage", "hurwicz", "laplace", "bayes"}
        selected = [str(x).lower().strip() for x in selected_criteria if str(x).lower().strip() in allowed]
        if not selected:
            selected = None

    notes = []
    if optimization == "min":
        notes.append("Режим оптимизации 'min': критерии рассчитаны по полезности = -payoff.")
    if probabilities is not None and probs is not None and not np.allclose(probs, probabilities):
        notes.append("Вероятности нормализованы так, чтобы их сумма была равна 1.")

    return {
        "decision_maker": decision_maker,
        "strategies": [str(x) for x in strategies],
        "states_of_nature": [str(x) for x in states],
        "payoff_matrix": np.array(matrix, dtype=float),
        "optimization": optimization,
        "hurwicz_lambda": hurwicz_lambda,
        "probabilities": probs,
        "selected_criteria": selected,
        "notes": notes,
    }


def _to_utility(payoff: np.ndarray, optimization: str) -> np.ndarray:
    if optimization == "min":
        return -payoff
    return payoff.copy()


def _risk_matrix(utility: np.ndarray) -> np.ndarray:
    col_max = utility.max(axis=0)
    return col_max - utility


def _compute_criteria(
    utility: np.ndarray,
    risk: np.ndarray,
    hurwicz_lambda: float,
    probabilities: Optional[np.ndarray],
) -> Dict[str, Any]:
    row_mins = utility.min(axis=1)
    row_maxs = utility.max(axis=1)

    # Wald: max_i min_j a_ij
    wald_scores = row_mins
    wald_value = float(wald_scores.max())
    wald_idx = _argmax_all(wald_scores)

    # Savage: min_i max_j r_ij
    savage_scores = risk.max(axis=1)
    savage_value = float(savage_scores.min())
    savage_idx = _argmin_all(savage_scores)

    # Hurwicz: max_i [lambda * min + (1 - lambda) * max]
    hurwicz_scores = hurwicz_lambda * row_mins + (1.0 - hurwicz_lambda) * row_maxs
    hurwicz_value = float(hurwicz_scores.max())
    hurwicz_idx = _argmax_all(hurwicz_scores)

    # Laplace: average across states
    laplace_scores = utility.mean(axis=1)
    laplace_value = float(laplace_scores.max())
    laplace_idx = _argmax_all(laplace_scores)

    # Bayes: expected value with probabilities (if provided)
    if probabilities is not None:
        bayes_scores = utility.dot(probabilities)
        bayes_value = float(bayes_scores.max())
        bayes_idx = _argmax_all(bayes_scores)
    else:
        bayes_scores = None
        bayes_value = None
        bayes_idx = []

    return {
        "wald": _criteria_block(wald_scores, wald_value, wald_idx),
        "savage": _criteria_block(savage_scores, savage_value, savage_idx, minimize=True),
        "hurwicz": _criteria_block(hurwicz_scores, hurwicz_value, hurwicz_idx),
        "laplace": _criteria_block(laplace_scores, laplace_value, laplace_idx),
        "bayes": _criteria_block(bayes_scores, bayes_value, bayes_idx),
    }


def _criteria_block(
    scores: Optional[np.ndarray],
    value: Optional[float],
    indices: List[int],
    minimize: bool = False,
) -> Dict[str, Any]:
    if scores is None:
        return {
            "scores": None,
            "value": None,
            "recommended_indices": [],
            "recommended_strategies": [],
            "opt": "min" if minimize else "max",
        }
    return {
        "scores": [float(x) for x in scores],
        "value": float(value) if value is not None else None,
        "recommended_indices": indices,
        "recommended_strategies": [],
        "opt": "min" if minimize else "max",
    }


def _build_comparison_table(strategies: List[str], criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
    table = []
    for i, name in enumerate(strategies):
        row = {
            "strategy": name,
            "wald": _score_at(criteria["wald"]["scores"], i),
            "savage": _score_at(criteria["savage"]["scores"], i),
            "hurwicz": _score_at(criteria["hurwicz"]["scores"], i),
            "laplace": _score_at(criteria["laplace"]["scores"], i),
            "bayes": _score_at(criteria["bayes"]["scores"], i),
        }
        table.append(row)

    for key in criteria:
        idxs = criteria[key]["recommended_indices"]
        criteria[key]["recommended_strategies"] = [strategies[i] for i in idxs]

    return table


def _score_at(scores: Optional[List[float]], idx: int) -> Optional[float]:
    if scores is None:
        return None
    if idx >= len(scores):
        return None
    return float(scores[idx])


def _argmax_all(values: np.ndarray, tol: float = 1e-9) -> List[int]:
    vmax = values.max()
    return [i for i, v in enumerate(values) if abs(v - vmax) <= tol]


def _argmin_all(values: np.ndarray, tol: float = 1e-9) -> List[int]:
    vmin = values.min()
    return [i for i, v in enumerate(values) if abs(v - vmin) <= tol]


def _build_recommendation(
    strategies: List[str],
    criteria: Dict[str, Any],
    selected_criteria: Optional[List[str]],
) -> Dict[str, Any]:
    considered = []
    vote_scores = [0.0 for _ in strategies]
    criterion_details = []

    for key, block in criteria.items():
        if selected_criteria and key not in selected_criteria:
            continue
        idxs = block.get("recommended_indices", [])
        if not idxs:
            continue
        considered.append(key)
        share = 1.0 / len(idxs)
        for idx in idxs:
            vote_scores[idx] += share
        criterion_details.append({
            "criterion": key,
            "recommended_strategies": [strategies[i] for i in idxs],
            "value": block.get("value"),
            "opt": block.get("opt"),
            "reason": _criterion_reason(key, block),
        })

    if not considered:
        return {
            "best_strategy": None,
            "best_strategies": [],
            "confidence": 0.0,
            "votes": [],
            "criteria_considered": [],
            "summary": "Для итоговой рекомендации не выбраны доступные критерии.",
            "details": [],
        }

    max_vote = max(vote_scores)
    best_indices = [i for i, score in enumerate(vote_scores) if abs(score - max_vote) <= 1e-9]
    best_names = [strategies[i] for i in best_indices]
    confidence = max_vote / len(considered) if considered else 0.0
    votes = [
        {
            "strategy": strategy,
            "score": float(score),
            "share": float(score / len(considered)) if considered else 0.0,
        }
        for strategy, score in zip(strategies, vote_scores)
    ]

    if len(best_names) == 1:
        summary = (
            f"Лучший выбор: {best_names[0]}. Его поддерживает "
            f"{max_vote:.2f} критериальных голоса из {len(considered)}."
        )
    else:
        summary = (
            "Несколько стратегий делят первое место: "
            + ", ".join(best_names)
            + f". Каждая получает {max_vote:.2f} критериальных голоса из {len(considered)}."
        )

    return {
        "best_strategy": best_names[0] if best_names else None,
        "best_strategies": best_names,
        "confidence": float(confidence),
        "votes": votes,
        "criteria_considered": considered,
        "summary": summary,
        "details": criterion_details,
    }


def _criterion_reason(key: str, block: Dict[str, Any]) -> str:
    strategies = ", ".join(block.get("recommended_strategies", []) or [])
    value = block.get("value")
    value_text = f"{value:.4f}" if isinstance(value, (int, float)) else "недоступно"
    if key == "wald":
        return f"{strategies} дает лучший гарантированный результат в худшем случае ({value_text})."
    if key == "savage":
        return f"{strategies} минимизирует максимальное сожаление или риск упущенной выгоды ({value_text})."
    if key == "hurwicz":
        return f"{strategies} дает лучший баланс между осторожностью и оптимизмом ({value_text})."
    if key == "laplace":
        return f"{strategies} имеет лучший средний результат при равновероятных состояниях ({value_text})."
    if key == "bayes":
        return f"{strategies} имеет лучшее математическое ожидание с учетом заданных вероятностей ({value_text})."
    return f"{strategies} рекомендуется этим критерием ({value_text})."


def _interpret_hurwicz(hurwicz_lambda: float) -> Dict[str, Any]:
    optimism_weight = 1.0 - hurwicz_lambda
    if hurwicz_lambda >= 0.75:
        stance = "strongly_pessimistic"
        text = (
            "Коэффициент близок к 1, поэтому критерий Гурвица сильно учитывает худший исход."
        )
    elif hurwicz_lambda >= 0.55:
        stance = "moderately_pessimistic"
        text = (
            "Коэффициент смещен к осторожности: худший исход важнее, чем лучший возможный выигрыш."
        )
    elif hurwicz_lambda >= 0.45:
        stance = "balanced"
        text = (
            "Коэффициент сбалансирован: пессимистичный и оптимистичный исходы влияют почти одинаково."
        )
    elif hurwicz_lambda >= 0.25:
        stance = "moderately_optimistic"
        text = (
            "Коэффициент смещен к оптимизму: лучший исход важнее, чем защита от худшего случая."
        )
    else:
        stance = "strongly_optimistic"
        text = (
            "Коэффициент близок к 0, поэтому критерий Гурвица сильно учитывает лучший исход."
        )

    return {
        "lambda": float(hurwicz_lambda),
        "pessimism_weight": float(hurwicz_lambda),
        "optimism_weight": float(optimism_weight),
        "stance": stance,
        "text": text,
    }
