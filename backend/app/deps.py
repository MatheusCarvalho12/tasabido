from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

UNAUTHENTICATED = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

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
