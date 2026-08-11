"""CRUD de jogos do modo criança (papel professional) + upload/serviço de SVG e imagens (thumb/banner)."""  # noqa: E501

import re
import unicodedata
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import GAME_NOT_FOUND, CurrentUser, DbSession, OptionalUser
from app.game_stats import game_out, stats_for_games
from app.models import Game, GameRun, User
from app.schemas import (
    GameCreate,
    GameListResponse,
    GameOut,
    GameStats,
    GameStatus,
    GameUpdate,
    GameVisibility,
    SvgUploadResponse,
)

router = APIRouter(prefix="/api/games", tags=["games"])

SVG_MAX_BYTES = 500 * 1024  # ~500 KB, conforme contrato
SVG_STORAGE_RELATIVE = "svgs"  # storage/svgs/<game_id>.svg
IMAGE_MAX_BYTES = 1024 * 1024  # ~1 MB por imagem, conforme contrato
IMAGE_STORAGE_RELATIVE = "images"  # storage/images/<game_id>-thumb.<ext>
_IMAGE_EXTENSIONS = frozenset({".png", ".jpg", ".jpeg", ".webp", ".svg"})
_IMAGE_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}
_SLUG_PATTERN = re.compile(r"[^a-z0-9]+")

_SVG_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="SVG não encontrado")
_IMAGE_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada")


def _slugify(titulo: str) -> str:
    """Slug amigável em pt-BR: sem acentos, minúsculas, hífens entre palavras."""
    sem_acentos = unicodedata.normalize("NFD", titulo)
    sem_acentos = sem_acentos.encode("ascii", "ignore").decode("ascii")
    slug = _SLUG_PATTERN.sub("-", sem_acentos.lower()).strip("-")
    return slug or "jogo"


def _unique_slug(db: Session, slug: str, exclude_id: int | None = None) -> str:
    """Garante unicidade do slug: acrescenta -2, -3... quando o base já existe."""
    candidate = slug
    counter = 2
    while True:
        query = select(Game.id).where(Game.slug == candidate)
        if exclude_id is not None:
            query = query.where(Game.id != exclude_id)
        if db.scalar(query) is None:
            return candidate
        candidate = f"{slug}-{counter}"
        counter += 1


def _get_owned_game(db: Session, game_id: int, user: User) -> Game:
    """Jogo existente e de propriedade do profissional (403 para jogo de outro)."""
    game = db.get(Game, game_id)
    if game is None:
        raise GAME_NOT_FOUND
    if game.criado_por != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Você não é o dono deste jogo")
    return game


def _svg_dir() -> Path:
    return settings.storage_dir / SVG_STORAGE_RELATIVE


def _images_dir() -> Path:
    return settings.storage_dir / IMAGE_STORAGE_RELATIVE


def _resolve_storage_path(stored_path: str) -> Path | None:
    """Caminho do arquivo resolvido e contido no storage (defesa contra path traversal)."""
    storage_root = settings.storage_dir.resolve()
    candidate = (storage_root / stored_path).resolve()
    if not candidate.is_relative_to(storage_root):
        return None
    return candidate


def _stats(db: Session, game_id: int) -> GameStats:
    """Stats reais de um jogo (0, 0, 0 quando não há runs) — implementação única
    em app/game_stats.py, compartilhada com a API do modo criança (T3)."""
    return stats_for_games(db, [game_id])[game_id]


@router.get("", response_model=GameListResponse)
def list_games(
    db: DbSession,
    current_user: CurrentUser,
    scope: Annotated[Literal["public", "mine", "all"], Query()] = "public",
) -> GameListResponse:
    """Jogos por escopo. public: publicados/públicos — os mais jogados primeiro
    (contrato da tela de jogos: ordenados por partidas desc); mine/all: do profissional.
    Resposta no envelope {items} do contrato do front (types/games.ts)."""
    if scope in ("mine", "all") and current_user.role != "professional":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Apenas profissionais podem usar esse filtro"
        )
    query = select(Game)
    if scope == "public":
        query = query.where(
            Game.status == GameStatus.PUBLISHED.value,
            Game.visibilidade == GameVisibility.PUBLIC.value,
        )
    elif scope == "mine":
        query = query.where(Game.criado_por == current_user.id)
    if scope == "public":
        # Correlacionada com a query externa: contagem de game_runs por jogo.
        runs_count = (
            select(func.count(GameRun.id))
            .where(GameRun.game_id == Game.id)
            .correlate(Game)
            .scalar_subquery()
        )
        query = query.order_by(runs_count.desc(), Game.id)
    else:
        query = query.order_by(Game.id)
    games = db.scalars(query).all()
    stats = stats_for_games(db, [game.id for game in games])
    return GameListResponse(items=[game_out(game, stats[game.id]) for game in games])


@router.get("/{game_id}/stats", response_model=GameStats)
def game_stats(game_id: int, db: DbSession, current_user: CurrentUser) -> GameStats:
    """Stats agregadas de um jogo (mesma agregação da lista)."""
    game = db.get(Game, game_id)
    if game is None:
        raise GAME_NOT_FOUND
    return _stats(db, game.id)


@router.post("", response_model=GameOut, status_code=status.HTTP_201_CREATED)
def create_game(payload: GameCreate, current_user: CurrentUser, db: DbSession) -> GameOut:
    if current_user.role != "professional":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Apenas profissionais podem criar jogos"
        )
    game = Game(
        slug=_unique_slug(db, _slugify(payload.titulo)),
        titulo=payload.titulo,
        descricao=payload.descricao,
        tutorial=payload.tutorial,
        categoria=payload.categoria,
        visibilidade=payload.visibilidade.value,
        status=GameStatus.DRAFT.value,
        cores=list(payload.cores),
        criado_por=current_user.id,
    )
    db.add(game)
    try:
        db.commit()
    except IntegrityError:
        # Corrida entre duas criações simultâneas: a unique do slug é a lei.
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Já existe um jogo com esse título"
        ) from None
    db.refresh(game)
    return game_out(game, _stats(db, game.id))


@router.patch("/{game_id}", response_model=GameOut)
def update_game(
    game_id: int, payload: GameUpdate, current_user: CurrentUser, db: DbSession
) -> GameOut:
    game = _get_owned_game(db, game_id, current_user)
    if payload.titulo is not None:
        game.titulo = payload.titulo
        # Slug é derivado do título; regera com sufixo quando já existe (excluindo o próprio).
        game.slug = _unique_slug(db, _slugify(payload.titulo), exclude_id=game.id)
    if payload.descricao is not None:
        game.descricao = payload.descricao
    if payload.tutorial is not None:
        game.tutorial = payload.tutorial
    if payload.categoria is not None:
        game.categoria = payload.categoria
    if payload.visibilidade is not None:
        game.visibilidade = payload.visibilidade.value
    if payload.status is not None:
        game.status = payload.status.value
    if payload.cores is not None:
        game.cores = list(payload.cores)
    game.updated_at = func.now()
    db.commit()
    db.refresh(game)
    return game_out(game, _stats(db, game.id))


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: int, current_user: CurrentUser, db: DbSession) -> None:
    game = _get_owned_game(db, game_id, current_user)
    # Arquivos órfãos do jogo deletado também saem do disco (runs/assignments
    # caem via CASCADE): SVG + thumb/banner quando existirem.
    stored_paths = [game.svg_path, game.thumb_path, game.banner_path]
    db.delete(game)
    db.commit()
    for stored_path in stored_paths:
        if stored_path is None:
            continue
        file_path = _resolve_storage_path(stored_path)
        if file_path is not None and file_path.is_file():
            file_path.unlink()


@router.post("/{game_id}/publish", response_model=GameOut)
def publish_game(game_id: int, current_user: CurrentUser, db: DbSession) -> GameOut:
    """draft → published (idempotente). O caminho inverso é via PATCH no status."""
    game = _get_owned_game(db, game_id, current_user)
    game.status = GameStatus.PUBLISHED.value
    game.updated_at = func.now()
    db.commit()
    db.refresh(game)
    return game_out(game, _stats(db, game.id))


@router.post("/{game_id}/svg", response_model=SvgUploadResponse)
def upload_svg(
    game_id: int,
    file: Annotated[UploadFile, File()],
    current_user: CurrentUser,
    db: DbSession,
) -> SvgUploadResponse:
    """Recebe o SVG (multipart) que a criança vai desenhar e salva em storage/svgs/."""
    _get_owned_game(db, game_id, current_user)
    filename = file.filename or ""
    if not filename.lower().endswith(".svg"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail="O arquivo precisa ser um SVG (.svg)"
        )
    content = file.file.read()
    if len(content) > SVG_MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            detail="O arquivo SVG precisa ter no máximo 500 KB",
        )
    if not content.lstrip().startswith(b"<svg"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="O conteúdo do arquivo não parece um SVG válido",
        )
    target = _svg_dir() / f"{game_id}.svg"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    game = db.get(Game, game_id)
    assert game is not None
    game.svg_path = f"{SVG_STORAGE_RELATIVE}/{game_id}.svg"
    game.updated_at = func.now()
    db.commit()
    return SvgUploadResponse(svg_url=f"/api/games/{game_id}/svg")


@router.get("/{game_id}/svg")
def get_svg(game_id: int, db: DbSession, current_user: OptionalUser) -> FileResponse:
    """Serve o SVG do jogo com content-type image/svg+xml (404 quando não existe).

    Público para jogos PUBLICADOS (o <img> do card/modal não manda header de
    auth); rascunho só o dono vê (preview do profissional)."""
    game = db.get(Game, game_id)
    if game is None or game.svg_path is None:
        raise _SVG_NOT_FOUND
    is_owner = current_user is not None and game.criado_por == current_user.id
    if game.status != "published" and not is_owner:
        raise _SVG_NOT_FOUND
    path = _resolve_storage_path(game.svg_path)
    if path is None or not path.is_file():
        raise _SVG_NOT_FOUND
    return FileResponse(path, media_type="image/svg+xml")


def _read_image(upload: UploadFile, kind: str) -> tuple[str, bytes]:
    """Valida e lê a imagem enviada: extensão permitida, conteúdo não vazio, ≤ 1 MB."""
    ext = Path(upload.filename or "").suffix.lower()
    if ext not in _IMAGE_EXTENSIONS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"A imagem {kind} precisa ser PNG, JPG, WebP ou SVG",
        )
    content = upload.file.read()
    if not content:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"A imagem {kind} está vazia"
        )
    if len(content) > IMAGE_MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"A imagem {kind} precisa ter no máximo 1 MB",
        )
    return ext, content


@router.post("/{game_id}/images", response_model=GameOut)
def upload_images(
    game_id: int,
    current_user: CurrentUser,
    db: DbSession,
    thumb: Annotated[UploadFile | None, File()] = None,
    banner: Annotated[UploadFile | None, File()] = None,
) -> GameOut:
    """Sobe a thumbnail e/ou o banner do jogo (multipart, campos opcionais).

    Salva em storage/images/<game_id>-thumb.<ext> e -banner.<ext> e devolve o
    jogo atualizado no contrato (thumb_url/banner_url)."""
    game = _get_owned_game(db, game_id, current_user)
    if thumb is None and banner is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Envie pelo menos uma imagem: thumb e/ou banner",
        )
    # Valida os DOIS antes de gravar qualquer um: erro num deles não deixa o
    # outro gravado no disco sem path no banco (arquivo órfão).
    pending: dict[str, tuple[str, bytes]] = {}
    if thumb is not None:
        pending["thumb"] = _read_image(thumb, "thumb")
    if banner is not None:
        pending["banner"] = _read_image(banner, "banner")
    for kind, (ext, content) in pending.items():
        relpath = f"{IMAGE_STORAGE_RELATIVE}/{game_id}-{kind}{ext}"
        target = _images_dir() / f"{game_id}-{kind}{ext}"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        if kind == "thumb":
            game.thumb_path = relpath
        else:
            game.banner_path = relpath
    game.updated_at = func.now()
    db.commit()
    db.refresh(game)
    return game_out(game, _stats(db, game.id))


def _serve_game_image(
    game_id: int, kind: str, db: DbSession, current_user: OptionalUser
) -> FileResponse:
    """Serve thumb/banner do jogo (404 sem arquivo). Público para jogos
    PUBLICADOS (o <img> do card não manda auth); rascunho só o dono — mesma
    regra do SVG."""
    game = db.get(Game, game_id)
    if game is None:
        raise _IMAGE_NOT_FOUND
    stored_path = getattr(game, f"{kind}_path")
    if stored_path is None:
        raise _IMAGE_NOT_FOUND
    is_owner = current_user is not None and game.criado_por == current_user.id
    if game.status != "published" and not is_owner:
        raise _IMAGE_NOT_FOUND
    path = _resolve_storage_path(stored_path)
    if path is None or not path.is_file():
        raise _IMAGE_NOT_FOUND
    media_type = _IMAGE_MEDIA_TYPES.get(Path(stored_path).suffix.lower())
    return FileResponse(path, media_type=media_type)


@router.get("/{game_id}/thumb")
def get_thumb(game_id: int, db: DbSession, current_user: OptionalUser) -> FileResponse:
    return _serve_game_image(game_id, "thumb", db, current_user)


@router.get("/{game_id}/banner")
def get_banner(game_id: int, db: DbSession, current_user: OptionalUser) -> FileResponse:
    return _serve_game_image(game_id, "banner", db, current_user)
