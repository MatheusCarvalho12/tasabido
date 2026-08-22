"""canonical glyphs and durable tracing evidence

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-22

Legacy rows retain their original values.  Evidence, glyph identity, effective
configuration, and tracing timestamps stay NULL unless they existed before or
are supplied by a tracing writer.
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.glyphs import CANONICAL_GLYPH_ARTIFACT_PATH, canonical_glyph_set
from app.tracing import DEFAULT_PAUSE_GRACE_MS, MAX_PAUSE_GRACE_MS

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

HISTORICAL_RUN_VALIDITY = (
    "score IS NOT NULL AND score >= 0 AND score <= 100 "
    "AND duration_seconds IS NOT NULL AND duration_seconds >= 0"
)


def historical_run_status(score: int | None, duration_seconds: int | None) -> str:
    """Classify pre-tracing rows without inventing tracing evidence."""

    if (
        score is not None
        and 0 <= score <= 100
        and duration_seconds is not None
        and duration_seconds >= 0
    ):
        return "completed"
    return "legacy"


def _canonical_geometry() -> dict[str, list[list[list[float]]]]:
    glyph_set = canonical_glyph_set()
    return {
        grapheme: [[list(point) for point in stroke] for stroke in geometry]
        for grapheme, geometry in glyph_set.geometry.items()
    }


def upgrade() -> None:
    artifact = canonical_glyph_set()
    op.create_table(
        "glyph_sets",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("version", sa.String(length=120), nullable=False),
        sa.Column("artifact_path", sa.String(length=255), nullable=False),
        sa.Column("artifact_sha256", sa.String(length=64), nullable=False),
        sa.Column("geometry", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("immutable", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default=sa.text("'active'"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_glyph_sets"),
        sa.UniqueConstraint("version", name="uq_glyph_sets_version"),
        sa.UniqueConstraint("artifact_sha256", name="uq_glyph_sets_artifact_sha256"),
        sa.CheckConstraint("status IN ('active', 'retired')", name="ck_glyph_sets_status"),
        sa.CheckConstraint("length(artifact_sha256) = 64", name="ck_glyph_sets_artifact_sha256"),
    )
    op.create_index("ix_glyph_sets_status_created", "glyph_sets", ["status", "created_at"])
    # Use an explicitly cast text bind so both a live PostgreSQL upgrade and
    # Alembic's offline SQL renderer can emit the JSONB seed deterministically.
    op.execute(
        sa.text(
            "INSERT INTO glyph_sets "
            "(version, artifact_path, artifact_sha256, geometry, immutable, status) "
            "VALUES (:version, :artifact_path, :artifact_sha256, "
            "CAST(:geometry AS JSONB), :immutable, :status)"
        ).bindparams(
            sa.bindparam("version", artifact.version, type_=sa.String()),
            sa.bindparam("artifact_path", CANONICAL_GLYPH_ARTIFACT_PATH, type_=sa.String()),
            sa.bindparam("artifact_sha256", artifact.artifact_sha256, type_=sa.String()),
            sa.bindparam(
                "geometry",
                json.dumps(_canonical_geometry(), ensure_ascii=False, separators=(",", ":")),
                type_=sa.Text(),
            ),
            sa.bindparam("immutable", True, type_=sa.Boolean()),
            sa.bindparam("status", "active", type_=sa.String()),
        )
    )

    op.create_table(
        "game_defaults",
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("glyph_set_id", sa.Integer(), nullable=False),
        sa.Column("glyph_set_version", sa.String(length=120), nullable=False),
        sa.Column("glyph_set_sha256", sa.String(length=64), nullable=False),
        sa.Column("threshold", sa.Integer(), server_default=sa.text("70"), nullable=False),
        sa.Column(
            "contact_mode",
            sa.String(length=30),
            server_default=sa.text("'strict_continuous'"),
            nullable=False,
        ),
        sa.Column(
            "pause_grace_ms",
            sa.Integer(),
            server_default=sa.text(str(DEFAULT_PAUSE_GRACE_MS)),
            nullable=False,
        ),
        sa.Column("scoring_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("schema_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("game_id", name="pk_game_defaults"),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["glyph_set_id"], ["glyph_sets.id"], name="fk_game_defaults_glyph_set_id"
        ),
        sa.CheckConstraint(
            "threshold >= 0 AND threshold <= 100", name="ck_game_defaults_threshold"
        ),
        sa.CheckConstraint(
            "contact_mode IN ('strict_continuous', 'timed_pause', 'free')",
            name="ck_game_defaults_contact_mode",
        ),
        sa.CheckConstraint(
            f"pause_grace_ms >= 0 AND pause_grace_ms <= {MAX_PAUSE_GRACE_MS}",
            name="ck_game_defaults_pause_grace_ms",
        ),
    )
    op.execute(
        sa.text(
            "INSERT INTO game_defaults "
            "(game_id, glyph_set_id, glyph_set_version, glyph_set_sha256) "
            "SELECT games.id, glyph_sets.id, glyph_sets.version, glyph_sets.artifact_sha256 "
            "FROM games CROSS JOIN glyph_sets "
            "WHERE glyph_sets.version = :version ON CONFLICT (game_id) DO NOTHING"
        ).bindparams(version=artifact.version)
    )

    op.add_column(
        "game_assignments",
        sa.Column("glyph_set_id_override", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_game_assignments_glyph_set_id_override",
        "game_assignments",
        "glyph_sets",
        ["glyph_set_id_override"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.add_column("game_assignments", sa.Column("threshold_override", sa.Integer(), nullable=True))
    op.add_column(
        "game_assignments", sa.Column("contact_mode_override", sa.String(length=30), nullable=True)
    )
    op.add_column(
        "game_assignments", sa.Column("pause_grace_ms_override", sa.Integer(), nullable=True)
    )
    op.create_check_constraint(
        "ck_game_assignments_threshold_override",
        "game_assignments",
        "threshold_override IS NULL OR (threshold_override >= 0 AND threshold_override <= 100)",
    )
    op.create_check_constraint(
        "ck_game_assignments_contact_mode_override",
        "game_assignments",
        "contact_mode_override IS NULL OR contact_mode_override IN "
        "('strict_continuous', 'timed_pause', 'free')",
    )
    op.create_check_constraint(
        "ck_game_assignments_pause_grace_ms_override",
        "game_assignments",
        "pause_grace_ms_override IS NULL OR "
        f"(pause_grace_ms_override >= 0 AND "
        f"pause_grace_ms_override <= {MAX_PAUSE_GRACE_MS})",
    )
    op.create_index(
        "ix_game_assignments_child_created", "game_assignments", ["child_id", "created_at"]
    )

    # Add nullable columns first so existing rows never receive fabricated
    # evidence/configuration/timestamps.  The historical validity rule above
    # is the only thing used to classify the pre-tracing row status.
    op.alter_column("game_runs", "score", existing_type=sa.Integer(), nullable=True)
    op.alter_column("game_runs", "duration_seconds", existing_type=sa.Integer(), nullable=True)
    op.add_column("game_runs", sa.Column("status", sa.String(length=20), nullable=True))
    op.add_column("game_runs", sa.Column("glyph_set_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_game_runs_glyph_set_id", "game_runs", "glyph_sets", ["glyph_set_id"], ["id"]
    )
    op.add_column("game_runs", sa.Column("glyph_set_version", sa.String(length=120), nullable=True))
    op.add_column("game_runs", sa.Column("glyph_set_sha256", sa.String(length=64), nullable=True))
    op.add_column("game_runs", sa.Column("threshold", sa.Integer(), nullable=True))
    op.add_column("game_runs", sa.Column("contact_mode", sa.String(length=30), nullable=True))
    op.add_column("game_runs", sa.Column("pause_grace_ms", sa.Integer(), nullable=True))
    op.add_column("game_runs", sa.Column("scoring_version", sa.Integer(), nullable=True))
    op.add_column("game_runs", sa.Column("schema_version", sa.Integer(), nullable=True))
    op.add_column(
        "game_runs",
        sa.Column("effective_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("game_runs", sa.Column("idempotency_key", sa.String(length=160), nullable=True))
    op.create_unique_constraint("uq_game_runs_idempotency_key", "game_runs", ["idempotency_key"])
    op.add_column("game_runs", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("game_runs", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "game_runs", sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "game_runs", sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )
    op.add_column("game_runs", sa.Column("evidence_sha256", sa.String(length=64), nullable=True))
    op.add_column("game_runs", sa.Column("evidence_version", sa.Integer(), nullable=True))
    op.execute(
        sa.text(
            "UPDATE game_runs SET status = CASE WHEN "
            + HISTORICAL_RUN_VALIDITY
            + " THEN 'completed' ELSE 'legacy' END"
        )
    )
    op.alter_column(
        "game_runs",
        "status",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default=sa.text("'started'"),
    )
    op.create_check_constraint(
        "ck_game_runs_status",
        "game_runs",
        "status IN ('started', 'completed', 'abandoned', 'legacy')",
    )
    op.create_check_constraint(
        "ck_game_runs_score",
        "game_runs",
        "score IS NULL OR (score >= 0 AND score <= 100)",
    )
    op.create_check_constraint(
        "ck_game_runs_glyph_identity",
        "game_runs",
        "evidence IS NULL OR (glyph_set_version IS NOT NULL AND glyph_set_sha256 IS NOT NULL)",
    )
    op.create_check_constraint(
        "ck_game_runs_threshold",
        "game_runs",
        "threshold IS NULL OR (threshold >= 0 AND threshold <= 100)",
    )
    op.create_check_constraint(
        "ck_game_runs_pause_grace_ms",
        "game_runs",
        f"pause_grace_ms IS NULL OR "
        f"(pause_grace_ms >= 0 AND pause_grace_ms <= {MAX_PAUSE_GRACE_MS})",
    )
    op.create_index(
        "ix_game_runs_retention", "game_runs", ["status", "last_activity_at", "completed_at"]
    )
    op.create_index("ix_game_runs_last_activity_at", "game_runs", ["last_activity_at"])
    op.create_index(
        "ix_game_runs_child_status_created", "game_runs", ["child_id", "status", "created_at"]
    )
    op.create_index("ix_game_runs_glyph_set_id", "game_runs", ["glyph_set_id"])

    op.create_table(
        "retention_audit",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("game_run_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("evidence_sha256", sa.String(length=64), nullable=True),
        sa.Column("evidence_version", sa.Integer(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_retention_audit"),
        sa.ForeignKeyConstraint(["game_run_id"], ["game_runs.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "action IN ('retained', 'expired', 'redacted', 'deleted')",
            name="ck_retention_audit_action",
        ),
    )
    op.create_index("ix_retention_audit_game_run_id", "retention_audit", ["game_run_id"])
    op.create_index("ix_retention_audit_retention", "retention_audit", ["occurred_at", "action"])


def downgrade() -> None:
    op.drop_index("ix_retention_audit_retention", table_name="retention_audit")
    op.drop_index("ix_retention_audit_game_run_id", table_name="retention_audit")
    op.drop_table("retention_audit")

    op.drop_index("ix_game_runs_glyph_set_id", table_name="game_runs")
    op.drop_index("ix_game_runs_child_status_created", table_name="game_runs")
    op.drop_index("ix_game_runs_last_activity_at", table_name="game_runs")
    op.drop_index("ix_game_runs_retention", table_name="game_runs")
    for constraint in (
        "ck_game_runs_pause_grace_ms",
        "ck_game_runs_threshold",
        "ck_game_runs_glyph_identity",
        "ck_game_runs_score",
        "ck_game_runs_status",
    ):
        op.drop_constraint(constraint, "game_runs", type_="check")
    op.drop_constraint("uq_game_runs_idempotency_key", "game_runs", type_="unique")
    op.drop_constraint("fk_game_runs_glyph_set_id", "game_runs", type_="foreignkey")
    for column in (
        "evidence_version",
        "evidence_sha256",
        "evidence",
        "last_activity_at",
        "completed_at",
        "started_at",
        "idempotency_key",
        "effective_config",
        "schema_version",
        "scoring_version",
        "pause_grace_ms",
        "contact_mode",
        "threshold",
        "glyph_set_sha256",
        "glyph_set_version",
        "glyph_set_id",
        "status",
    ):
        op.drop_column("game_runs", column)
    # Keep score/duration nullable: new rows may have been started without a
    # final score, and a downgrade must not fail by inventing one.

    op.drop_index("ix_game_assignments_child_created", table_name="game_assignments")
    for constraint in (
        "ck_game_assignments_pause_grace_ms_override",
        "ck_game_assignments_contact_mode_override",
        "ck_game_assignments_threshold_override",
    ):
        op.drop_constraint(constraint, "game_assignments", type_="check")
    op.drop_constraint(
        "fk_game_assignments_glyph_set_id_override", "game_assignments", type_="foreignkey"
    )
    for column in (
        "pause_grace_ms_override",
        "contact_mode_override",
        "threshold_override",
        "glyph_set_id_override",
    ):
        op.drop_column("game_assignments", column)
    op.drop_table("game_defaults")
    op.drop_index("ix_glyph_sets_status_created", table_name="glyph_sets")
    op.drop_table("glyph_sets")
