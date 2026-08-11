"""PIN dos pais: definição e validação (argon2, mesma lib e helpers do login)."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.deps import CurrentFamily, DbSession
from app.models import Child
from app.schemas import (
    ChildOut,
    ChildrenListResponse,
    PinRequest,
    PinSetResponse,
    PinValidateResponse,
)
from app.security import DUMMY_PASSWORD_HASH, hash_password, verify_password

router = APIRouter(prefix="/api/family", tags=["family"])

# Crianças da família (contrato do front: GET /api/children, envelope {items}).
children_router = APIRouter(prefix="/api", tags=["family"])


@children_router.get("/children", response_model=ChildrenListResponse)
def list_children(
    db: DbSession,
    current_user: CurrentFamily,
) -> ChildrenListResponse:
    """Crianças da família autenticada — alimenta a saudação \"Oi, {nome}\" do modo criança."""
    children = db.scalars(
        select(Child).where(Child.user_id == current_user.id).order_by(Child.created_at)
    ).all()
    return ChildrenListResponse(items=[ChildOut.model_validate(child) for child in children])


@router.post("/pin/validate", response_model=PinValidateResponse)
def validate_pin(
    payload: PinRequest,
    db: DbSession,
    current_user: CurrentFamily,
) -> PinValidateResponse | JSONResponse:
    """Valida o PIN da família autenticada. 200 {valido: true} ou 401 {valido: false}
    (corpo próprio, fora do padrão {detail}, conforme o contrato do front)."""
    pin_hash = current_user.pin_hash or DUMMY_PASSWORD_HASH
    if not verify_password(payload.pin, pin_hash):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"valido": False})
    return PinValidateResponse(valido=True)


@router.patch("/pin", response_model=PinSetResponse)
def set_pin(
    payload: PinRequest,
    db: DbSession,
    current_user: CurrentFamily,
) -> PinSetResponse:
    """Define/atualiza o PIN dos pais (6 dígitos exatos, validados no schema)."""
    current_user.pin_hash = hash_password(payload.pin)
    db.commit()
    return PinSetResponse(ok=True)
