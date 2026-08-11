"""Partidas jogadas: registro de run — as stats dos jogos derivam daqui (zero mock)."""

from fastapi import APIRouter, HTTPException, status

from app.deps import (
    GAME_NOT_FOUND,
    CurrentUser,
    DbSession,
    get_child_for_user,
)
from app.models import Game, GameRun
from app.schemas import GameRunCreate, GameRunOut

router = APIRouter(prefix="/api/game-runs", tags=["game-runs"])

_GAME_NOT_PUBLISHED = HTTPException(
    status.HTTP_409_CONFLICT, detail="Este jogo ainda não está disponível para jogar"
)


@router.post("", response_model=GameRunOut, status_code=status.HTTP_201_CREATED)
def create_run(payload: GameRunCreate, db: DbSession, current_user: CurrentUser) -> GameRunOut:
    """Registra uma partida: jogo precisa existir e estar publicado; a criança precisa
    pertencer à família autenticada (profissionais podem registrar de qualquer criança)."""
    game = db.get(Game, payload.game_id)
    if game is None:
        raise GAME_NOT_FOUND
    if game.status != "published":
        raise _GAME_NOT_PUBLISHED
    get_child_for_user(db, payload.child_id, current_user)
    run = GameRun(
        game_id=payload.game_id,
        child_id=payload.child_id,
        score=payload.score,
        duration_seconds=payload.duration_seconds,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return GameRunOut.model_validate(run)
