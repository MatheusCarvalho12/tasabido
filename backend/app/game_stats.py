"""Contrato de jogo + stats reais calculadas de game_runs.

Módulo compartilhado com o CRUD de jogos (T2): as rotas de leitura do modo
criança e o CRUD do profissional usam as MESMAS funções de agregação e de
serialização — stats nunca são mockadas, derivam de game_runs do banco.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Game, GameRun
from app.schemas import GameOut, GameStats


def stats_for_games(db: Session, game_ids: list[int]) -> dict[int, GameStats]:
    """Stats por jogo: partidas = count(runs), tempo médio em minutos e score
    médio arredondados. Sem runs → zeradas (0, 0, 0) — nunca inventa número.
    """
    stats = {
        game_id: GameStats(partidas=0, tempo_medio_min=0, score_medio=0) for game_id in game_ids
    }
    if not game_ids:
        return stats
    rows = db.execute(
        select(
            GameRun.game_id,
            func.count(GameRun.id),
            func.round(func.avg(GameRun.score)),
            func.round(func.avg(GameRun.duration_seconds) / 60),
        )
        .where(GameRun.game_id.in_(game_ids))
        .group_by(GameRun.game_id)
    ).all()
    for game_id, partidas, score_medio, tempo_medio_min in rows:
        stats[game_id] = GameStats(
            partidas=int(partidas),
            tempo_medio_min=int(tempo_medio_min),
            score_medio=int(score_medio),
        )
    return stats


def game_out(game: Game, stats: GameStats) -> GameOut:
    """Serializa o jogo no contrato do front (types/game.ts): svg_url derivada
    do caminho salvo (o endpoint de servir o SVG é do CRUD — T2), stats reais.
    """
    return GameOut(
        id=game.id,
        slug=game.slug,
        titulo=game.titulo,
        descricao=game.descricao,
        tutorial=game.tutorial,
        categoria=game.categoria,
        visibilidade=game.visibilidade,
        status=game.status,
        svg_url=f"/api/games/{game.id}/svg" if game.svg_path else None,
        cores=list(game.cores or []),
        stats=stats,
    )
