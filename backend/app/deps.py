from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Child, User
from app.schemas import UserRole
from app.security import decode_access_token

UNAUTHENTICATED = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
CHILD_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Criança não encontrada")
GAME_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Jogo não encontrado")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: DbSession,
) -> User:
    if token is None:
        raise UNAUTHENTICATED
    subject = decode_access_token(token)
    if subject is None:
        raise UNAUTHENTICATED
    try:
        user_id = UUID(subject)
    except ValueError:
        raise UNAUTHENTICATED from None
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise UNAUTHENTICATED
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_family(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.FAMILY.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Acesso restrito a famílias")
    return current_user


def get_current_professional(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.PROFESSIONAL.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Acesso restrito a profissionais")
    return current_user


def get_optional_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: DbSession,
) -> User | None:
    """Usuário autenticado OU None (token ausente/inválido) — para recursos que
    são públicos mas liberam mais para o dono (ex.: SVG de rascunho)."""
    if token is None:
        return None
    subject = decode_access_token(token)
    if subject is None:
        return None
    try:
        user_id = UUID(subject)
    except ValueError:
        return None
    return db.scalar(select(User).where(User.id == user_id))


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


CurrentFamily = Annotated[User, Depends(get_current_family)]
CurrentProfessional = Annotated[User, Depends(get_current_professional)]


def get_child_for_user(db: Session, child_id: UUID, user: User) -> Child:
    """Criança acessível ao usuário: família só acessa os próprios filhos;
    demais papéis acessam qualquer criança (404 sem vazar existência)."""
    child = db.get(Child, child_id)
    if child is None:
        raise CHILD_NOT_FOUND
    if user.role == UserRole.FAMILY.value and child.user_id != user.id:
        raise CHILD_NOT_FOUND
    return child
