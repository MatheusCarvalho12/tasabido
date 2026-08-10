from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import auth

app = FastAPI(title="Tá Sabido API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

# Erros de validação do pydantic viram mensagem única e amigável ({"detail": str}),
# em vez do array técnico padrão. O front aplica o mesmo contrato.
_FIELD_ERRORS: dict[str, str] = {
    "role": "Papel inválido",
    "family_role": "Papel familiar inválido",
    "conditions": "Condição inválida",
    "support_network": "Rede de apoio inválida",
    "weight_kg": "O peso da criança precisa ser maior que 0 e até 300 kg",
}

_EMAIL_ERROR_PREFIX = "value is not a valid email address"


def _humanize_validation_error(errors: Sequence[dict[str, Any]]) -> str:
    """Primeiro erro mapeável vira a mensagem de detail; fallback genérico."""
    for error in errors:
        ctx = error.get("ctx") or {}
        raised = ctx.get("error")
        if isinstance(raised, ValueError):
            message = str(raised)
            if message.startswith(_EMAIL_ERROR_PREFIX):
                return "Digite um e-mail válido."
            return message
        loc = error.get("loc") or ()
        field = str(loc[-1]) if loc else ""
        if error.get("type") == "missing" and field == "family_role":
            return "O papel familiar é obrigatório para o cadastro family"
        if field in _FIELD_ERRORS:
            return _FIELD_ERRORS[field]
    return "Dados inválidos"


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": _humanize_validation_error(exc.errors())},
    )
