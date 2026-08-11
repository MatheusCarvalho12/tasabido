import atexit
import os
import shutil
import tempfile
from collections.abc import Generator
from pathlib import Path

# Sobrescreve as settings ANTES de qualquer import do app: aponta para o banco
# de testes dedicado (criado nesta fixture) e um JWT_SECRET determinístico.
# Banco de teste dedicado; workers em paralelo podem isolar o próprio banco via
# TASABIDO_TEST_DB (o TRUNCATE de uma sessão derruba a outra no mesmo banco).
_TEST_DB_NAME = os.environ.get("TASABIDO_TEST_DB", "tasabido_test")
os.environ.setdefault(
    "DATABASE_URL",
    f"postgresql+psycopg://tasabido:tasabido@localhost:5432/{_TEST_DB_NAME}",
)
os.environ["JWT_SECRET"] = "test-secret-with-at-least-32-bytes"
# Uploads de SVG dos testes vão para um diretório temporário (apagado no fim da
# sessão) — o storage real em backend/storage nunca é tocado pelos testes.
_TEST_STORAGE_DIR = tempfile.mkdtemp(prefix="tasabido-storage-test-")
atexit.register(shutil.rmtree, _TEST_STORAGE_DIR, ignore_errors=True)
os.environ["STORAGE_DIR"] = _TEST_STORAGE_DIR

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
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (_TEST_DB_NAME,))
        if cur.fetchone() is None:
            cur.execute(f'CREATE DATABASE "{_TEST_DB_NAME}"')


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
