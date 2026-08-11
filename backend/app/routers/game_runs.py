"""Partidas jogadas: registro de run — as stats dos jogos derivam daqui (zero mock)."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession
from app.models import Child, Game, GameRun, User
from app.schemas import GameRunCreate, GameRunOut, UserRole

router = APIRouter(prefix="/api/game-runs", tags=["game-runs"])

_CHILD_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Criança não encontrada")
_GAME_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Jogo não encontrado")
_GAME_NOT_PUBLISHED = HTTPException(
    status.HTTP_409_CONFLICT, detail="Este jogo ainda não está disponível para jogar"
)


def _get_child_for_user(db: Session, child_id, user: User) -> Child:
    """Criança acessível: família só registra runs dos próprios filhos (404 sem vazar)."""
    child = db.get(Child, child_id)
    if child is None:
        raise _CHILD_NOT_FOUND
    if user.role == UserRole.FAMILY.value and child.user_id != user.id:
        raise _CHILD_NOT_FOUND
    return child


@router.post("", response_model=GameRunOut, status_code=status.HTTP_201_CREATED)
def create_run(payload: GameRunCreate, db: DbSession, current_user: CurrentUser) -> GameRunOut:
    """Registra uma partida: jogo precisa existir e estar publicado; a criança precisa
    pertencer à família autenticada (profissionais podem registrar de qualquer criança)."""
    game = db.get(Game, payload.game_id)
    if game is None:
        raise _GAME_NOT_FOUND
    if game.status != "published":
        raise _GAME_NOT_PUBLISHED
    _get_child_for_user(db, payload.child_id, current_user)
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
