"""initial schema: users + children (consolidated)

Revision ID: 0001
Revises:
Create Date: 2026-08-10

Schema final consolidado em UMA migration (regra do projeto: máximo 1
migration por PR). Reúne o que antes eram 0001..0006: usuários com perfil
família e profissional (conselho com região por tipo) + crianças vinculadas.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), server_default=sa.text("'family'"), nullable=False),
        sa.Column("family_role", sa.String(length=20), nullable=True),
        sa.Column("cpf", sa.String(length=11), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("cep", sa.String(length=8), nullable=True),
        sa.Column("consentido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "support_network", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False
        ),
        sa.Column("profession", sa.String(length=50), nullable=True),
        sa.Column("council_type", sa.String(length=20), nullable=True),
        sa.Column("council_number", sa.String(length=20), nullable=True),
        sa.Column("council_region", sa.String(length=2), nullable=True),
        sa.Column("cnpj", sa.String(length=14), nullable=True),
        sa.Column(
            "specialties", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False
        ),
        sa.Column(
            "age_groups", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False
        ),
        sa.Column(
            "service_modes", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("cpf", name="uq_users_cpf"),
        sa.UniqueConstraint("cnpj", name="uq_users_cnpj"),
    )

    op.create_table(
        "children",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("cpf", sa.String(length=11), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column(
            "conditions", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cpf", name="uq_children_cpf"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("children")
    op.drop_table("users")
