"""
reporter.py — Генерация отчёта (markdown + base64-графики).
"""
import base64
import csv
import io
import os
import textwrap
from datetime import datetime, timezone

import matplotlib
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from flask import current_app, has_app_context

from app.db import get_report as fetch_report, get_run as fetch_run, insert_report


matplotlib.use("Agg")


def generate_report(run_id):
    """Возвращает сохранённый отчёт по run_id или None."""
    report_doc = fetch_report(run_id)
    if report_doc:
        return report_doc.get("report")

    run_doc = fetch_run(run_id)
    if run_doc is None:
        return None
    if run_doc.get("status") != "done":
        return {"error": "Run is not finished yet", "status": run_doc.get("status")}

    report = build_report(run_id, run_doc.get("algorithm_id"), run_doc.get("input", {}), run_doc.get("result", {}))
    insert_report({
        "run_id": run_id,
        "algorithm_id": run_doc.get("algorithm_id"),
        "report": report,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    return report


def build_report(run_id, algorithm_id, payload, result):
    """Генерирует отчёт (markdown с inline base64 изображениями)."""
    if algorithm_id == "ahp":
        report = _report_ahp(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "multi_criteria":
        report = _report_multi_criteria(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "pair_games":
        report = _report_pair_games(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "nature_games":
        report = _report_nature_games(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "fuzzy_sets":
        report = _report_fuzzy_sets(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "fuzzy_inference":
        report = _report_fuzzy_inference(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "decision_tree":
        report = _report_decision_tree(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "id3":
        report = _report_id3(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    return {
        "run_id": run_id,
        "algorithm_id": algorithm_id,
        "markdown": "# Отчёт\n\nНеизвестный метод.",
    }


# ---------------------------------------------------------------------------
#  Текстовое резюме
# ---------------------------------------------------------------------------

def _report_ahp(run_id, payload, result):
    criteria = payload.get("criteria", [])
    alternatives = payload.get("alternatives", [])
    matrix = payload.get("matrix", [])
    alt_matrices = payload.get("alt_matrices", {})
    weights = result.get("weights", [])
    ranking = result.get("ranking", [])
    consistency = result.get("consistency", {})
    suggestions = result.get("suggestions", [])

    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Метод анализа иерархий (AHP)",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
        "## Веса критериев",
    ]

    for name, weight in zip(criteria, weights):
        markdown.append(f"- {name} — {weight:.4f} ({weight * 100:.2f}%)")

    markdown.append("")
    markdown.append("## Рейтинг альтернатив")
    for idx, item in enumerate(ranking, start=1):
        markdown.append(
            f"{idx}. {item.get('alternative')} — {item.get('score'):.4f} ({item.get('score_percent'):.2f}%)"
        )

    if consistency:
        markdown.append("")
        markdown.append(
            f"**Согласованность:** CR={consistency.get('cr', 0.0):.4f}, "
            f"{'OK' if consistency.get('is_consistent') else 'Нужна проверка'}"
        )

    if suggestions:
        markdown.append("")
        markdown.append("> " + " ".join(suggestions))

    intermediate = _build_ahp_intermediate(criteria, alternatives, matrix, alt_matrices)
    if intermediate:
        markdown.append("")
        markdown.append("## Промежуточные таблицы")
        markdown.append("Комментарий: нормализация выполняется по столбцам, веса — среднее значение по строке.")

        if intermediate.get("criteria_matrix"):
            markdown.extend(_render_matrix_section(
                "Матрица сравнения критериев",
                criteria,
                criteria,
                intermediate["criteria_matrix"],
            ))

        if intermediate.get("criteria_norm"):
            markdown.extend(_render_matrix_section(
                "Нормализованная матрица критериев",
                criteria,
                criteria,
                intermediate["criteria_norm"],
            ))

        if intermediate.get("criteria_weights"):
            markdown.extend(_render_weights_section(
                "Веса критериев (по нормализованной матрице)",
                criteria,
                intermediate["criteria_weights"],
            ))

        for crit_name in criteria:
            alt_matrix = intermediate.get("alt_matrices", {}).get(crit_name)
            if alt_matrix:
                markdown.extend(_render_matrix_section(
                    f"Матрица сравнений альтернатив по критерию «{crit_name}»",
                    alternatives,
                    alternatives,
                    alt_matrix,
                ))
            alt_norm = intermediate.get("alt_norm", {}).get(crit_name)
            if alt_norm:
                markdown.extend(_render_matrix_section(
                    f"Нормализованная матрица альтернатив по критерию «{crit_name}»",
                    alternatives,
                    alternatives,
                    alt_norm,
                ))
            alt_weights = intermediate.get("alt_weights", {}).get(crit_name)
            if alt_weights:
                markdown.extend(_render_weights_section(
                    f"Веса альтернатив по критерию «{crit_name}»",
                    alternatives,
                    alt_weights,
                ))

        synthesis = intermediate.get("synthesis_matrix")
        if synthesis:
            markdown.extend(_render_matrix_section(
                "Матрица синтеза (веса альтернатив по критериям)",
                alternatives,
                criteria,
                synthesis,
            ))

        final_scores = intermediate.get("final_scores")
        if final_scores:
            markdown.extend(_render_weights_section(
                "Итоговые приоритеты альтернатив",
                alternatives,
                final_scores,
            ))

    chart_markdown = _build_ahp_charts(criteria, weights, ranking)
    markdown.extend(["", chart_markdown])

    return {
        "run_id": run_id,
        "algorithm_id": "ahp",
        "markdown": "\n".join(markdown),
    }


def _report_multi_criteria(run_id, payload, result):
    """Формирование markdown-отчёта для метода главного критерия."""
    criteria = payload.get("criteria", [])
    constraints = payload.get("constraints", {})
    main_criterion = payload.get("main_criterion", "—")
    variable_bounds = payload.get("variable_bounds", [])

    optimum = result.get("optimum", {})
    ranking = result.get("ranking", [])
    is_feasible = result.get("is_feasible", False)
    method_used = result.get("method_used", "main_criterion")

    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Многокритериальная оптимизация (метод главного критерия)",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
        f"**Главный критерий:** {main_criterion}",
        "",
    ]

    # --- Описание критериев ---
    markdown.append("## Критерии")
    for c in criteria:
        name = c.get("name", "?")
        direction = "максимизация" if c.get("direction") == "max" else "минимизация"
        func_type = c.get("func_type", "linear")
        coeffs = c.get("params", {}).get("coeffs", [])
        coeffs_str = ", ".join(f"{v}" for v in coeffs)
        markdown.append(f"- **{name}** — {direction}, тип: {func_type}, коэфф.: [{coeffs_str}]")

    # --- Ограничения ---
    if constraints:
        markdown.append("")
        markdown.append("## Ограничения")
        for name, cons in constraints.items():
            parts = []
            if "min" in cons:
                parts.append(f"≥ {cons['min']}")
            if "max" in cons:
                parts.append(f"≤ {cons['max']}")
            markdown.append(f"- {name}: {', '.join(parts)}")

    # --- Границы переменных ---
    if variable_bounds:
        markdown.append("")
        markdown.append("## Границы переменных")
        for i, b in enumerate(variable_bounds):
            markdown.append(f"- x{i + 1}: [{b[0]}, {b[1]}]")

    # --- Результаты ---
    markdown.append("")
    markdown.append("## Результаты")

    if is_feasible and ranking:
        solution = ranking[0].get("solution", [])
        obj_value = ranking[0].get("objective_value", 0)
        solution_str = ", ".join(f"{v:.4f}" for v in solution)
        markdown.append(f"**Решение найдено:** x = ({solution_str})")
        markdown.append(f"**Значение целевой функции ({main_criterion}):** {obj_value:.4f}")
        markdown.append("")
        markdown.append("### Значения критериев в оптимальной точке")
        for name, val in optimum.items():
            markdown.append(f"- {name} = {val:.4f}")
    else:
        markdown.append("**Допустимое решение не найдено.** Проверьте ограничения и границы переменных.")

    # --- Графики ---
    chart_md = _build_multi_criteria_charts(optimum, is_feasible)
    if chart_md:
        markdown.extend(["", chart_md])

    return {
        "run_id": run_id,
        "algorithm_id": "multi_criteria",
        "markdown": "\n".join(markdown),
    }


def _report_pair_games(run_id, payload, result):
    player1_name = payload.get("player1_name", "Игрок 1")
    player2_name = payload.get("player2_name", "Игрок 2")
    row_names = payload.get("player1_strategies", [])
    col_names = payload.get("player2_strategies", [])
    matrix = payload.get("payoff_matrix", [])
    matrix2 = payload.get("player2_payoff_matrix")
    is_zero_sum = result.get("is_zero_sum", payload.get("is_zero_sum", True))

    reduction = result.get("reduction", {})
    saddle = result.get("saddle_point", {})
    mixed = result.get("mixed_strategies")
    equilibria = result.get("equilibria", [])
    strategy_probabilities = result.get("strategy_probabilities")
    recommendation = result.get("recommendation", {})
    value = result.get("value")

    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Парные игры (матричная игра двух лиц)",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
        f"**Игрок 1:** {player1_name}",
        f"**Игрок 2:** {player2_name}",
        f"**Тип игры:** {'нулевая сумма' if is_zero_sum else 'общая сумма'}",
        "",
        "## Главный вывод",
        _pair_game_conclusion(recommendation, value, is_zero_sum),
        "",
        "## Платёжная матрица",
        _build_md_matrix(row_names, col_names, matrix),
    ]

    if not is_zero_sum:
        if matrix2:
            markdown.extend([
                "",
                f"## Матрица выигрышей игрока 2 ({player2_name})",
                _build_md_matrix(row_names, col_names, matrix2),
            ])
        if equilibria:
            markdown.extend([
                "",
                "## Равновесия Нэша",
            ])
            rows = []
            for idx, equilibrium in enumerate(equilibria, start=1):
                active = equilibrium.get("active_strategies", {})
                payoffs = equilibrium.get("payoffs", {})
                rows.append([
                    idx,
                    "чистое" if equilibrium.get("type") == "pure" else "смешанное",
                    ", ".join(active.get("player1", [])),
                    ", ".join(active.get("player2", [])),
                    _fmt_float(payoffs.get("player1")),
                    _fmt_float(payoffs.get("player2")),
                ])
            markdown.append(_build_md_table(
                ["#", "Тип", "Игрок 1", "Игрок 2", "Выигрыш 1", "Выигрыш 2"],
                rows,
            ))
        if strategy_probabilities:
            markdown.extend(_render_probability_profile(
                "Рекомендуемый профиль вероятностей",
                strategy_probabilities,
                player1_name,
                player2_name,
            ))
        if result.get("notes"):
            markdown.append("")
            for note in result.get("notes", []):
                markdown.append(f"> {note}")
        return {
            "run_id": run_id,
            "algorithm_id": "pair_games",
            "markdown": "\n".join(markdown),
        }

    steps = reduction.get("steps", [])
    if steps:
        markdown.append("")
        markdown.append("## Сокращение доминированием")
        for step in steps:
            markdown.append(
                f"- Удалена {step.get('kind')} '{step.get('removed')}' "
                f"(доминируется '{step.get('by')}')"
            )

    if saddle and saddle.get("exists"):
        markdown.extend([
            "",
            "## Седловая точка",
            f"Значение игры: **{_fmt_float(value)}**",
        ])
        if saddle.get("points"):
            for point in saddle.get("points"):
                markdown.append(
                    f"- ({point.get('row')}, {point.get('col')}) = {_fmt_float(point.get('value'))}"
                )
        if saddle.get("player1_strategies"):
            markdown.append(
                "Оптимальные стратегии игрока 1: "
                + ", ".join(saddle.get("player1_strategies"))
            )
        if saddle.get("player2_strategies"):
            markdown.append(
                "Оптимальные стратегии игрока 2: "
                + ", ".join(saddle.get("player2_strategies"))
            )
    elif mixed:
        markdown.extend([
            "",
            "## Смешанные стратегии",
            f"Значение игры: **{_fmt_float(value)}**",
        ])

        p1 = mixed.get("player1", {})
        p2 = mixed.get("player2", {})
        if p1:
            markdown.append("")
            markdown.append("### Игрок 1")
            rows = []
            for name, prob in zip(p1.get("strategies", []), p1.get("probabilities", [])):
                rows.append([name, _fmt_float(prob)])
            markdown.append(_build_md_table(["Стратегия", "Вероятность"], rows))
        if p2:
            markdown.append("")
            markdown.append("### Игрок 2")
            rows = []
            for name, prob in zip(p2.get("strategies", []), p2.get("probabilities", [])):
                rows.append([name, _fmt_float(prob)])
            markdown.append(_build_md_table(["Стратегия", "Вероятность"], rows))

    if strategy_probabilities:
        markdown.extend(_render_probability_profile(
            "Итоговые вероятности по всем исходным стратегиям",
            strategy_probabilities,
            player1_name,
            player2_name,
        ))

    return {
        "run_id": run_id,
        "algorithm_id": "pair_games",
        "markdown": "\n".join(markdown),
    }


def _report_nature_games(run_id, payload, result):
    decision_maker = payload.get("decision_maker", "Лицо, принимающее решение")
    strategies = payload.get("strategies", [])
    states = payload.get("states_of_nature", [])
    payoff_matrix = payload.get("payoff_matrix", [])
    hurwicz_lambda = payload.get("lambda", 0.5)
    selected = payload.get("selected_criteria")

    risk_matrix = result.get("risk_matrix", [])
    criteria = result.get("criteria", {})
    comparison = result.get("comparison_table", [])
    probabilities = result.get("probabilities")
    recommendation = result.get("recommendation", {})
    hurwicz_interpretation = result.get("hurwicz_interpretation", {})
    notes = result.get("notes", [])

    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Игры с природой (принятие решений в условиях неопределенности)",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
        f"**ЛПР:** {decision_maker}",
        f"**Коэффициент Гурвица:** {hurwicz_lambda}",
    ]

    if selected:
        markdown.append("**Выбранные критерии:** " + ", ".join(selected))

    markdown.extend([
        "",
        "## Главный вывод",
        _nature_game_conclusion(recommendation),
    ])

    if hurwicz_interpretation:
        markdown.extend([
            "",
            "## Интерпретация коэффициента Гурвица",
            (
                f"λ = {_fmt_float(hurwicz_interpretation.get('lambda'))}: "
                f"вес осторожности {_fmt_float(hurwicz_interpretation.get('pessimism_weight'))}, "
                f"вес оптимизма {_fmt_float(hurwicz_interpretation.get('optimism_weight'))}."
            ),
            _translate_hurwicz_text(hurwicz_interpretation.get("text", "")),
        ])

    markdown.extend([
        "",
        "## Матрица выигрышей",
        _build_md_matrix(strategies, states, payoff_matrix),
    ])

    if probabilities:
        rows = []
        for state, probability in zip(states, probabilities):
            rows.append([state, _fmt_float(probability), f"{float(probability) * 100:.2f}%"])
        markdown.extend([
            "",
            "## Вероятности состояний природы",
            _build_md_table(["Состояние", "Вероятность", "Доля"], rows),
            "Эти вероятности используются в критерии Байеса: он выбирает стратегию с максимальным математическим ожиданием.",
        ])

    if risk_matrix:
        markdown.extend([
            "",
            "## Матрица рисков",
            _build_md_matrix(strategies, states, risk_matrix),
        ])

    if criteria:
        markdown.append("")
        markdown.append("## Рекомендуемые стратегии")
        for key, block in criteria.items():
            if selected and key not in selected:
                continue
            rec = ", ".join(block.get("recommended_strategies", []) or [])
            value = block.get("value")
            value_str = _fmt_float(value) if value is not None else "—"
            markdown.append(
                f"- **{_criterion_title(key)}**: {rec or '—'} "
                f"(значение: {value_str}). {_criterion_report_reason(key)}"
            )

    if recommendation.get("details"):
        markdown.append("")
        markdown.append("## Почему этот вариант лучше")
        for detail in recommendation.get("details", []):
            if selected and detail.get("criterion") not in selected:
                continue
            markdown.append(
                f"- **{_criterion_title(detail.get('criterion'))}:** "
                f"{_translate_criterion_reason(detail.get('reason', ''))}"
            )

    if comparison:
        markdown.append("")
        markdown.append("## Сравнительная таблица")
        rows = []
        for row in comparison:
            rows.append([
                row.get("strategy"),
                _fmt_float(row.get("wald")),
                _fmt_float(row.get("savage")),
                _fmt_float(row.get("hurwicz")),
                _fmt_float(row.get("laplace")),
                _fmt_float(row.get("bayes")),
            ])
        markdown.append(_build_md_table(
            ["Стратегия", "Wald", "Savage", "Hurwicz", "Laplace", "Bayes"],
            rows,
        ))

    if notes:
        markdown.append("")
        for note in notes:
            markdown.append(f"> {note}")

    return {
        "run_id": run_id,
        "algorithm_id": "nature_games",
        "markdown": "\n".join(markdown),
    }


def _report_fuzzy_sets(run_id, payload, result):
    task = payload.get("task")
    source = payload.get("input", {})
    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Нечёткие множества",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
    ]

    if task == "task1":
        terms = result.get("terms", source.get("terms", []))
        x0_values = result.get("x0_values", {})
        term_values = [
            (terms[0] if len(terms) > 0 else "A1", x0_values.get("a1")),
            (terms[1] if len(terms) > 1 else "A2", x0_values.get("a2")),
            (terms[2] if len(terms) > 2 else "A3", x0_values.get("a3")),
        ]
        best_term, best_value = max(term_values, key=lambda item: float(item[1] or 0))
        markdown.extend([
            "## Операции над нечёткими множествами",
            f"**Понятие:** {result.get('concept', source.get('concept', '—'))}",
            f"**Термы:** {', '.join(terms)}",
            f"**Количество точек:** {result.get('points_count')}",
            "",
            "## Вывод",
            f"В точке x₀={x0_values.get('x')} максимальная принадлежность у терма **{best_term}**: μ={_fmt_float(best_value)}.",
            "Это означает, что именно этот словесный уровень лучше всего описывает заданное значение x₀.",
            "",
            "### Значения в точке x₀",
        ])
        markdown.append(_build_md_table(
            ["x₀", "μA1", "μA2", "μA3"],
            [[x0_values.get("x"), x0_values.get("a1"), x0_values.get("a2"), x0_values.get("a3")]],
        ))
        props = result.get("a2_properties", {})
        markdown.extend([
            "",
            "### Свойства A2",
            f"- Носитель: {props.get('support_label') or props.get('support')}",
            f"- Ядро: {props.get('core')}",
            f"- Точки перехода μ=0.5: {props.get('transition_points')}",
            "",
            "### Таблица значений",
            _build_md_table(
                ["x", "A1", "A2", "A3", "A2 очень", "A2 довольно"],
                [[row.get("x"), row.get("a1"), row.get("a2"), row.get("a3"), row.get("a2_very"), row.get("a2_fairly")] for row in result.get("values", [])],
            ),
            "",
            "### Операции A1 и A2",
            _build_md_table(
                ["x", "¬A1", "T-MIN", "T-PROD", "T-гр.", "T-драст.", "S-MAX", "S-SUM", "S-гр.", "S-драст."],
                [[row.get("x"), row.get("not_a1"), row.get("t_min"), row.get("t_prod"), row.get("t_bounded"), row.get("t_drastic"), row.get("s_max"), row.get("s_sum"), row.get("s_bounded"), row.get("s_drastic")] for row in result.get("operations", [])],
            ),
        ])
    elif task == "task2":
        candidates = source.get("candidates", [])
        characteristics = source.get("characteristics", [])
        specialties = source.get("specialties", [])
        recommendations = result.get("recommendations", [])
        markdown.extend([
            "## Композиция нечётких отношений",
            f"**Задача:** {source.get('task_title', '—')}",
            "",
            "## Итоговый выбор",
        ])
        if recommendations:
            for item in recommendations:
                markdown.append(
                    f"- **{item.get('specialty')}**: выбрать **{item.get('recommended_candidate')}** "
                    f"({item.get('confidence')}). {item.get('explanation')}"
                )
        else:
            markdown.append("Итоговая рекомендация не сформирована: проверьте входные матрицы.")
        markdown.extend([
            "",
            "### Почему этому можно доверять",
            "В отчёте сравниваются две композиции: max-min как осторожная оценка соответствия и max-prod как более чувствительная оценка силы связи. Если оба метода выбирают один и тот же вариант, рекомендация считается согласованной.",
            "",
            "### Матрица R1: важность характеристик для целевых вариантов",
            _build_md_matrix(characteristics, specialties, source.get("R1", [])),
            "",
            "### Матрица R2: выраженность характеристик у кандидатов",
            _build_md_matrix(characteristics, candidates, source.get("R2", [])),
            "",
            "### Матрица max-min",
            _build_md_matrix(candidates, specialties, result.get("max_min", {}).get("matrix", [])),
            "",
            "### Матрица max-prod",
            _build_md_matrix(candidates, specialties, result.get("max_prod", {}).get("matrix", [])),
            "",
            "### Лучший кандидат для каждой специальности",
        ])
        if recommendations:
            markdown.extend([
                _build_md_table(
                    [
                        "Целевой вариант",
                        "Рекомендация",
                        "Надёжность",
                        "max-min",
                        "Отрыв",
                        "max-prod",
                        "Отрыв",
                    ],
                    [
                        [
                            item.get("specialty"),
                            item.get("recommended_candidate"),
                            item.get("confidence"),
                            f"{item.get('max_min_candidate')} ({_fmt_float(item.get('max_min_value'))})",
                            _fmt_float(item.get("max_min_margin")),
                            f"{item.get('max_prod_candidate')} ({_fmt_float(item.get('max_prod_value'))})",
                            _fmt_float(item.get("max_prod_margin")),
                        ]
                        for item in recommendations
                    ],
                ),
                "",
            ])
        rows = []
        best = result.get("best_match", {})
        for mm, mp in zip(best.get("max_min", []), best.get("max_prod", [])):
            rows.append([
                mm.get("specialty"),
                mm.get("candidate"),
                mm.get("value"),
                mp.get("candidate"),
                mp.get("value"),
            ])
        markdown.append(_build_md_table(["Специальность", "max-min", "Значение", "max-prod", "Значение"], rows))
    elif task == "inference":
        candidate = result.get("candidate_name", source.get("candidate_name", "Кандидат"))
        crisp_values = result.get("crisp_values", source.get("crisp_values", {}))
        fuzzification = result.get("fuzzification", {})
        rules = result.get("rule_results", [])
        active_rules = [rule for rule in rules if float(rule.get("strength") or 0) > 0]
        strongest_rules = sorted(active_rules, key=lambda rule: float(rule.get("strength") or 0), reverse=True)[:3]
        output_score = result.get("defuzzified")
        interpretation = result.get("interpretation", "—")
        active_terms = {}
        for rule in active_rules:
            term = rule.get("consequent_term", "—")
            active_terms[term] = max(active_terms.get(term, 0.0), float(rule.get("strength") or 0))
        support_text = ", ".join(
            f"{term}: max сила {_fmt_float(strength)}" for term, strength in sorted(active_terms.items(), key=lambda item: item[1], reverse=True)
        ) or "активных правил нет"
        markdown.extend([
            "## Нечёткий логический вывод Мамдани",
            f"**Кандидат:** {candidate}",
            f"**Итог:** **{interpretation}** ({_fmt_float(output_score)})",
            "",
            "## Вывод",
            (
                f"Система активировала {len(active_rules)} правил из {len(rules)}. "
                f"После агрегации выходных термов и дефаззификации центроидом получена оценка "
                f"{_fmt_float(output_score)} из 100. Рекомендуемый ответ: **{interpretation}**."
            ),
            f"Поддержка выходных термов по активным правилам: {support_text}.",
            _fuzzy_inference_recommendation_text(interpretation, output_score),
            "",
            "### Входные значения",
            _build_md_table(["Переменная", "Значение"], [[name, _fmt_float(value)] for name, value in crisp_values.items()]),
            "",
            "### Фаззификация",
        ])
        fuzz_rows = []
        for var_name, terms in fuzzification.items():
            for term_name, mu in terms.items():
                fuzz_rows.append([var_name, term_name, _fmt_float(mu)])
        markdown.append(_build_md_table(["Переменная", "Терм", "μ"], fuzz_rows))
        markdown.extend([
            "",
            "### Применение правил",
        ])
        rule_rows = []
        for rule in rules:
            condition = " AND ".join(
                f"{item.get('var_name')}={item.get('term')} (μ={_fmt_float(item.get('mu'))})"
                for item in rule.get("antecedents", [])
            )
            rule_rows.append([
                rule.get("index"),
                condition,
                rule.get("consequent_term"),
                _fmt_float(rule.get("strength")),
            ])
        markdown.append(_build_md_table(["#", "IF", "THEN", "Сила"], rule_rows))
        if strongest_rules:
            markdown.extend([
                "",
                "### Правила, которые сильнее всего повлияли на вывод",
                _build_md_table(
                    ["#", "Выходной терм", "Сила", "Почему важно"],
                    [
                        [
                            rule.get("index"),
                            rule.get("consequent_term"),
                            _fmt_float(rule.get("strength")),
                            "Это правило задаёт верхний уровень обрезки consequent и напрямую участвует в агрегированной функции.",
                        ]
                        for rule in strongest_rules
                    ],
                ),
            ])
        steps = result.get("steps", {})
        markdown.extend([
            "",
            "### Дефаззификация",
            "Используется центроид на сетке 201 точка:",
            "`x̄ = Σ(xᵢ · μᵢ) / Σμᵢ`",
            f"- Числитель: {_fmt_float(steps.get('numerator'))}",
            f"- Знаменатель: {_fmt_float(steps.get('denominator'))}",
            f"- Итог: {_fmt_float(output_score)}",
            "",
            "### Почему итог можно принять как решение",
            "Метод Мамдани не выбирает ответ по одному порогу. Он учитывает все сработавшие экспертные правила, обрезает соответствующие выходные термы по силе активации, объединяет их максимумом и только после этого переводит итоговую нечёткую область в число. Поэтому итоговая оценка отражает совокупную поддержку правил, а не произвольное одиночное условие.",
        ])
    else:
        markdown.append("Неизвестная подзадача модуля нечётких множеств.")

    return {
        "run_id": run_id,
        "algorithm_id": "fuzzy_sets",
        "markdown": "\n".join(markdown),
    }


def _report_fuzzy_inference(run_id, payload, result):
    report = _report_fuzzy_sets(run_id, {"task": "inference", "input": payload}, result)
    report["algorithm_id"] = "fuzzy_inference"
    return report


def _fuzzy_inference_recommendation_text(interpretation, score):
    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        numeric_score = None

    if "Высок" in str(interpretation):
        detail = "кандидата можно считать предпочтительным для выбранной роли"
    elif "Сред" in str(interpretation):
        detail = "кандидат подходит условно: стоит проверить слабые характеристики или усилить требования правилами"
    elif "Низ" in str(interpretation):
        detail = "кандидата не стоит выбирать без пересмотра входных оценок или требований"
    else:
        detail = "решение требует экспертной проверки"

    if numeric_score is None:
        return f"Практическая интерпретация: {detail}."
    return (
        f"Практическая интерпретация: итоговая оценка {numeric_score:.2f} из 100 означает, "
        f"что {detail}."
    )


def _report_decision_tree(run_id, payload, result):
    thresholds = result.get("thresholds", payload.get("thresholds", {}))
    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Решающее дерево",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
        "## Пороги",
        f"- T1: {thresholds.get('x1')}",
        f"- T2: {thresholds.get('x2')}",
        f"- T3: {thresholds.get('x3')}",
        "",
        "## Итоговая классификация",
    ]
    rows = []
    for item in result.get("results", []):
        rows.append([item.get("name"), item.get("x1"), item.get("x2"), item.get("x3"), item.get("verdict")])
    markdown.append(_build_md_table(["Кандидат", "X1", "X2", "X3", "Вердикт"], rows))
    markdown.extend(["", "## Пошаговый вывод"])
    for item in result.get("results", []):
        markdown.append("")
        markdown.append(f"### {item.get('name')} — {item.get('verdict')}")
        for step in item.get("steps", []):
            markdown.append(f"- {step}")

    return {
        "run_id": run_id,
        "algorithm_id": "decision_tree",
        "markdown": "\n".join(markdown),
    }


def _report_id3(run_id, payload, result):
    stats = result.get("stats", {})
    distribution = stats.get("class_distribution", {})
    distribution_text = ", ".join(f"{label}: {count}" for label, count in distribution.items()) or "—"
    tree = result.get("tree", {})
    root_feature = stats.get("root_feature") or tree.get("feature")
    root_gains = stats.get("root_gains", [])
    root_gain = next((item.get("gain") for item in root_gains if item.get("feature") == root_feature), None)
    target = payload.get("target") or "целевой класс"
    markdown = [
        "# Отчёт по расчёту",
        "",
        "**Метод:** Алгоритмическое дерево решений (ID3)",
        "",
        f'<span style="color:#9ca3af; font-size:0.9em;">Run ID: {run_id}</span>',
        "",
        "## Краткий вывод",
        f"Задача: **{payload.get('task_title') or stats.get('task_title') or '—'}**.",
        f"Дерево построено по {stats.get('objects_count')} объектам и {stats.get('features_count')} категориальным признакам. Целевой класс: **{target}**.",
        f"Начальная неопределённость выборки H(S) = **{_fmt_float(stats.get('root_entropy'), 3)} бит**. Распределение классов: {distribution_text}.",
    ]
    if root_feature:
        markdown.append(
            f"Корневым выбран признак **{root_feature}**, потому что он даёт максимальный информационный выигрыш"
            f"{f' IG = {_fmt_float(root_gain, 3)}' if root_gain is not None else ''}."
        )
    else:
        markdown.append("Все объекты в обучающей выборке уже относятся к одному классу, поэтому дерево состоит из одного листа.")
    markdown.extend([
        "",
        "## Что означают показатели",
        "- **H(S)** показывает смешанность классов до разбиения: 0 бит означает, что все объекты одного класса; чем значение выше, тем сильнее неопределённость.",
        "- **IG(S,A)** показывает, насколько признак A уменьшает неопределённость. ID3 выбирает признак с максимальным IG.",
        "",
        "## Информационный выигрыш в корне",
        _build_md_table(
            ["Признак", "IG"],
            [[item.get("feature"), _fmt_float(item.get("gain"), 3)] for item in root_gains],
        ),
        "",
        "Вывод: первый вопрос дерева — это признак с максимальным IG. Именно он лучше всего разделяет обучающие объекты по целевому классу.",
        "",
        "## Дерево",
        "```text",
        *_render_id3_tree(result.get("tree", {})),
        "```",
        "",
        "## Как использовать дерево",
        "Для нового объекта нужно идти от корня: на каждом внутреннем узле выбрать ветку, равную значению соответствующего признака. Когда путь приходит в лист, значение листа и есть предсказанный класс.",
        "",
        "## Пошаговые вычисления",
    ])
    for index, step in enumerate(result.get("steps", []), start=1):
        path = " → ".join(f"{item.get('feature')}={item.get('value')}" for item in step.get("path", [])) or "корень"
        markdown.extend([
            "",
            f"### Узел {index}: {path}",
            f"- Размер подвыборки: {step.get('samples')}",
            f"- Распределение классов: {', '.join(f'{k}: {v}' for k, v in (step.get('distribution') or {}).items())}",
            f"- H(S) = {_fmt_float(step.get('entropy'), 3)}",
            f"- Выбран признак: **{step.get('selected_feature')}**",
            _build_md_table(
                ["Признак", "IG"],
                [[item.get("feature"), _fmt_float(item.get("gain"), 3)] for item in step.get("gains", [])],
            ),
        ])
    return {"run_id": run_id, "algorithm_id": "id3", "markdown": "\n".join(markdown)}


def _build_multi_criteria_charts(optimum, is_feasible):
    """Строит столбчатую диаграмму значений критериев в оптимальной точке."""
    if not optimum or not is_feasible:
        return ""

    names = list(optimum.keys())
    values = list(optimum.values())

    fig, ax = plt.subplots(figsize=(_chart_width(len(names), base=6.0, max_width=12.0, per_label=0.4), 3))
    colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    bar_colors = [colors[i % len(colors)] for i in range(len(names))]
    ax.bar(names, values, color=bar_colors)
    ax.set_title("Значения критериев в оптимальной точке")
    ax.set_ylabel("Значение")
    _style_category_axis(ax, names)
    fig.tight_layout()
    b64 = _fig_to_base64(fig)
    plt.close(fig)

    return f"![Значения критериев](data:image/png;base64,{b64})"


def _attach_report_files(report, run_id, algorithm_id, payload, result):
    output_dir, base_dir = _get_output_dir()
    os.makedirs(output_dir, exist_ok=True)

    # Формат имени: hh_mm_dd_mm_yy (локальное время)
    now = datetime.now()
    file_stem = now.strftime("%H_%M_%d_%m_%y")

    # Если файл с таким именем уже существует — добавляем суффикс
    csv_path = os.path.join(output_dir, f"{file_stem}.csv")
    pdf_path = os.path.join(output_dir, f"{file_stem}.pdf")
    counter = 1
    while os.path.exists(csv_path) or os.path.exists(pdf_path):
        candidate = f"{file_stem}_{counter}"
        csv_path = os.path.join(output_dir, f"{candidate}.csv")
        pdf_path = os.path.join(output_dir, f"{candidate}.pdf")
        counter += 1

    _write_report_csv(csv_path, algorithm_id, payload, result)
    _write_report_pdf(pdf_path, algorithm_id, payload, result)

    report["csv_path"] = os.path.relpath(csv_path, base_dir)
    report["pdf_path"] = os.path.relpath(pdf_path, base_dir)
    report["report_filename"] = os.path.splitext(os.path.basename(csv_path))[0]


def _get_output_dir():
    if has_app_context():
        output_dir = current_app.config.get("REPORT_OUTPUT_DIR", "reports")
        base_dir = os.path.dirname(current_app.root_path)
    else:
        output_dir = "reports"
        base_dir = os.getcwd()

    if os.path.isabs(output_dir):
        return output_dir, base_dir
    return os.path.join(base_dir, output_dir), base_dir


def _write_report_csv(path, algorithm_id, payload, result):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["section", "name", "value", "value_percent"])
        writer.writerow(["meta", "algorithm", algorithm_id, ""])

        if algorithm_id == "ahp":
            criteria = payload.get("criteria", [])
            weights = result.get("weights", [])
            ranking = result.get("ranking", [])
            consistency = result.get("consistency", {})

            writer.writerow(["", "", "", ""])
            writer.writerow(["criteria_weights", "", "", ""])
            for name, weight in zip(criteria, weights):
                writer.writerow(["criteria_weight", name, weight, weight * 100])

            writer.writerow(["", "", "", ""])
            writer.writerow(["ranking", "", "", ""])
            for item in ranking:
                writer.writerow([
                    "ranking",
                    item.get("alternative"),
                    item.get("score"),
                    item.get("score_percent"),
                ])

            if consistency:
                writer.writerow(["", "", "", ""])
                writer.writerow(["consistency", "cr", consistency.get("cr"), ""])
                writer.writerow([
                    "consistency",
                    "is_consistent",
                    consistency.get("is_consistent"),
                    "",
                ])

        elif algorithm_id == "multi_criteria":
            optimum = result.get("optimum", {})
            ranking = result.get("ranking", [])
            is_feasible = result.get("is_feasible", False)

            writer.writerow(["", "", "", ""])
            writer.writerow(["feasibility", "is_feasible", is_feasible, ""])

            if ranking:
                solution = ranking[0].get("solution", [])
                obj_value = ranking[0].get("objective_value", 0)
                writer.writerow(["", "", "", ""])
                writer.writerow(["solution", "", "", ""])
                for i, val in enumerate(solution):
                    writer.writerow(["solution", f"x{i + 1}", val, ""])
                writer.writerow(["objective", "value", obj_value, ""])

            writer.writerow(["", "", "", ""])
            writer.writerow(["criteria_values", "", "", ""])
            for name, val in optimum.items():
                writer.writerow(["criteria_value", name, val, ""])
        elif algorithm_id == "pair_games":
            player1 = payload.get("player1_name", "Игрок 1")
            player2 = payload.get("player2_name", "Игрок 2")
            writer.writerow(["players", "player1", player1, ""])
            writer.writerow(["players", "player2", player2, ""])

            writer.writerow(["", "", "", ""])
            writer.writerow(["game_value", "", result.get("value"), ""])

            saddle = result.get("saddle_point", {})
            if saddle.get("exists"):
                writer.writerow(["saddle_point", "exists", True, ""])
                for point in saddle.get("points", []):
                    writer.writerow([
                        "saddle_point",
                        f"{point.get('row')}:{point.get('col')}",
                        point.get("value"),
                        "",
                    ])
            mixed = result.get("mixed_strategies")
            if mixed:
                writer.writerow(["", "", "", ""])
                writer.writerow(["mixed_strategies", "player1", "", ""])
                for name, prob in zip(mixed.get("player1", {}).get("strategies", []), mixed.get("player1", {}).get("probabilities", [])):
                    writer.writerow(["player1_strategy", name, prob, ""])
                writer.writerow(["mixed_strategies", "player2", "", ""])
                for name, prob in zip(mixed.get("player2", {}).get("strategies", []), mixed.get("player2", {}).get("probabilities", [])):
                    writer.writerow(["player2_strategy", name, prob, ""])
        elif algorithm_id == "nature_games":
            writer.writerow(["decision_maker", "", payload.get("decision_maker", ""), ""])
            writer.writerow(["hurwicz_lambda", "", payload.get("lambda", 0.5), ""])

            writer.writerow(["", "", "", ""])
            writer.writerow(["criteria_recommendations", "", "", ""])
            criteria = result.get("criteria", {})
            for key, block in criteria.items():
                rec = ", ".join(block.get("recommended_strategies", []) or [])
                writer.writerow([key, rec, block.get("value"), ""])
        elif algorithm_id in ("fuzzy_sets", "fuzzy_inference"):
            if algorithm_id == "fuzzy_inference":
                task = "inference"
                source = payload
            else:
                task = payload.get("task")
                source = payload.get("input", {})
            writer.writerow(["task", "", task, ""])
            if task == "task1":
                writer.writerow(["concept", "", result.get("concept", source.get("concept", "")), ""])
                writer.writerow(["", "", "", ""])
                writer.writerow(["values", "x", "a1", "a2"])
                for row in result.get("values", []):
                    writer.writerow(["value", row.get("x"), row.get("a1"), row.get("a2")])
                writer.writerow(["", "", "", ""])
                writer.writerow(["operations", "x", "t_min", "s_max"])
                for row in result.get("operations", []):
                    writer.writerow(["operation", row.get("x"), row.get("t_min"), row.get("s_max")])
            elif task == "task2":
                candidates = source.get("candidates", [])
                specialties = source.get("specialties", [])
                recommendations = result.get("recommendations", [])
                if recommendations:
                    writer.writerow(["", "", "", ""])
                    writer.writerow(["recommendations", "specialty", "candidate", "confidence"])
                    for item in recommendations:
                        writer.writerow([
                            "recommendation",
                            item.get("specialty"),
                            item.get("recommended_candidate"),
                            item.get("confidence"),
                        ])
                for method_key in ("max_min", "max_prod"):
                    writer.writerow(["", "", "", ""])
                    writer.writerow([method_key, "candidate", "specialty", "value"])
                    matrix = result.get(method_key, {}).get("matrix", [])
                    for i, row in enumerate(matrix):
                        candidate = candidates[i] if i < len(candidates) else i + 1
                        for j, value in enumerate(row):
                            specialty = specialties[j] if j < len(specialties) else j + 1
                            writer.writerow([method_key, candidate, specialty, value])
            elif task == "inference":
                writer.writerow(["candidate", "", result.get("candidate_name", source.get("candidate_name", "")), ""])
                writer.writerow(["result", "interpretation", result.get("interpretation"), result.get("defuzzified")])
                writer.writerow(["", "", "", ""])
                writer.writerow(["fuzzification", "variable", "term", "mu"])
                for var_name, terms in result.get("fuzzification", {}).items():
                    for term_name, mu in terms.items():
                        writer.writerow(["fuzzification", var_name, term_name, mu])
                writer.writerow(["", "", "", ""])
                writer.writerow(["rules", "index", "consequent", "strength"])
                for rule in result.get("rule_results", []):
                    writer.writerow(["rule", rule.get("index"), rule.get("consequent_term"), rule.get("strength")])
        elif algorithm_id == "decision_tree":
            thresholds = result.get("thresholds", payload.get("thresholds", {}))
            writer.writerow(["threshold", "T1", thresholds.get("x1"), ""])
            writer.writerow(["threshold", "T2", thresholds.get("x2"), ""])
            writer.writerow(["threshold", "T3", thresholds.get("x3"), ""])
            writer.writerow(["", "", "", ""])
            writer.writerow(["classification", "candidate", "verdict", ""])
            for item in result.get("results", []):
                writer.writerow(["classification", item.get("name"), item.get("verdict"), ""])
        elif algorithm_id == "id3":
            stats = result.get("stats", {})
            writer.writerow(["root_entropy", "", stats.get("root_entropy"), ""])
            writer.writerow(["root_feature", "", stats.get("root_feature"), ""])
            writer.writerow(["", "", "", ""])
            writer.writerow(["root_gains", "feature", "gain", ""])
            for item in stats.get("root_gains", []):
                writer.writerow(["root_gain", item.get("feature"), item.get("gain"), ""])


def _write_report_pdf(path, algorithm_id, payload, result):
    lines = [
        "Отчёт по расчёту",
        f"Метод: {algorithm_id}",
        "",
    ]

    if algorithm_id == "ahp":
        criteria = payload.get("criteria", [])
        weights = result.get("weights", [])
        ranking = result.get("ranking", [])
        consistency = result.get("consistency", {})

        lines.append("Веса критериев:")
        for name, weight in zip(criteria, weights):
            lines.append(f"- {name}: {weight:.4f} ({weight * 100:.2f}%)")

        lines.append("")
        lines.append("Рейтинг альтернатив:")
        for idx, item in enumerate(ranking, start=1):
            lines.append(
                f"{idx}. {item.get('alternative')} — {item.get('score'):.4f} "
                f"({item.get('score_percent'):.2f}%)"
            )

        if consistency:
            lines.append("")
            lines.append(
                f"Согласованность: CR={consistency.get('cr', 0.0):.4f}"
            )
    elif algorithm_id == "multi_criteria":
        optimum = result.get("optimum", {})
        ranking_mc = result.get("ranking", [])
        is_feasible = result.get("is_feasible", False)
        main_crit = payload.get("main_criterion", "—")

        lines.append(f"Главный критерий: {main_crit}")
        lines.append(f"Допустимое решение: {'Да' if is_feasible else 'Нет'}")

        if is_feasible and ranking_mc:
            solution = ranking_mc[0].get("solution", [])
            obj_value = ranking_mc[0].get("objective_value", 0)
            sol_str = ", ".join(f"{v:.4f}" for v in solution)
            lines.append(f"Решение: x = ({sol_str})")
            lines.append(f"Значение целевой функции: {obj_value:.4f}")
            lines.append("")
            lines.append("Значения критериев:")
            for name, val in optimum.items():
                lines.append(f"- {name}: {val:.4f}")
        else:
            lines.append("Допустимое решение не найдено.")
    elif algorithm_id == "pair_games":
        lines.append(f"Игрок 1: {payload.get('player1_name', 'Игрок 1')}")
        lines.append(f"Игрок 2: {payload.get('player2_name', 'Игрок 2')}")
        lines.append("")
        lines.append(f"Значение игры: {result.get('value')}")

        saddle = result.get("saddle_point", {})
        if saddle.get("exists"):
            lines.append("Седловая точка: да")
            for point in saddle.get("points", []):
                lines.append(
                    f"- ({point.get('row')}, {point.get('col')}) = {point.get('value')}"
                )
        else:
            lines.append("Седловая точка: нет")
            mixed = result.get("mixed_strategies")
            if mixed:
                lines.append("Смешанные стратегии:")
                for name, prob in zip(mixed.get("player1", {}).get("strategies", []), mixed.get("player1", {}).get("probabilities", [])):
                    lines.append(f"- {name}: {prob}")
    elif algorithm_id == "nature_games":
        lines.append(f"ЛПР: {payload.get('decision_maker', '')}")
        lines.append(f"Коэффициент Гурвица: {payload.get('lambda', 0.5)}")
        lines.append("")
        lines.append("Рекомендуемые стратегии:")
        criteria = result.get("criteria", {})
        for key, block in criteria.items():
            rec = ", ".join(block.get("recommended_strategies", []) or [])
            value = block.get("value")
            lines.append(f"- {key}: {rec} (значение: {value})")
    elif algorithm_id in ("fuzzy_sets", "fuzzy_inference"):
        if algorithm_id == "fuzzy_inference":
            task = "inference"
            source = payload
        else:
            task = payload.get("task")
            source = payload.get("input", {})
        lines.append(f"Подзадача: {task}")
        if task == "task1":
            lines.append(f"Понятие: {result.get('concept', source.get('concept', ''))}")
            x0 = result.get("x0_values", {})
            lines.append(f"x0: {x0.get('x')}, A1={x0.get('a1')}, A2={x0.get('a2')}, A3={x0.get('a3')}")
            props = result.get("a2_properties", {})
            lines.append(f"Носитель A2: {props.get('support_label') or props.get('support')}")
        elif task == "task2":
            best = result.get("best_match", {})
            recommendations = result.get("recommendations", [])
            lines.append(f"Задача: {source.get('task_title', '')}")
            if recommendations:
                lines.append("Итоговый выбор:")
                for item in recommendations:
                    lines.append(
                        f"- {item.get('specialty')}: {item.get('recommended_candidate')} "
                        f"({item.get('confidence')}); {item.get('explanation')}"
                    )
                lines.append("")
            lines.append("Лучшие кандидаты max-min:")
            for item in best.get("max_min", []):
                lines.append(f"- {item.get('specialty')}: {item.get('candidate')} ({item.get('value')})")
        elif task == "inference":
            lines.append(f"Кандидат: {result.get('candidate_name', source.get('candidate_name', ''))}")
            lines.append(f"Итог: {result.get('interpretation')} ({result.get('defuzzified')})")
            lines.append("")
            lines.append("Входные значения:")
            for name, value in result.get("crisp_values", source.get("crisp_values", {})).items():
                lines.append(f"- {name}: {value}")
            lines.append("")
            lines.append("Активные правила:")
            for rule in result.get("rule_results", []):
                if float(rule.get("strength") or 0) > 0:
                    lines.append(f"- #{rule.get('index')}: {rule.get('consequent_term')}, сила {rule.get('strength')}")
            steps = result.get("steps", {})
            lines.append(f"Центроид: числитель={steps.get('numerator')}, знаменатель={steps.get('denominator')}")
    elif algorithm_id == "decision_tree":
        thresholds = result.get("thresholds", payload.get("thresholds", {}))
        lines.append(f"T1={thresholds.get('x1')}, T2={thresholds.get('x2')}, T3={thresholds.get('x3')}")
        lines.append("")
        lines.append("Классификация:")
        for item in result.get("results", []):
            lines.append(f"- {item.get('name')}: {item.get('verdict')} (X1={item.get('x1')}, X2={item.get('x2')}, X3={item.get('x3')})")
    elif algorithm_id == "id3":
        stats = result.get("stats", {})
        lines.append(f"H(S): {stats.get('root_entropy')} бит")
        lines.append(f"Корневой признак: {stats.get('root_feature')}")
        lines.append("Информационный выигрыш:")
        for item in stats.get("root_gains", []):
            lines.append(f"- {item.get('feature')}: {item.get('gain')}")
    else:
        lines.append("Данные для отчёта будут добавлены позже.")

    with PdfPages(path) as pdf:
        fig = plt.figure(figsize=(8.27, 11.69))
        ax = fig.add_subplot(111)
        ax.axis("off")

        y = 1.0
        line_height = 0.03
        for line in lines:
            wrapped = textwrap.wrap(line, width=100) or [""]
            for part in wrapped:
                ax.text(0.02, y, part, fontsize=10, va="top")
                y -= line_height
                if y < 0.05:
                    break
            if y < 0.05:
                break

        pdf.savefig(fig, bbox_inches="tight")
        plt.close(fig)

        if algorithm_id == "ahp":
            criteria = payload.get("criteria", [])
            weights = result.get("weights", [])
            ranking = result.get("ranking", [])

            if criteria and weights:
                fig_weights, ax_weights = plt.subplots(figsize=(_chart_width(len(criteria), base=8.27, max_width=9.5, per_label=0.32), 4.5))
                ax_weights.bar(criteria, weights, color="#3b82f6")
                ax_weights.set_title("Веса критериев")
                ax_weights.set_ylabel("Вес")
                ax_weights.set_ylim(0, max(weights) * 1.2 if weights else 1)
                _style_category_axis(ax_weights, criteria)
                fig_weights.tight_layout()
                pdf.savefig(fig_weights, bbox_inches="tight")
                plt.close(fig_weights)

            if ranking:
                names = [r.get("alternative") for r in ranking]
                scores = [r.get("score") for r in ranking]
                fig_rank, ax_rank = plt.subplots(figsize=(_chart_width(len(names), base=8.27, max_width=9.5, per_label=0.32), 4.5))
                ax_rank.bar(names, scores, color="#10b981")
                ax_rank.set_title("Рейтинг альтернатив")
                ax_rank.set_ylabel("Приоритет")
                ax_rank.set_ylim(0, max(scores) * 1.2 if scores else 1)
                _style_category_axis(ax_rank, names)
                fig_rank.tight_layout()
                pdf.savefig(fig_rank, bbox_inches="tight")
                plt.close(fig_rank)

        elif algorithm_id == "multi_criteria":
            optimum = result.get("optimum", {})
            is_feasible = result.get("is_feasible", False)
            if optimum and is_feasible:
                names_mc = list(optimum.keys())
                values_mc = list(optimum.values())
                colors_mc = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
                bar_colors_mc = [colors_mc[i % len(colors_mc)] for i in range(len(names_mc))]
                fig_mc, ax_mc = plt.subplots(
                    figsize=(_chart_width(len(names_mc), base=8.27, max_width=9.5, per_label=0.32), 4.5)
                )
                ax_mc.bar(names_mc, values_mc, color=bar_colors_mc)
                ax_mc.set_title("Значения критериев в оптимальной точке")
                ax_mc.set_ylabel("Значение")
                _style_category_axis(ax_mc, names_mc)
                fig_mc.tight_layout()
                pdf.savefig(fig_mc, bbox_inches="tight")
                plt.close(fig_mc)


def _build_multi_criteria_charts(optimum, is_feasible):
    """Строит столбчатую диаграмму значений критериев в оптимальной точке."""
    if not optimum or not is_feasible:
        return ""

    names = list(optimum.keys())
    values = list(optimum.values())

    fig, ax = plt.subplots(figsize=(_chart_width(len(names), base=6.0, max_width=12.0, per_label=0.4), 3))
    colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    bar_colors = [colors[i % len(colors)] for i in range(len(names))]
    ax.bar(names, values, color=bar_colors)
    ax.set_title("Значения критериев в оптимальной точке")
    ax.set_ylabel("Значение")
    _style_category_axis(ax, names)
    fig.tight_layout()
    b64 = _fig_to_base64(fig)
    plt.close(fig)

    return f"![Значения критериев](data:image/png;base64,{b64})"


def _build_ahp_charts(criteria, weights, ranking):
    if not criteria or not weights:
        return ""

    fig, ax = plt.subplots(figsize=(_chart_width(len(criteria), base=6.0, max_width=12.0, per_label=0.4), 3))
    ax.bar(criteria, weights, color="#3b82f6")
    ax.set_title("Веса критериев")
    ax.set_ylabel("Вес")
    ax.set_ylim(0, max(weights) * 1.2 if weights else 1)
    _style_category_axis(ax, criteria)
    fig.tight_layout()
    weights_b64 = _fig_to_base64(fig)
    plt.close(fig)

    if ranking:
        names = [r.get("alternative") for r in ranking]
        scores = [r.get("score") for r in ranking]
        fig2, ax2 = plt.subplots(figsize=(_chart_width(len(names), base=6.0, max_width=12.0, per_label=0.4), 3))
        ax2.bar(names, scores, color="#10b981")
        ax2.set_title("Рейтинг альтернатив")
        ax2.set_ylabel("Приоритет")
        ax2.set_ylim(0, max(scores) * 1.2 if scores else 1)
        _style_category_axis(ax2, names)
        fig2.tight_layout()
        ranking_b64 = _fig_to_base64(fig2)
        plt.close(fig2)
    else:
        ranking_b64 = ""

    parts = [f"![Веса критериев](data:image/png;base64,{weights_b64})"]
    if ranking_b64:
        parts.append(f"![Рейтинг альтернатив](data:image/png;base64,{ranking_b64})")
    return "\n\n".join(parts)


def _render_matrix_section(title, row_labels, col_labels, matrix):
    lines = ["", f"### {title}"]
    lines.append(_build_md_matrix(row_labels, col_labels, matrix))
    return lines


def _render_weights_section(title, labels, weights):
    rows = []
    for name, value in zip(labels, weights):
        rows.append([name, _fmt_float(value)])
    table = _build_md_table(["Элемент", "Вес"], rows) if rows else ""
    lines = ["", f"### {title}"]
    if table:
        lines.append(table)
    return lines


def _build_md_table(headers, rows):
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    body_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line] + body_lines)


def _build_md_matrix(row_labels, col_labels, matrix):
    safe_rows = matrix or []
    headers = [""] + [str(label) for label in col_labels]
    rows = []
    for idx, row in enumerate(safe_rows):
        label = row_labels[idx] if idx < len(row_labels) else str(idx + 1)
        rows.append([label] + [_fmt_float(value) for value in row])
    return _build_md_table(headers, rows)


def _render_id3_tree(node, prefix=""):
    if not node:
        return ["—"]
    if node.get("type") == "leaf":
        return [f"{prefix}→ {node.get('class')}"]
    lines = [f"{prefix}{node.get('feature')}"]
    children = node.get("children") or {}
    for value, child in children.items():
        child_lines = _render_id3_tree(child, prefix + "  ")
        lines.append(f"{prefix}├── {value}: {child_lines[0].strip()}")
        lines.extend(child_lines[1:])
    return lines


def _fmt_float(value, precision=4):
    try:
        return f"{float(value):.{precision}f}"
    except (TypeError, ValueError):
        return str(value)


def _pair_game_conclusion(recommendation, value, is_zero_sum):
    if not recommendation:
        return "Рекомендация не сформирована: проверьте входные данные и матрицы выигрышей."

    p1 = recommendation.get("player1_best") or []
    p2 = recommendation.get("player2_best") or []
    if is_zero_sum:
        if recommendation.get("type") == "pure":
            return (
                f"Игроку 1 лучше выбрать **{', '.join(p1)}**. "
                f"Это седловая точка: при рациональной игре соперника гарантируется цена игры "
                f"**{_fmt_float(value)}**, а одностороннее отклонение не улучшает результат."
            )
        return (
            "Лучший выбор здесь не одна чистая стратегия, а **смешанная стратегия**. "
            f"Активные стратегии игрока 1: **{', '.join(p1)}**; цена игры "
            f"**{_fmt_float(value)}**. Вероятности ниже показывают, как именно смешивать варианты, "
            "чтобы соперник не мог систематически воспользоваться предсказуемостью."
        )

    payoffs = recommendation.get("payoffs") or {}
    return (
        f"Рекомендуемое равновесие Нэша: игрок 1 использует **{', '.join(p1) or '—'}**, "
        f"игрок 2 использует **{', '.join(p2) or '—'}**. Ожидаемые выигрыши: "
        f"{_fmt_float(payoffs.get('player1'))} для игрока 1 и "
        f"{_fmt_float(payoffs.get('player2'))} для игрока 2. В этой точке никому не выгодно "
        "отклоняться в одиночку."
    )


def _render_probability_profile(title, profile, player1_name, player2_name):
    lines = ["", f"## {title}"]
    p1 = profile.get("player1", {})
    p2 = profile.get("player2", {})

    rows = []
    for name, probability in zip(p1.get("strategies", []), p1.get("probabilities", [])):
        rows.append([name, _fmt_float(probability), f"{float(probability) * 100:.2f}%"])
    if rows:
        lines.extend([
            "",
            f"### {player1_name}",
            _build_md_table(["Стратегия", "Вероятность", "Доля"], rows),
        ])

    rows = []
    for name, probability in zip(p2.get("strategies", []), p2.get("probabilities", [])):
        rows.append([name, _fmt_float(probability), f"{float(probability) * 100:.2f}%"])
    if rows:
        lines.extend([
            "",
            f"### {player2_name}",
            _build_md_table(["Стратегия", "Вероятность", "Доля"], rows),
        ])

    note = profile.get("note")
    if note:
        lines.append(f"> {note}")
    return lines


def _nature_game_conclusion(recommendation):
    best = recommendation.get("best_strategy")
    best_all = recommendation.get("best_strategies") or []
    confidence = recommendation.get("confidence", 0.0)
    criteria = recommendation.get("criteria_considered") or []

    if not best:
        return "Итоговый выбор не сформирован: нет доступных критериев с рекомендациями."
    if len(best_all) > 1:
        return (
            "Лучшие варианты по совокупности критериев: **"
            + ", ".join(best_all)
            + f"**. Они набрали одинаковую поддержку; доля поддержки лидеров "
            f"{confidence * 100:.1f}% от учтенных критериев ({len(criteria)} критериев)."
        )
    return (
        f"Лучший вариант: **{best}**. Он получает наибольшую поддержку среди критериев "
        f"({confidence * 100:.1f}% от учтенных критериев, всего критериев: {len(criteria)}). "
        "Поэтому его стоит выбрать как наиболее устойчивый к неопределенности вариант."
    )


def _criterion_title(key):
    titles = {
        "wald": "Вальд",
        "savage": "Сэвидж",
        "hurwicz": "Гурвиц",
        "laplace": "Лаплас",
        "bayes": "Байес",
    }
    return titles.get(str(key), str(key).capitalize())


def _criterion_report_reason(key):
    reasons = {
        "wald": "Критерий защищает от худшего сценария.",
        "savage": "Критерий выбирает вариант с минимальным максимальным сожалением.",
        "hurwicz": "Критерий взвешивает худший и лучший исходы через коэффициент Гурвица.",
        "laplace": "Критерий считает состояния природы равновероятными.",
        "bayes": "Критерий использует заданные вероятности состояний природы.",
    }
    return reasons.get(str(key), "")


def _translate_hurwicz_text(text):
    return text or "Коэффициент показывает, насколько сильно решение смещено к осторожности или оптимизму."


def _translate_criterion_reason(text):
    return text or "Критерий поддерживает указанную стратегию."


def _build_ahp_intermediate(criteria, alternatives, matrix, alt_matrices):
    if not criteria or not alternatives or not matrix:
        return {}

    criteria_norm = _normalize_matrix(matrix)
    criteria_weights = _calculate_weights(criteria_norm)

    alt_norm = {}
    alt_weights = {}
    for crit in criteria:
        alt_matrix = alt_matrices.get(crit)
        if not alt_matrix:
            continue
        norm = _normalize_matrix(alt_matrix)
        alt_norm[crit] = norm
        alt_weights[crit] = _calculate_weights(norm)

    synthesis_matrix = []
    if alt_weights:
        for alt_idx in range(len(alternatives)):
            row = []
            for crit in criteria:
                weights_for_crit = alt_weights.get(crit)
                row.append(weights_for_crit[alt_idx] if weights_for_crit else 0.0)
            synthesis_matrix.append(row)

    final_scores = []
    if synthesis_matrix:
        for row in synthesis_matrix:
            score = 0.0
            for idx, value in enumerate(row):
                if idx < len(criteria_weights):
                    score += value * criteria_weights[idx]
            final_scores.append(score)

    return {
        "criteria_matrix": matrix,
        "criteria_norm": criteria_norm,
        "criteria_weights": criteria_weights,
        "alt_matrices": alt_matrices,
        "alt_norm": alt_norm,
        "alt_weights": alt_weights,
        "synthesis_matrix": synthesis_matrix,
        "final_scores": final_scores,
    }


def _normalize_matrix(matrix):
    size = len(matrix)
    column_sums = [0.0 for _ in range(size)]
    for j in range(size):
        for i in range(size):
            column_sums[j] += matrix[i][j]

    normalized = [[0.0 for _ in range(size)] for _ in range(size)]
    for i in range(size):
        for j in range(size):
            normalized[i][j] = matrix[i][j] / column_sums[j] if column_sums[j] else 0.0
    return normalized


def _calculate_weights(normalized_matrix):
    size = len(normalized_matrix)
    weights = [0.0 for _ in range(size)]
    for i in range(size):
        row_sum = 0.0
        for j in range(size):
            row_sum += normalized_matrix[i][j]
        weights[i] = row_sum / size if size else 0.0
    return weights


def _chart_width(label_count, base=6.0, max_width=12.0, per_label=0.4):
    if not label_count:
        return base
    width = max(base, per_label * label_count)
    return min(max_width, width)


def _style_category_axis(ax, labels):
    if not labels:
        return
    label_count = len(labels)
    if label_count >= 12:
        rotation = 60
        size = 8
    elif label_count >= 8:
        rotation = 45
        size = 9
    else:
        rotation = 0
        size = 10
    ax.tick_params(axis="x", labelsize=size)
    for tick in ax.get_xticklabels():
        tick.set_rotation(rotation)
        tick.set_ha("right" if rotation else "center")
    ax.margins(x=0.02)


def _fig_to_base64(fig):
    """Вспомогательная: matplotlib Figure → base64-строка PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    return encoded
