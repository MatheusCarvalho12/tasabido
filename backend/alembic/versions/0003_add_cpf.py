"""add cpf to users and children

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-10

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Só dígitos (11 chars), nullable porque professional e registros antigos não têm CPF.
    op.add_column("users", sa.Column("cpf", sa.String(length=11), nullable=True))
    op.create_unique_constraint("uq_users_cpf", "users", ["cpf"])
    op.add_column("children", sa.Column("cpf", sa.String(length=11), nullable=True))
    op.create_unique_constraint("uq_children_cpf", "children", ["cpf"])


def downgrade() -> None:
    op.drop_constraint("uq_children_cpf", "children", type_="unique")
    op.drop_column("children", "cpf")
    op.drop_constraint("uq_users_cpf", "users", type_="unique")
    op.drop_column("users", "cpf")
