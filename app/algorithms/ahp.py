"""
ahp.py — Метод аналитической иерархии (AHP).

Дискретные данные, попарные сравнения, проверка согласованности (CR).
CR > 0.1 → ошибка + предложения по фиксу.

TODO: реализовать алгоритм.
"""


def run_ahp(payload):
    """
    Точка входа для AHP.

    Ожидаемый payload:
        criteria      : list[str]           — названия критериев
        alternatives  : list[str]           — названия альтернатив
        matrix        : list[list[float]]   — матрица попарных сравнений критериев (n×n)
        alt_matrices  : dict[str, list[list[float]]]  — матрицы сравнений альтернатив по каждому критерию (опционально)

    Возвращает dict:
        weights       : list[float]         — веса критериев
        ranking       : list[dict]          — ранжирование альтернатив [{name, score}]
        consistency   : {cr: float, is_consistent: bool}
        suggestions   : list[str]           — предложения по фиксу (если CR > 0.1)
    """
    raise NotImplementedError("AHP algorithm not yet implemented")
