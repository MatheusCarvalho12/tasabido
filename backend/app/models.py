from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Identity, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


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
    score: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))


class GameAssignment(Base):
    __tablename__ = "game_assignments"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    child_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"))
    professional_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"))
