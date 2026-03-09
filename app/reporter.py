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
from bson.objectid import ObjectId
from flask import current_app, has_app_context

from app.db import get_db


matplotlib.use("Agg")


def generate_report(run_id):
    """Возвращает сохранённый отчёт по run_id или None."""
    db = get_db()
    report_doc = db.reports.find_one({"run_id": run_id})
    if report_doc:
        return report_doc.get("report")

    try:
        obj_id = ObjectId(run_id)
    except Exception:
        obj_id = None
    run_doc = db.runs.find_one({"_id": obj_id}) if obj_id else None
    if run_doc is None:
        return None
    if run_doc.get("status") != "done":
        return {"error": "Run is not finished yet", "status": run_doc.get("status")}

    report = build_report(run_id, run_doc.get("algorithm_id"), run_doc.get("input", {}), run_doc.get("result", {}))
    db.reports.insert_one({
        "run_id": run_id,
        "algorithm_id": run_doc.get("algorithm_id"),
        "report": report,
        "created_at": datetime.now(timezone.utc),
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


def _build_multi_criteria_charts(optimum, is_feasible):
    """Строит столбчатую диаграмму значений критериев в оптимальной точке."""
    if not optimum or not is_feasible:
        return ""

    names = list(optimum.keys())
    values = list(optimum.values())

    fig, ax = plt.subplots(figsize=(6, 3))
    colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    bar_colors = [colors[i % len(colors)] for i in range(len(names))]
    ax.bar(names, values, color=bar_colors)
    ax.set_title("Значения критериев в оптимальной точке")
    ax.set_ylabel("Значение")
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
                fig_weights, ax_weights = plt.subplots(figsize=(8.27, 4.5))
                ax_weights.bar(criteria, weights, color="#3b82f6")
                ax_weights.set_title("Веса критериев")
                ax_weights.set_ylabel("Вес")
                ax_weights.set_ylim(0, max(weights) * 1.2 if weights else 1)
                fig_weights.tight_layout()
                pdf.savefig(fig_weights, bbox_inches="tight")
                plt.close(fig_weights)

            if ranking:
                names = [r.get("alternative") for r in ranking]
                scores = [r.get("score") for r in ranking]
                fig_rank, ax_rank = plt.subplots(figsize=(8.27, 4.5))
                ax_rank.bar(names, scores, color="#10b981")
                ax_rank.set_title("Рейтинг альтернатив")
                ax_rank.set_ylabel("Приоритет")
                ax_rank.set_ylim(0, max(scores) * 1.2 if scores else 1)
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
                fig_mc, ax_mc = plt.subplots(figsize=(8.27, 4.5))
                ax_mc.bar(names_mc, values_mc, color=bar_colors_mc)
                ax_mc.set_title("Значения критериев в оптимальной точке")
                ax_mc.set_ylabel("Значение")
                fig_mc.tight_layout()
                pdf.savefig(fig_mc, bbox_inches="tight")
                plt.close(fig_mc)




def _build_ahp_charts(criteria, weights, ranking):
    if not criteria or not weights:
        return ""

    fig, ax = plt.subplots(figsize=(6, 3))
    ax.bar(criteria, weights, color="#3b82f6")
    ax.set_title("Веса критериев")
    ax.set_ylabel("Вес")
    ax.set_ylim(0, max(weights) * 1.2 if weights else 1)
    fig.tight_layout()
    weights_b64 = _fig_to_base64(fig)
    plt.close(fig)

    if ranking:
        names = [r.get("alternative") for r in ranking]
        scores = [r.get("score") for r in ranking]
        fig2, ax2 = plt.subplots(figsize=(6, 3))
        ax2.bar(names, scores, color="#10b981")
        ax2.set_title("Рейтинг альтернатив")
        ax2.set_ylabel("Приоритет")
        ax2.set_ylim(0, max(scores) * 1.2 if scores else 1)
        fig2.tight_layout()
        ranking_b64 = _fig_to_base64(fig2)
        plt.close(fig2)
    else:
        ranking_b64 = ""

    parts = [f"![Веса критериев](data:image/png;base64,{weights_b64})"]
    if ranking_b64:
        parts.append(f"![Рейтинг альтернатив](data:image/png;base64,{ranking_b64})")
    return "\n\n".join(parts)




def _fig_to_base64(fig):
    """Вспомогательная: matplotlib Figure → base64-строка PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    return encoded
