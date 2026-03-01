"""
multi_criteria.py — Многокритериальная оптимизация.

Непрерывные данные, целевые функции:
  - linear        (для прибыли)
  - quadratic     (для расстояния)
  - exponential   (для логистики)
  - logarithmic   (для энтропии)

Подметод: главный критерий (зафиксировать один, оптимизировать остальные).

TODO: реализовать алгоритм.
"""


def run_multi_criteria(payload):
    """
    Точка входа для многокритериальной оптимизации.

    Ожидаемый payload:
        criteria       : list[dict]   — [{name, weight, func_type, direction ("min"|"max"), params: {}}]
        constraints    : dict         — ограничения {criterion_name: {min, max}}
        main_criterion : str | None   — имя главного критерия (подметод «главный критерий»)

    Возвращает dict:
        optimum        : dict         — оптимальное значение по каждому критерию
        ranking        : list[dict]   — ранжирование сценариев (если несколько)
        method_used    : str          — использованный подметод
    """
    raise NotImplementedError("Multi-criteria algorithm not yet implemented")
