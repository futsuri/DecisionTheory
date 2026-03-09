from flask import current_app, g
from pymongo import MongoClient


# ---------------------------------------------------------------------------
#  Подключение к MongoDB (аналог mongo.py в референсе)
# ---------------------------------------------------------------------------

def get_client():
    """Возвращает MongoClient, привязанный к текущему app-контексту (g)."""
    client = g.get("_mongo_client")
    if client is None:
        client = MongoClient(
            current_app.config["MONGO_URI"],
            serverSelectionTimeoutMS=current_app.config["MONGO_TIMEOUT_MS"],
        )
        g._mongo_client = client
    return client


def get_db():
    """Возвращает объект базы данных."""
    return get_client()[current_app.config["MONGO_DB_NAME"]]


def init_db():
    """Пингует Mongo и создаёт необходимые индексы."""
    db = get_db()
    db.command("ping")

    # Индексы
    db.jobs.create_index("created_at")
    db.jobs.create_index("method")
    db.jobs.create_index("status")
    db.runs.create_index("created_at")
    db.runs.create_index("algorithm_id")
    db.runs.create_index("status")
    db.reports.create_index("run_id", unique=True)
    db.reports.create_index("created_at")
    db.reports.create_index("algorithm_id")
    return db


def close_db(_=None):
    """Закрывает соединение при разрушении app-контекста."""
    client = g.pop("_mongo_client", None)
    if client is not None:
        client.close()


# ---------------------------------------------------------------------------
#  Хелперы для работы с коллекциями
# ---------------------------------------------------------------------------

def insert_doc(collection_name, doc):
    """Вставляет документ и возвращает его _id (str)."""
    db = get_db()
    result = db[collection_name].insert_one(doc)
    return str(result.inserted_id)


def find_doc(collection_name, filter_dict):
    """Ищет один документ по фильтру."""
    db = get_db()
    return db[collection_name].find_one(filter_dict)


def update_doc(collection_name, filter_dict, update_dict):
    """Обновляет один документ ($set)."""
    db = get_db()
    db[collection_name].update_one(filter_dict, {"$set": update_dict})
