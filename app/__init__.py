"""
app/__init__.py — Создание Flask-приложения, роуты, подключение MongoDB.
Статический фронтенд сервируется из папки frontend/.
"""
import os

from flask import Flask, jsonify, request, send_from_directory

from app.config import Config
from app.db import close_db, init_db
from app.reporter import generate_report
from app.run_service import create_job, get_job, list_jobs, run_job


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

    @app.route("/<path:filename>")
    def frontend_static(filename):
        """Отдаёт любой файл из frontend/ (html, css, js)."""
        return send_from_directory(frontend_dir, filename)

    # ------------------------------------------------------------------
    #  Health / Readiness
    # ------------------------------------------------------------------

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
    #  Jobs CRUD
    # ------------------------------------------------------------------

    @app.route("/api/v1/jobs", methods=["POST"])
    def create_job_route():
        """Создать задачу (method + payload)."""
        payload = request.get_json(silent=True)
        try:
            job = create_job(payload)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(job), 201

    @app.route("/api/v1/jobs", methods=["GET"])
    def list_jobs_route():
        """Список задач с опциональными фильтрами ?method=&status=&limit=."""
        method = request.args.get("method")
        status = request.args.get("status")
        limit = request.args.get("limit", 50, type=int)
        jobs = list_jobs(method=method, status=status, limit=limit)
        return jsonify(jobs)

    @app.route("/api/v1/jobs/<job_id>", methods=["GET"])
    def get_job_route(job_id):
        """Получить задачу по ID."""
        job = get_job(job_id)
        if job is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(job)

    # ------------------------------------------------------------------
    #  Запуск вычисления
    # ------------------------------------------------------------------

    @app.route("/api/v1/jobs/<job_id>/run", methods=["POST"])
    def run_job_route(job_id):
        """Запустить алгоритм для задачи."""
        result = run_job(job_id)
        if result is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(result)

    # ------------------------------------------------------------------
    #  Отчёт
    # ------------------------------------------------------------------

    @app.route("/api/v1/jobs/<job_id>/report", methods=["GET"])
    def report_route(job_id):
        """Сгенерировать отчёт по завершённой задаче."""
        report = generate_report(job_id)
        if report is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(report)

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
