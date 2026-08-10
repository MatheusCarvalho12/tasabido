import os
from collections.abc import Generator
from pathlib import Path

# Sobrescreve as settings ANTES de qualquer import do app: aponta para o banco
# de testes dedicado (criado nesta fixture) e um JWT_SECRET determinístico.
os.environ["DATABASE_URL"] = "postgresql+psycopg://tasabido:tasabido@localhost:5432/tasabido_test"
os.environ["JWT_SECRET"] = "test-secret-with-at-least-32-bytes"

import psycopg  # noqa: E402
import pytest  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from alembic import command  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _ensure_test_database() -> None:
    with (
        psycopg.connect(
            "postgresql://tasabido:tasabido@localhost:5432/postgres", autocommit=True
        ) as conn,
        conn.cursor() as cur,
    ):
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'tasabido_test'")
        if cur.fetchone() is None:
            cur.execute("CREATE DATABASE tasabido_test")


def _run_migrations() -> None:
    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(alembic_cfg, "head")


@pytest.fixture(scope="session", autouse=True)
def _database() -> None:
    _ensure_test_database()
    _run_migrations()


@pytest.fixture(autouse=True)
def _clean_users() -> Generator[None]:
    from app.database import engine

    with engine.begin() as conn:
        # CASCADE: children referencia users (ON DELETE CASCADE).
        conn.execute(text("TRUNCATE TABLE users CASCADE"))
    yield


@pytest.fixture()
def client() -> Generator[TestClient]:
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
