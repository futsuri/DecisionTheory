"""
app/__init__.py — Создание Flask-приложения, роуты, подключение MongoDB.
Статический фронтенд сервируется из папки frontend/.
"""
import os

from flask import Flask, jsonify, request, send_file, send_from_directory

from app.config import Config
from app.db import close_db, init_db
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

    @app.route("/<path:filename>")
    def frontend_static(filename):
        """Отдаёт любой файл из frontend/ (html, css, js)."""
        return send_from_directory(frontend_dir, filename)

    # ------------------------------------------------------------------
    #  Инициализация MongoDB
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
        output_dir = app.config.get("REPORT_OUTPUT_DIR", "reports")
        base_dir = os.path.dirname(os.path.dirname(__file__))
        csv_path = os.path.join(base_dir, output_dir, f"{run_id}.csv")
        if not os.path.exists(csv_path):
            return jsonify({"error": "not found"}), 404
        return send_file(
            csv_path,
            as_attachment=True,
            download_name=f"{run_id}.csv",
            mimetype="text/csv",
        )

    @app.route("/api/reports/<run_id>/pdf", methods=["GET"])
    def report_pdf_route(run_id):
        """Скачать PDF-отчёт по run_id."""
        output_dir = app.config.get("REPORT_OUTPUT_DIR", "reports")
        base_dir = os.path.dirname(os.path.dirname(__file__))
        pdf_path = os.path.join(base_dir, output_dir, f"{run_id}.pdf")
        if not os.path.exists(pdf_path):
            return jsonify({"error": "not found"}), 404
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"{run_id}.pdf",
            mimetype="application/pdf",
        )

    # ------------------------------------------------------------------
    #  Ошибки
    # ------------------------------------------------------------------

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "not found"}), 404

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"error": "internal error"}), 500

    # Закрываем Mongo-соединение при разрушении контекста
    app.teardown_appcontext(close_db)
    return app
