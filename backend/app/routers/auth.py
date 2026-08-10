from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import CurrentUser, DbSession
from app.models import Child, User
from app.schemas import (
    AuthResponse,
    ChildRegister,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    UserOut,
    UserRole,
)
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
        phone=payload.phone,
        birth_date=payload.birth_date,
    )
    if payload.role == UserRole.FAMILY:
        _apply_family_data(user, payload)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Corrida entre dois registros simultâneos: a unique constraint no banco é a lei.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="E-mail já cadastrado") from None
    db.refresh(user)
    return _auth_response(user)


def _apply_family_data(user: User, payload: RegisterRequest) -> None:
    """Dados exclusivos do papel family. Para professional são ignorados (não persistem)."""
    # Garantido pelo model_validator de RegisterRequest (family_role obrigatório p/ family).
    assert payload.family_role is not None
    user.family_role = payload.family_role.value
    user.support_network = [fr.value for fr in payload.support_network]
    user.children = [_child_model(child) for child in payload.children]


def _child_model(child: ChildRegister) -> Child:
    return Child(
        name=child.name,
        birth_date=child.birth_date,
        weight_kg=child.weight_kg,
        conditions=[c.value for c in child.conditions],
    )


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
