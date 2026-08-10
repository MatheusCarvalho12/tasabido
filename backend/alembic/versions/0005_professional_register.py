"""add professional profile fields to users

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Documento profissional (conselho + número + UF) e profissão — só para o
    # papel professional; nullable porque family não usa.
    op.add_column("users", sa.Column("profession", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("council_type", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("council_number", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("council_uf", sa.String(length=2), nullable=True))
    # CNPJ opcional: só dígitos (14 chars), único quando presente.
    op.add_column("users", sa.Column("cnpj", sa.String(length=14), nullable=True))
    op.create_unique_constraint("uq_users_cnpj", "users", ["cnpj"])
    # Listas de perfil do professional (default vazio para registros antigos).
    for column_name in ("specialties", "age_groups", "service_modes"):
        op.add_column(
            "users",
            sa.Column(
                column_name,
                postgresql.JSONB(),
                server_default=sa.text("'[]'::jsonb"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    for column_name in ("service_modes", "age_groups", "specialties"):
        op.drop_column("users", column_name)
    op.drop_constraint("uq_users_cnpj", "users", type_="unique")
    op.drop_column("users", "cnpj")
    op.drop_column("users", "council_uf")
    op.drop_column("users", "council_number")
    op.drop_column("users", "council_type")
    op.drop_column("users", "profession")
