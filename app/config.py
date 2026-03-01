import os


def _get_bool(name, default="0"):
    value = os.getenv(name, default)
    return value.lower() in {"1", "true", "yes", "on"}


class Config:
    APP_ENV = os.getenv("APP_ENV", "dev")
    DEBUG = _get_bool("APP_DEBUG", "0")
    TESTING = _get_bool("APP_TESTING", "0")

    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "decision_theory")
    MONGO_TIMEOUT_MS = int(os.getenv("MONGO_TIMEOUT_MS", "3000"))

    # Доступные методы решения
    ALLOWED_METHODS = {"ahp", "multi_criteria"}

    # Лимиты
    MAX_PAYLOAD_SIZE_KB = int(os.getenv("MAX_PAYLOAD_SIZE_KB", "512"))