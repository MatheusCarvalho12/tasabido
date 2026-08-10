"""rename council_uf to council_region on users

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-10

O campo de região do conselho passou de UF (só fazia sentido para CRM/CRO/outro)
para um contrato por conselho: CRP/CREFITO/CRFa usam região numérica. O nome da
coluna muda para `council_region`; o tipo continua String(2) (região máx. "23").

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "council_uf", new_column_name="council_region")


def downgrade() -> None:
    op.alter_column("users", "council_region", new_column_name="council_uf")
