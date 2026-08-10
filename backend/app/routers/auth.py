from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import CurrentUser, DbSession
from app.models import User
from app.schemas import AuthResponse, LoginRequest, MeResponse, RegisterRequest, UserOut
from app.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Corrida entre dois registros simultâneos: a unique constraint no banco é a lei.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="E-mail já cadastrado") from None
    db.refresh(user)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        verify_password(payload.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")
    if payload.role is not None and user.role != payload.role.value:
        # Mesma mensagem do login inválido: não vaza a role do usuário.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")
    return _auth_response(user)


@router.get("/me", response_model=MeResponse)
def me(current_user: CurrentUser) -> MeResponse:
    return MeResponse(user=UserOut.model_validate(current_user))


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        user=UserOut.model_validate(user),
    )
