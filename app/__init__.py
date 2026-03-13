"""
app/__init__.py — Создание Flask-приложения, роуты, подключение PostgreSQL.
Статический фронтенд сервируется из папки frontend/.
"""
import os
from datetime import timezone

from flask import Flask, jsonify, request, send_file, send_from_directory

from app.config import Config
from app.db import (
    close_db,
    count_reports,
    get_report,
    get_run,
    init_db,
    list_reports,
    clear_reports,
)
from app.reporter import generate_report
from app.run_service import create_run, list_algorithms


def create_app(test_config=None):
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    # ------------------------------------------------------------------
    #  Frontend — статические файлы из ../frontend
    # ------------------------------------------------------------------
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

    @app.route("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/input")
    def input_page():
        return send_from_directory(frontend_dir, "input.html")

    @app.route("/report")
    def report_page():
        return send_from_directory(frontend_dir, "report.html")

    @app.route("/history")
    def history_page():
        return send_from_directory(frontend_dir, "history.html")

    @app.route("/<path:filename>")
    def frontend_static(filename):
        """Отдаёт любой файл из frontend/ (html, css, js)."""
        return send_from_directory(frontend_dir, filename)

    # ------------------------------------------------------------------
    #  Инициализация PostgreSQL
    # ------------------------------------------------------------------
    with app.app_context():
        try:
            init_db()
        except Exception:
            pass

    # ------------------------------------------------------------------
    #  Health / Readiness
    # ------------------------------------------------------------------

    @app.route("/health", methods=["GET"])
    def health_root():
        return jsonify({"status": "ok"})

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "env": app.config["APP_ENV"]})

    @app.route("/api/ready", methods=["GET"])
    def ready():
        try:
            init_db()
            return jsonify({"status": "ok"})
        except Exception as exc:
            return jsonify({"status": "error", "detail": str(exc)}), 503

    # ------------------------------------------------------------------
    #  Алгоритмы
    # ------------------------------------------------------------------

    @app.route("/api/algorithms", methods=["GET"])
    def algorithms_route():
        return jsonify(list_algorithms())

    # ------------------------------------------------------------------
    #  Запуск вычисления
    # ------------------------------------------------------------------

    @app.route("/api/runs", methods=["POST"])
    def create_run_route():
        """Создать run и запустить алгоритм."""
        payload = request.get_json(silent=True) or {}
        algorithm_id = payload.get("algorithm_id")
        input_data = payload.get("input")

        if not algorithm_id:
            return jsonify({"error": "'algorithm_id' is required"}), 400
        if input_data is None or not isinstance(input_data, dict):
            return jsonify({"error": "'input' must be a JSON object"}), 400

        try:
            run_id = create_run(algorithm_id, input_data)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
        return jsonify({"run_id": run_id}), 201

    @app.route("/api/runs/<run_id>", methods=["GET"])
    def run_route(run_id):
        """Получить входные данные run по run_id."""
        run_doc = get_run(run_id)
        if not run_doc:
            return jsonify({"error": "not found"}), 404
        return jsonify({
            "run_id": run_doc.get("id"),
            "algorithm_id": run_doc.get("algorithm_id"),
            "input": run_doc.get("input"),
        })

    # ------------------------------------------------------------------
    #  Отчёт
    # ------------------------------------------------------------------

    @app.route("/api/reports/<run_id>", methods=["GET"])
    def report_route(run_id):
        """Получить отчёт по run_id."""
        report = generate_report(run_id)
        if report is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(report)

    @app.route("/api/reports/<run_id>/csv", methods=["GET"])
    def report_csv_route(run_id):
        """Скачать CSV-отчёт по run_id."""
        base_dir = os.path.dirname(os.path.dirname(__file__))
        csv_path = _resolve_report_file(run_id, "csv", base_dir, app)
        if csv_path is None or not os.path.exists(csv_path):
            return jsonify({"error": "not found"}), 404
        download_name = os.path.basename(csv_path)
        return send_file(
            csv_path,
            as_attachment=True,
            download_name=download_name,
            mimetype="text/csv",
        )

    @app.route("/api/reports/<run_id>/pdf", methods=["GET"])
    def report_pdf_route(run_id):
        """Скачать PDF-отчёт по run_id."""
        base_dir = os.path.dirname(os.path.dirname(__file__))
        pdf_path = _resolve_report_file(run_id, "pdf", base_dir, app)
        if pdf_path is None or not os.path.exists(pdf_path):
            return jsonify({"error": "not found"}), 404
        download_name = os.path.basename(pdf_path)
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/pdf",
        )

    # ------------------------------------------------------------------
    #  Список отчётов (история)
    # ------------------------------------------------------------------

    @app.route("/api/reports", methods=["GET"])
    def reports_list_route():
        """Список всех отчётов для страницы истории."""
        try:
            page = request.args.get("page", 1, type=int)
            limit = request.args.get("limit", 50, type=int)
            limit = min(limit, 200)
            skip = (page - 1) * limit

            rows = list_reports(limit, skip)
            total = count_reports()

            items = []
            for doc in rows:
                report_data = doc.get("report", {})
                report_name = report_data.get("report_filename", "")
                if not report_name and doc.get("created_at"):
                    # created_at хранится в UTC — конвертируем в локальное
                    utc_dt = doc["created_at"].replace(tzinfo=timezone.utc)
                    local_dt = utc_dt.astimezone()
                    report_name = local_dt.strftime("%H_%M_%d_%m_%y")

                created_at_raw = doc.get("created_at")
                if created_at_raw:
                    created_at_str = created_at_raw.isoformat()
                else:
                    created_at_str = None

                items.append({
                    "id": str(doc.get("id", "")),
                    "run_id": doc.get("run_id", ""),
                    "algorithm_id": doc.get("algorithm_id") or report_data.get("algorithm_id", "unknown"),
                    "report_name": report_name,
                    "created_at": created_at_str,
                })

            return jsonify({
                "items": items,
                "total": total,
                "page": page,
                "limit": limit,
            })
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/reports", methods=["DELETE"])
    def reports_clear_route():
        """Очистить всю историю отчётов."""
        try:
            reports_deleted, _ = clear_reports()
            return jsonify({"deleted": reports_deleted})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    # ------------------------------------------------------------------
    #  Ошибки
    # ------------------------------------------------------------------

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "not found"}), 404

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"error": "internal error"}), 500

    @app.route("/api/docs", methods=["GET"])
    def api_docs():
        """Документация по API сайта (JSON)."""
        return jsonify({
            "title": "DecisionTheory API",
            "version": "1.0",
            "base_url": "/",
            "endpoints": [
                {
                    "method": "GET",
                    "path": "/health",
                    "description": "Проверка доступности приложения.",
                },
                {
                    "method": "GET",
                    "path": "/api/health",
                    "description": "Проверка API и среды выполнения.",
                },
                {
                    "method": "GET",
                    "path": "/api/ready",
                    "description": "Проверка готовности БД.",
                },
                {
                    "method": "GET",
                    "path": "/api/algorithms",
                    "description": "Список доступных алгоритмов.",
                },
                {
                    "method": "POST",
                    "path": "/api/runs",
                    "description": "Создать расчет (run).",
                    "body": {
                        "algorithm_id": "ahp | multi_criteria",
                        "input": "object",
                    },
                    "responses": {
                        "201": {"run_id": "uuid"},
                    },
                },
                {
                    "method": "GET",
                    "path": "/api/runs/<run_id>",
                    "description": "Получить входные данные run.",
                },
                {
                    "method": "GET",
                    "path": "/api/reports",
                    "description": "Список отчетов с пагинацией.",
                    "query": {
                        "page": "int (default 1)",
                        "limit": "int (default 50, max 200)",
                    },
                },
                {
                    "method": "DELETE",
                    "path": "/api/reports",
                    "description": "Удалить историю отчетов.",
                },
                {
                    "method": "GET",
                    "path": "/api/reports/<run_id>",
                    "description": "Получить отчет по run_id.",
                },
                {
                    "method": "GET",
                    "path": "/api/reports/<run_id>/csv",
                    "description": "Скачать CSV отчет.",
                },
                {
                    "method": "GET",
                    "path": "/api/reports/<run_id>/pdf",
                    "description": "Скачать PDF отчет.",
                },
            ],
        })

    @app.route("/docs", methods=["GET"])
    def docs_page():
        """HTML-документация веб-сервиса."""
        return """
<!DOCTYPE html>
<html lang=\"ru\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Документация API</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; color: #0f172a; }
    h1, h2 { color: #1e40af; }
    code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; }
    pre { background: #f8fafc; padding: 1rem; border-radius: 8px; overflow: auto; }
    .endpoint { margin: 1rem 0; padding: 0.8rem; border: 1px solid #e2e8f0; border-radius: 8px; }
    .method { font-weight: 700; }
  </style>
</head>
<body>
  <h1>Документация веб-сервиса</h1>
  <p>Дата обновления: 13.03.2026</p>

  <h2>Базовые проверки</h2>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/health</code></div>
    <p>Проверка доступности приложения.</p>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/health</code></div>
    <p>Проверка API и среды выполнения.</p>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/ready</code></div>
    <p>Проверка готовности базы данных.</p>
  </div>

  <h2>Алгоритмы</h2>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/algorithms</code></div>
    <p>Список доступных алгоритмов.</p>
  </div>

  <h2>Запуски (runs)</h2>
  <div class=\"endpoint\">
    <div><span class=\"method\">POST</span> <code>/api/runs</code></div>
    <p>Создать расчет и получить <code>run_id</code>.</p>
    <pre>{
  "algorithm_id": "ahp | multi_criteria",
  "input": { ... }
}</pre>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/runs/&lt;run_id&gt;</code></div>
    <p>Получить входные данные run.</p>
  </div>

  <h2>Отчеты</h2>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/reports</code></div>
    <p>Список отчетов с пагинацией. Параметры: <code>page</code>, <code>limit</code>.</p>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/reports/&lt;run_id&gt;</code></div>
    <p>Получить отчет по <code>run_id</code>.</p>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/reports/&lt;run_id&gt;/csv</code></div>
    <p>Скачать CSV-отчет.</p>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">GET</span> <code>/api/reports/&lt;run_id&gt;/pdf</code></div>
    <p>Скачать PDF-отчет.</p>
  </div>
  <div class=\"endpoint\">
    <div><span class=\"method\">DELETE</span> <code>/api/reports</code></div>
    <p>Очистить историю отчетов.</p>
  </div>
</body>
</html>
"""

    # Закрываем соединение при разрушении контекста
    app.teardown_appcontext(close_db)
    return app


def _resolve_report_file(run_id, ext, base_dir, app):
    """Находит файл отчёта: сначала по пути из БД, потом fallback по run_id."""
    try:
        report_doc = get_report(run_id)
        if report_doc:
            report_data = report_doc.get("report", {})
            path_key = f"{ext}_path"
            rel_path = report_data.get(path_key)
            if rel_path:
                full_path = os.path.join(base_dir, rel_path)
                if os.path.exists(full_path):
                    return full_path
    except Exception:
        pass

    # Fallback: старый формат {run_id}.ext
    output_dir = app.config.get("REPORT_OUTPUT_DIR", "reports")
    fallback = os.path.join(base_dir, output_dir, f"{run_id}.{ext}")
    if os.path.exists(fallback):
        return fallback

    return None
