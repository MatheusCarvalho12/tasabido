"""modo criança: games, game_assignments, game_runs + pin_hash nos usuários

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-10

Schema do modo criança (2ª migration consolidada do PR): jogos, tarefas
"para casa" (game_assignments) e partidas jogadas (game_runs) + PIN dos
pais (hash argon2, igual security.py) para destravar o modo criança.
Seed REAL: 6 jogos públicos publicados, cada um com SVG próprio em
backend/storage/svgs/seed/<slug>.svg — nada de mock.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # PIN dos pais (6 dígitos, hash argon2) — destrava o modo criança.
    op.add_column("users", sa.Column("pin_hash", sa.String(length=255), nullable=True))

    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("tutorial", sa.Text(), nullable=False),
        sa.Column("categoria", sa.String(length=50), nullable=False),
        sa.Column("visibilidade", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("svg_path", sa.String(length=255), nullable=True),
        sa.Column("thumb_path", sa.String(length=255), nullable=True),
        sa.Column("banner_path", sa.String(length=255), nullable=True),
        sa.Column(
            "cores",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("criado_por", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_games_slug"),
        sa.CheckConstraint("visibilidade IN ('public', 'private')", name="visibilidade"),
        sa.CheckConstraint("status IN ('draft', 'published')", name="status"),
        sa.ForeignKeyConstraint(["criado_por"], ["users.id"], ondelete="SET NULL"),
    )

    op.create_table(
        "game_assignments",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("professional_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("game_id", "child_id", name="uq_game_assignments_game_id_child_id"),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["child_id"], ["children.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["professional_id"], ["users.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "game_runs",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("child_id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("score >= 0 AND score <= 100", name="score"),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["child_id"], ["children.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_game_runs_game_id", "game_runs", ["game_id"])

    # Seed real — jogos públicos iniciais (criado_por NULL: são jogos da
    # plataforma, não de um profissional específico). Cada jogo tem SVG
    # próprio em storage/svgs/seed/<slug>.svg.
    games_table = sa.table(
        "games",
        sa.column("id", sa.Integer()),
        sa.column("slug", sa.String()),
        sa.column("titulo", sa.String()),
        sa.column("descricao", sa.Text()),
        sa.column("tutorial", sa.Text()),
        sa.column("categoria", sa.String()),
        sa.column("visibilidade", sa.String()),
        sa.column("status", sa.String()),
        sa.column("svg_path", sa.String()),
        sa.column("cores", postgresql.JSONB()),
        sa.column("criado_por", sa.Uuid()),
    )
    op.bulk_insert(
        games_table,
        [
            {
                "id": 1,
                "slug": "escreva-seu-nome",
                "titulo": "Escreva seu nome",
                "descricao": "Treine a escrita do próprio nome, um traço de cada vez.",
                "tutorial": (
                    "Escreva seu nome passando o dedo sobre as letras pontilhadas, uma por uma."
                ),
                "categoria": "escrita",
                "visibilidade": "public",
                "status": "published",
                "svg_path": "svgs/seed/escreva-seu-nome.svg",
                "cores": ["#08ADAE", "#F75A3D", "#F8AD16", "#7956CD", "#087FE8"],
                "criado_por": None,
            },
            {
                "id": 2,
                "slug": "desenhe-o-macaco",
                "titulo": "Desenhe o macaco",
                "descricao": (
                    "Complete o desenho do macaco e ganhe pontos preenchendo as áreas certas."
                ),
                "tutorial": (
                    "Complete o desenho do macaco passando o dedo sobre as linhas pontilhadas. "
                    "Preencha dentro das áreas certas para ganhar pontos."
                ),
                "categoria": "coordenação motora",
                "visibilidade": "public",
                "status": "published",
                "svg_path": "svgs/seed/desenhe-o-macaco.svg",
                "cores": ["#08ADAE", "#F75A3D", "#F8AD16"],
                "criado_por": None,
            },
            {
                "id": 3,
                "slug": "pinte-o-arco-iris",
                "titulo": "Pinte o arco-íris",
                "descricao": "Pinte o arco-íris escolhendo a cor certa para cada faixa.",
                "tutorial": (
                    "Pinte cada faixa do arco-íris tocando nela com a cor certa, "
                    "de cima para baixo."
                ),
                "categoria": "coordenação motora",
                "visibilidade": "public",
                "status": "published",
                "svg_path": "svgs/seed/pinte-o-arco-iris.svg",
                "cores": ["#F75A3D", "#F8AD16", "#08ADAE", "#7956CD"],
                "criado_por": None,
            },
            {
                "id": 4,
                "slug": "complete-as-formas",
                "titulo": "Complete as formas",
                "descricao": "Feche as figuras passando o dedo sobre as linhas pontilhadas.",
                "tutorial": (
                    "Complete cada forma passando o dedo sobre a linha pontilhada "
                    "até fechar a figura."
                ),
                "categoria": "percepção visual",
                "visibilidade": "public",
                "status": "published",
                "svg_path": "svgs/seed/complete-as-formas.svg",
                "cores": ["#08ADAE", "#F75A3D", "#F8AD16", "#7956CD"],
                "criado_por": None,
            },
            {
                "id": 5,
                "slug": "ligue-os-pontos",
                "titulo": "Ligue os pontos",
                "descricao": "Descubra o desenho escondido ligando os pontos em ordem.",
                "tutorial": (
                    "Ligue os pontos em ordem, um depois do outro, para revelar "
                    "o desenho escondido."
                ),
                "categoria": "percepção visual",
                "visibilidade": "public",
                "status": "published",
                "svg_path": "svgs/seed/ligue-os-pontos.svg",
                "cores": ["#7956CD", "#08ADAE", "#F75A3D"],
                "criado_por": None,
            },
            {
                "id": 6,
                "slug": "trace-o-caminho",
                "titulo": "Trace o caminho",
                "descricao": "Leve o personagem até o fim do caminho sem sair da trilha.",
                "tutorial": (
                    "Trace o caminho do início ao fim passando o dedo sobre a trilha pontilhada, "
                    "sem sair dela."
                ),
                "categoria": "coordenação motora",
                "visibilidade": "public",
                "status": "published",
                "svg_path": "svgs/seed/trace-o-caminho.svg",
                "cores": ["#F75A3D", "#08ADAE", "#F8AD16"],
                "criado_por": None,
            },
        ],
    )

    # O seed insere ids explícitos (1-6), mas a sequência do Identity não avança
    # com isso — sem sincronizar, o primeiro INSERT gerado colidiria com o seed
    # (duplicate key pk_games). Alinha a sequência ao maior id inserido.
    op.execute(
        sa.text("SELECT setval(pg_get_serial_sequence('games', 'id'), (SELECT MAX(id) FROM games))")
    )


def downgrade() -> None:
    op.drop_index("ix_game_runs_game_id", table_name="game_runs")
    op.drop_table("game_runs")
    op.drop_table("game_assignments")
    op.drop_table("games")
    op.drop_column("users", "pin_hash")
