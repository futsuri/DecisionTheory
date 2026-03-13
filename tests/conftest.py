"""
conftest.py — Фикстуры pytest для тестирования Flask-приложения.
"""
import pytest

from app import create_app


@pytest.fixture()
def app():
    """Создаёт тестовое Flask-приложение с TESTING=True."""
    test_config = {
        "TESTING": True,
        "POSTGRES_DSN": "postgresql://decision_user:decision_pass@localhost:5432/decision_theory_test",
    }
    _app = create_app(test_config=test_config)
    yield _app


@pytest.fixture()
def client(app):
    """Тестовый HTTP-клиент Flask."""
    return app.test_client()


@pytest.fixture()
def app_ctx(app):
    """Application context для прямого вызова сервисов."""
    with app.app_context():
        yield app
