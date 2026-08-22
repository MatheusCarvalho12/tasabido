import ast
from pathlib import Path

import pytest

from app.tracing import DEFAULT_PAUSE_GRACE_MS, MAX_PAUSE_GRACE_MS

MIGRATION = Path(__file__).parents[1] / "alembic/versions/0003_tracing_backend.py"


def _migration_module():
    tree = ast.parse(MIGRATION.read_text(encoding="utf-8"))
    function = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "historical_run_status"
    )
    namespace: dict[str, object] = {}
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(MIGRATION), "exec"), namespace)
    return namespace["historical_run_status"]


@pytest.mark.parametrize(
    ("score", "duration_seconds", "expected"),
    [(90, 120, "completed"), (0, 0, "completed"), (None, 120, "legacy"), (90, None, "legacy")],
)
def test_historical_status_rule_is_explicit_and_does_not_fabricate_evidence(
    score: int | None, duration_seconds: int | None, expected: str
) -> None:
    historical_run_status = _migration_module()
    assert historical_run_status(score, duration_seconds) == expected


def test_tracing_migration_is_one_forward_revision_and_keeps_legacy_evidence_null() -> None:
    source = MIGRATION.read_text(encoding="utf-8")
    assert 'revision: str = "0003"' in source
    assert 'down_revision: str | None = "0002"' in source
    assert "INSERT INTO game_defaults" in source
    assert all(field in source for field in ("evidence", "evidence_sha256", "evidence_version"))
    assert all(
        field in source for field in ("glyph_set_id", "glyph_set_version", "glyph_set_sha256")
    )
    assert "HISTORICAL_RUN_VALIDITY" in source
    assert "THEN 'completed' ELSE 'legacy' END" in source
    assert "UPDATE game_runs SET status" in source
    assert "nullable=True" in source
    assert "ix_game_runs_last_activity_at" in source
    assert "score/duration nullable" in source


def test_migration_declares_field_level_override_bounds() -> None:
    source = MIGRATION.read_text(encoding="utf-8")
    for field in (
        "glyph_set_id_override",
        "threshold_override",
        "contact_mode_override",
        "pause_grace_ms_override",
    ):
        assert f'"{field}"' in source
    assert "DEFAULT_PAUSE_GRACE_MS" in source
    assert "MAX_PAUSE_GRACE_MS" in source
    assert DEFAULT_PAUSE_GRACE_MS == 1500
    assert MAX_PAUSE_GRACE_MS == 3000
    assert "ix_game_runs_retention" in source
    assert "'cancelled'" not in source
