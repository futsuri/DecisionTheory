import os


def _get_bool(name, default="0"):
    value = os.getenv(name, default)
    return value.lower() in {"1", "true", "yes", "on"}


class Config:
    APP_ENV = os.getenv("APP_ENV", "dev")
    DEBUG = _get_bool("APP_DEBUG", "0")
    TESTING = _get_bool("APP_TESTING", "0")

    # PostgreSQL
    POSTGRES_DSN = os.getenv(
        "POSTGRES_DSN",
        "postgresql://decision_user:decision_pass@postgres:5432/decision_theory",
    )
    POSTGRES_CONNECT_TIMEOUT = int(os.getenv("POSTGRES_CONNECT_TIMEOUT", "3"))

    # Доступные методы решения
    ALLOWED_METHODS = {"ahp", "multi_criteria"}

    # Лимиты
    MAX_PAYLOAD_SIZE_KB = int(os.getenv("MAX_PAYLOAD_SIZE_KB", "512"))

    # Отчеты
    REPORT_OUTPUT_DIR = os.getenv("REPORT_OUTPUT_DIR", "reports")