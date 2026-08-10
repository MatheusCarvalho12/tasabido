"""add cep and lgpd consent timestamp to users

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-10

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Só dígitos (8 chars), nullable porque é opcional e professional não usa.
    op.add_column("users", sa.Column("cep", sa.String(length=8), nullable=True))
    # Registro do consentimento LGPD com data/hora (requisito LGPD).
    op.add_column("users", sa.Column("consentido_em", sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "consentido_em")
    op.drop_column("users", "cep")
