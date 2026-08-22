from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import assignments, auth, family, game_runs, games, tracing_runs

app = FastAPI(title="Tá Sabido API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    # 5173 = dev padrão; 5175 = preview de integração (front pode apontar pra
    # outro backend via VITE_API_URL, então qualquer origem local do app passa).
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(games.router)
app.include_router(assignments.router)
app.include_router(game_runs.router)
app.include_router(tracing_runs.router)
app.include_router(family.router)
app.include_router(family.children_router)

# Erros de validação do pydantic viram mensagem única e amigável ({"detail": str}),
# em vez do array técnico padrão. O front aplica o mesmo contrato.
_FIELD_ERRORS: dict[str, str] = {
    "role": "Papel inválido",
    "family_role": "Papel familiar inválido",
    "conditions": "Condição inválida",
    "support_network": "Rede de apoio inválida",
    "weight_kg": "O peso da criança precisa ser maior que 0 e até 300 kg",
    "score": "A pontuação precisa ser entre 0 e 100",
    "duration_seconds": "A duração da partida não pode ser negativa",
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
        if error.get("type") == "missing":
            if field == "family_role":
                return "O papel familiar é obrigatório para o cadastro family"
            if field == "cpf" and "children" in loc:
                return "O CPF da criança é obrigatório"
        if "conditions" in loc:
            return _FIELD_ERRORS["conditions"]
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
