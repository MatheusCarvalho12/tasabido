"""Tarefas "para casa": consulta pela família e criação/remoção pelo profissional."""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import CurrentProfessional, CurrentUser, DbSession
from app.game_stats import game_out, stats_for_games
from app.models import Child, Game, GameAssignment, User
from app.schemas import (
    AssignmentCreate,
    AssignmentListResponse,
    AssignmentOut,
    UserRole,
)

router = APIRouter(prefix="/api", tags=["assignments"])

_CHILD_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Criança não encontrada")
_GAME_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Jogo não encontrado")


def _get_child_for_user(db: Session, child_id: uuid.UUID, user: User) -> Child:
    """Criança acessível ao usuário: família só vê a própria (404 sem vazar existência)."""
    child = db.get(Child, child_id)
    if child is None:
        raise _CHILD_NOT_FOUND
    if user.role == UserRole.FAMILY.value and child.user_id != user.id:
        raise _CHILD_NOT_FOUND
    return child


def _assignment_out(db: Session, assignment: GameAssignment, game: Game) -> AssignmentOut:
    stats = stats_for_games(db, [game.id])
    return AssignmentOut(
        **game_out(game, stats[game.id]).model_dump(),
        assignment_id=assignment.id,
        atribuido_em=assignment.created_at,
    )


@router.get("/children/{child_id}/assignments", response_model=AssignmentListResponse)
def list_child_assignments(
    child_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> AssignmentListResponse:
    """ "Para casa" da criança: jogos delegados pelo profissional, mais recentes primeiro."""
    _get_child_for_user(db, child_id, current_user)
    rows = db.execute(
        select(GameAssignment, Game)
        .join(Game, Game.id == GameAssignment.game_id)
        .where(GameAssignment.child_id == child_id)
        .order_by(GameAssignment.created_at.desc())
    ).all()
    return AssignmentListResponse(
        items=[_assignment_out(db, assignment, game) for assignment, game in rows]
    )


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    db: DbSession,
    current_user: CurrentProfessional,
) -> AssignmentOut:
    """Delega um jogo para a criança (409 quando a tarefa já existe)."""
    game = db.get(Game, payload.game_id)
    if game is None:
        raise _GAME_NOT_FOUND
    child = db.get(Child, payload.child_id)
    if child is None:
        raise _CHILD_NOT_FOUND
    assignment = GameAssignment(
        game_id=payload.game_id,
        child_id=payload.child_id,
        professional_id=current_user.id,
    )
    db.add(assignment)
    try:
        db.commit()
    except IntegrityError:
        # Unique(game_id, child_id) no banco: a corrida entre dois POSTs é a lei.
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Esta criança já tem essa tarefa para casa"
        ) from None
    db.refresh(assignment)
    return _assignment_out(db, assignment, game)


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: DbSession,
    current_user: CurrentProfessional,
) -> None:
    assignment = db.get(GameAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada")
    db.delete(assignment)
    db.commit()
