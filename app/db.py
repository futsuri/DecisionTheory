from flask import current_app, g


# ---------------------------------------------------------------------------
#  Подключение к PostgreSQL
# ---------------------------------------------------------------------------

def _import_psycopg():
    try:
        import psycopg
        from psycopg.rows import dict_row
        from psycopg.types.json import Jsonb
    except Exception as exc:
        raise RuntimeError(
            "psycopg is required for PostgreSQL access. "
            "Install psycopg[binary] or provide libpq."
        ) from exc
    return psycopg, dict_row, Jsonb


def get_conn():
    """Возвращает соединение PostgreSQL, привязанное к app-контексту (g)."""
    conn = g.get("_pg_conn")
    if conn is None:
        psycopg, dict_row, _ = _import_psycopg()
        conn = psycopg.connect(
            current_app.config["POSTGRES_DSN"],
            connect_timeout=current_app.config["POSTGRES_CONNECT_TIMEOUT"],
            row_factory=dict_row,
        )
        conn.autocommit = True
        g._pg_conn = conn
    return conn


def init_db():
    """Пингует PostgreSQL и создаёт необходимые таблицы/индексы."""
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT 1")

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                algorithm_id TEXT NOT NULL,
                input JSONB NOT NULL,
                status TEXT NOT NULL,
                result JSONB,
                error TEXT,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        cur.execute("CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs (created_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS runs_algorithm_id_idx ON runs (algorithm_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS runs_status_idx ON runs (status)")

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id BIGSERIAL PRIMARY KEY,
                run_id TEXT NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
                algorithm_id TEXT NOT NULL,
                report JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        cur.execute("CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports (created_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS reports_algorithm_id_idx ON reports (algorithm_id)")

    return conn


def close_db(_=None):
    """Закрывает соединение при разрушении app-контекста."""
    conn = g.pop("_pg_conn", None)
    if conn is not None:
        conn.close()


def _to_jsonb(value):
    if value is None:
        return None
    _, _, Jsonb = _import_psycopg()
    return Jsonb(value)


# ---------------------------------------------------------------------------
#  Хелперы для работы с таблицами
# ---------------------------------------------------------------------------

def insert_run(doc):
    conn = get_conn()
    conn.execute(
        """
        INSERT INTO runs (id, algorithm_id, input, status, result, error, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            doc["id"],
            doc["algorithm_id"],
            _to_jsonb(doc.get("input")),
            doc.get("status"),
            _to_jsonb(doc.get("result")),
            doc.get("error"),
            doc.get("created_at"),
            doc.get("updated_at"),
        ),
    )
    return doc["id"]


def update_run(run_id, updates):
    if not updates:
        return

    columns = []
    values = []
    for key, value in updates.items():
        if key in {"input", "result"}:
            value = _to_jsonb(value)
        columns.append(f"{key} = %s")
        values.append(value)

    values.append(run_id)
    sql = f"UPDATE runs SET {', '.join(columns)} WHERE id = %s"
    conn = get_conn()
    conn.execute(sql, values)


def get_run(run_id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM runs WHERE id = %s", (run_id,)).fetchone()
    return row


def insert_report(doc):
    conn = get_conn()
    conn.execute(
        """
        INSERT INTO reports (run_id, algorithm_id, report, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            doc.get("run_id"),
            doc.get("algorithm_id"),
            _to_jsonb(doc.get("report")),
            doc.get("created_at"),
            doc.get("updated_at"),
        ),
    )


def get_report(run_id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM reports WHERE run_id = %s", (run_id,)).fetchone()
    return row


def list_reports(limit, offset):
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT id, run_id, algorithm_id, report, created_at
        FROM reports
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    ).fetchall()
    return rows


def count_reports():
    conn = get_conn()
    row = conn.execute("SELECT COUNT(*) AS count FROM reports").fetchone()
    return row["count"] if row else 0


def clear_reports():
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM reports")
        reports_deleted = cur.rowcount
        cur.execute("DELETE FROM runs")
        runs_deleted = cur.rowcount
    return reports_deleted, runs_deleted
