from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.tracing import DEFAULT_PAUSE_GRACE_MS, MAX_PAUSE_GRACE_MS


class Child(Base):
    __tablename__ = "children"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    cpf: Mapped[str | None] = mapped_column(String(11), unique=True)
    birth_date: Mapped[date | None] = mapped_column(Date)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    conditions: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))

    user: Mapped[User] = relationship(back_populates="children")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), server_default=text("'family'"))
    family_role: Mapped[str | None] = mapped_column(String(20))
    cpf: Mapped[str | None] = mapped_column(String(11), unique=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    birth_date: Mapped[date | None] = mapped_column(Date)
    cep: Mapped[str | None] = mapped_column(String(8))
    consentido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    support_network: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    profession: Mapped[str | None] = mapped_column(String(50))
    council_type: Mapped[str | None] = mapped_column(String(20))
    council_number: Mapped[str | None] = mapped_column(String(20))
    council_region: Mapped[str | None] = mapped_column(String(2))
    cnpj: Mapped[str | None] = mapped_column(String(14), unique=True)
    specialties: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    age_groups: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    service_modes: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))

    children: Mapped[list[Child]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str] = mapped_column(Text)
    tutorial: Mapped[str] = mapped_column(Text)
    categoria: Mapped[str] = mapped_column(String(50))
    visibilidade: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    svg_path: Mapped[str | None] = mapped_column(String(255))
    thumb_path: Mapped[str | None] = mapped_column(String(255))
    banner_path: Mapped[str | None] = mapped_column(String(255))
    cores: Mapped[list[str]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    criado_por: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("now()"))


class GameRun(Base):
    __tablename__ = "game_runs"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), index=True)
    child_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"))
    score: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        String(20), server_default=text("'started'"), nullable=False
    )
    glyph_set_id: Mapped[int | None] = mapped_column(
        ForeignKey("glyph_sets.id", ondelete="RESTRICT")
    )
    glyph_set_version: Mapped[str | None] = mapped_column(String(120))
    glyph_set_sha256: Mapped[str | None] = mapped_column(String(64))
    threshold: Mapped[int | None] = mapped_column(Integer)
    contact_mode: Mapped[str | None] = mapped_column(String(30))
    pause_grace_ms: Mapped[int | None] = mapped_column(Integer)
    scoring_version: Mapped[int | None] = mapped_column(Integer)
    schema_version: Mapped[int | None] = mapped_column(Integer)
    effective_config: Mapped[dict[str, object] | None] = mapped_column(JSONB(none_as_null=True))
    idempotency_key: Mapped[str | None] = mapped_column(String(160), unique=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    evidence: Mapped[dict[str, object] | None] = mapped_column(JSONB(none_as_null=True))
    evidence_sha256: Mapped[str | None] = mapped_column(String(64))
    evidence_version: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))

    __table_args__ = (
        CheckConstraint(
            "status IN ('started', 'completed', 'abandoned', 'legacy')",
            name="ck_game_runs_status",
        ),
        CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 100)", name="ck_game_runs_score"
        ),
        CheckConstraint(
            "evidence IS NULL OR (evidence_sha256 IS NOT NULL AND evidence_version IS NOT NULL)",
            name="ck_game_runs_evidence_identity",
        ),
        CheckConstraint(
            "evidence IS NULL OR (glyph_set_version IS NOT NULL AND glyph_set_sha256 IS NOT NULL)",
            name="ck_game_runs_glyph_identity",
        ),
        CheckConstraint(
            "threshold IS NULL OR (threshold >= 0 AND threshold <= 100)",
            name="ck_game_runs_threshold",
        ),
        CheckConstraint(
            "pause_grace_ms IS NULL OR "
            f"(pause_grace_ms >= 0 AND pause_grace_ms <= {MAX_PAUSE_GRACE_MS})",
            name="ck_game_runs_pause_grace_ms",
        ),
        Index("ix_game_runs_retention", "status", "last_activity_at", "completed_at"),
        Index("ix_game_runs_last_activity_at", "last_activity_at"),
        Index("ix_game_runs_child_status_created", "child_id", "status", "created_at"),
        Index("ix_game_runs_glyph_set_id", "glyph_set_id"),
    )


class GameAssignment(Base):
    __tablename__ = "game_assignments"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    child_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"))
    professional_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    glyph_set_id_override: Mapped[int | None] = mapped_column(
        ForeignKey("glyph_sets.id", ondelete="RESTRICT")
    )
    threshold_override: Mapped[int | None] = mapped_column(Integer)
    contact_mode_override: Mapped[str | None] = mapped_column(String(30))
    pause_grace_ms_override: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))

    __table_args__ = (
        CheckConstraint(
            "threshold_override IS NULL OR (threshold_override >= 0 AND threshold_override <= 100)",
            name="ck_game_assignments_threshold_override",
        ),
        CheckConstraint(
            "contact_mode_override IS NULL OR contact_mode_override IN "
            "('strict_continuous', 'timed_pause', 'free')",
            name="ck_game_assignments_contact_mode_override",
        ),
        CheckConstraint(
            "pause_grace_ms_override IS NULL OR "
            f"(pause_grace_ms_override >= 0 AND "
            f"pause_grace_ms_override <= {MAX_PAUSE_GRACE_MS})",
            name="ck_game_assignments_pause_grace_ms_override",
        ),
        Index("ix_game_assignments_child_created", "child_id", "created_at"),
    )


class GlyphSet(Base):
    """An immutable, versioned canonical glyph artifact."""

    __tablename__ = "glyph_sets"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    version: Mapped[str] = mapped_column(String(120), unique=True)
    artifact_path: Mapped[str] = mapped_column(String(255))
    artifact_sha256: Mapped[str] = mapped_column(String(64), unique=True)
    geometry: Mapped[dict[str, object]] = mapped_column(JSONB)
    immutable: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default=text("'active'"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("status IN ('active', 'retired')", name="ck_glyph_sets_status"),
        CheckConstraint("length(artifact_sha256) = 64", name="ck_glyph_sets_artifact_sha256"),
        Index("ix_glyph_sets_status_created", "status", "created_at"),
    )


class GameDefaults(Base):
    """Default tracing policy for a game; assignments override each field independently."""

    __tablename__ = "game_defaults"

    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    )
    glyph_set_id: Mapped[int] = mapped_column(
        ForeignKey("glyph_sets.id", ondelete="RESTRICT"), nullable=False
    )
    glyph_set_version: Mapped[str] = mapped_column(String(120), nullable=False)
    glyph_set_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, server_default=text("70"), nullable=False)
    contact_mode: Mapped[str] = mapped_column(
        String(30), server_default=text("'timed_pause'"), nullable=False
    )
    pause_grace_ms: Mapped[int] = mapped_column(
        Integer, server_default=text(str(DEFAULT_PAUSE_GRACE_MS)), nullable=False
    )
    scoring_version: Mapped[int] = mapped_column(Integer, server_default=text("1"), nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, server_default=text("1"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("now()"))

    __table_args__ = (
        CheckConstraint("threshold >= 0 AND threshold <= 100", name="ck_game_defaults_threshold"),
        CheckConstraint(
            "contact_mode IN ('strict_continuous', 'timed_pause', 'free')",
            name="ck_game_defaults_contact_mode",
        ),
        CheckConstraint(
            f"pause_grace_ms >= 0 AND pause_grace_ms <= {MAX_PAUSE_GRACE_MS}",
            name="ck_game_defaults_pause_grace_ms",
        ),
    )


class RetentionAudit(Base):
    """Append-only record of evidence retention actions."""

    __tablename__ = "retention_audit"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    game_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("game_runs.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str | None] = mapped_column(String(255))
    evidence_sha256: Mapped[str | None] = mapped_column(String(64))
    evidence_version: Mapped[int | None] = mapped_column(Integer)
    occurred_at: Mapped[datetime] = mapped_column(server_default=text("now()"))

    __table_args__ = (
        CheckConstraint(
            "action IN ('retained', 'expired', 'redacted', 'deleted')",
            name="ck_retention_audit_action",
        ),
        Index("ix_retention_audit_retention", "occurred_at", "action"),
    )


GameDefault = GameDefaults
