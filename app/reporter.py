"""
reporter.py — Генерация отчёта (markdown + base64-графики).
"""
import base64
import csv
import io
import os
import textwrap

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
        "report": report,
    })
    return report


def build_report(run_id, algorithm_id, payload, result):
    """Генерирует отчёт (markdown с inline base64 изображениями)."""
    if algorithm_id == "ahp":
        report = _report_ahp(run_id, payload, result)
        _attach_report_files(report, run_id, algorithm_id, payload, result)
        return report
    if algorithm_id == "multi_criteria":
        report = {
            "run_id": run_id,
            "algorithm_id": algorithm_id,
            "markdown": "# Отчёт\n\nМногокритериальная оптимизация в разработке.",
        }
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
        f"**Run ID:** {run_id}",
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


def _attach_report_files(report, run_id, algorithm_id, payload, result):
    output_dir, base_dir = _get_output_dir()
    os.makedirs(output_dir, exist_ok=True)

    csv_path = os.path.join(output_dir, f"{run_id}.csv")
    pdf_path = os.path.join(output_dir, f"{run_id}.pdf")

    _write_report_csv(csv_path, algorithm_id, payload, result)
    _write_report_pdf(pdf_path, algorithm_id, payload, result)

    report["csv_path"] = os.path.relpath(csv_path, base_dir)
    report["pdf_path"] = os.path.relpath(pdf_path, base_dir)


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
