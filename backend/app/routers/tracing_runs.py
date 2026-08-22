"""Authorized tracing run lifecycle for the profile-name tracing game."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import (
    CHILD_NOT_FOUND,
    CurrentProfessional,
    CurrentUser,
    DbSession,
    get_tracing_access,
)
from app.glyphs import GlyphGeometry, MissingGlyphError, first_name_graphemes
from app.models import Child, Game, GameAssignment, GameDefaults, GameRun, GlyphSet
from app.schemas import (
    AssignmentTraceOverrides,
    AssignmentTracingConfigOut,
    GameDefaultsOut,
    GameTracingConfigPatch,
    GlyphSetCatalogOut,
    GlyphSetCatalogResponse,
    LinkedAssignmentOut,
    LinkedChildOut,
    LinkedChildrenResponse,
    TracingRunFinalizeRequest,
    TracingRunListResponse,
    TracingRunOut,
    TracingRunStartRequest,
)
from app.tracing import (
    ContactMode,
    RunTraceStatus,
    TraceEvidence,
    TraceReplay,
    TraceScore,
    TraceValidationError,
    evidence_sha256,
    make_trace_evidence,
    replay_trace,
    score_run,
)

router = APIRouter(prefix="/api/tracing-runs", tags=["tracing-runs"])

_GAME_SLUG = "escreva-seu-nome"
_GAME_NOT_PUBLISHED = HTTPException(
    status.HTTP_409_CONFLICT, detail="Este jogo ainda não está disponível para jogar"
)
_CONFIGURATION_ERROR = HTTPException(
    status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Configuração de tracing indisponível"
)


def _published_game(db: DbSession) -> Game:
    game = db.scalar(select(Game).where(Game.slug == _GAME_SLUG))
    if game is None:
        raise CHILD_NOT_FOUND
    if game.status != "published":
        raise _GAME_NOT_PUBLISHED
    return game


def _glyph_set_style(glyph_set: GlyphSet) -> str:
    filename = glyph_set.artifact_path.rsplit("/", 1)[-1].removesuffix(".svg")
    return filename.rsplit("-v", 1)[0]


def _glyph_set_catalog(glyph_set: GlyphSet) -> GlyphSetCatalogOut:
    return GlyphSetCatalogOut(
        id=glyph_set.id,
        version=glyph_set.version,
        artifact_sha256=glyph_set.artifact_sha256,
        sha256=glyph_set.artifact_sha256,
        artifact_path=glyph_set.artifact_path,
        style=_glyph_set_style(glyph_set),
        geometry=glyph_set.geometry,
        immutable=glyph_set.immutable,
    )


def _active_glyph_set(db: DbSession, glyph_set_id: int) -> GlyphSet:
    glyph_set = db.scalar(
        select(GlyphSet).where(
            GlyphSet.id == glyph_set_id,
            GlyphSet.status == "active",
            GlyphSet.immutable.is_(True),
        )
    )
    if glyph_set is None:
        raise CHILD_NOT_FOUND
    return glyph_set


def _run_glyph_set(db: DbSession, run: GameRun) -> GlyphSet:
    if run.glyph_set_id is None or run.glyph_set_version is None or run.glyph_set_sha256 is None:
        raise _CONFIGURATION_ERROR
    glyph_set = db.get(GlyphSet, run.glyph_set_id)
    if (
        glyph_set is None
        or not glyph_set.immutable
        or glyph_set.version != run.glyph_set_version
        or glyph_set.artifact_sha256 != run.glyph_set_sha256
    ):
        raise _CONFIGURATION_ERROR
    return glyph_set


def _owned_game(db: DbSession, game_id: int, user: CurrentUser) -> Game:
    game = db.get(Game, game_id)
    if game is None or user.role != "professional" or game.criado_por != user.id:
        raise CHILD_NOT_FOUND
    return game


def _owned_assignment(db: DbSession, assignment_id: int, user: CurrentUser) -> GameAssignment:
    assignment = db.get(GameAssignment, assignment_id)
    if assignment is None or user.role != "professional" or assignment.professional_id != user.id:
        raise CHILD_NOT_FOUND
    return assignment


def _assignment_config_response(assignment: GameAssignment) -> AssignmentTracingConfigOut:
    return AssignmentTracingConfigOut(
        assignment_id=assignment.id,
        game_id=assignment.game_id,
        child_id=assignment.child_id,
        glyph_set_id_override=assignment.glyph_set_id_override,
        threshold_override=assignment.threshold_override,
        contact_mode_override=(
            ContactMode(assignment.contact_mode_override)
            if assignment.contact_mode_override is not None
            else None
        ),
        pause_grace_ms_override=assignment.pause_grace_ms_override,
    )


def _assignment_defaults(
    defaults: GameDefaults, assignment: GameAssignment | None
) -> tuple[int, str, int, int]:
    threshold = (
        assignment.threshold_override
        if assignment and assignment.threshold_override is not None
        else defaults.threshold
    )
    contact_mode = (
        assignment.contact_mode_override
        if assignment and assignment.contact_mode_override
        else defaults.contact_mode
    )
    pause_grace_ms = (
        assignment.pause_grace_ms_override
        if assignment and assignment.pause_grace_ms_override is not None
        else defaults.pause_grace_ms
    )
    glyph_set_id = (
        assignment.glyph_set_id_override
        if assignment and assignment.glyph_set_id_override is not None
        else defaults.glyph_set_id
    )
    return threshold, contact_mode, pause_grace_ms, glyph_set_id


def _effective_config(
    db: DbSession,
    child_name: str,
    defaults: GameDefaults,
    assignment: GameAssignment | None,
) -> tuple[dict[str, object], GlyphSet]:
    threshold, contact_mode, pause_grace_ms, glyph_set_id = _assignment_defaults(
        defaults, assignment
    )
    glyph_set = db.get(GlyphSet, glyph_set_id)
    if glyph_set is None:
        raise _CONFIGURATION_ERROR
    try:
        graphemes = first_name_graphemes(child_name)
        for grapheme in graphemes:
            if grapheme not in glyph_set.geometry:
                raise MissingGlyphError(grapheme, glyph_set.version)
    except MissingGlyphError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    sequence = list(graphemes)
    config: dict[str, object] = {
        "threshold": threshold,
        "contact_mode": contact_mode,
        "pause_grace_ms": pause_grace_ms,
        "glyph_set_id": glyph_set.id,
        "glyph_set_version": glyph_set.version,
        "glyph_set_sha256": glyph_set.artifact_sha256,
        "scoring_version": defaults.scoring_version,
        "schema_version": defaults.schema_version,
        "glyph_sequence": sequence,
        "assignment_id": assignment.id if assignment is not None else None,
    }
    return config, glyph_set


def _run_response(db: DbSession, run: GameRun, include_evidence: bool) -> TracingRunOut:
    config = dict(run.effective_config or {})
    sequence = [str(item) for item in cast(list[object], config.get("glyph_sequence", []))]
    stored_evidence = TraceEvidence.model_validate(run.evidence) if run.evidence else None
    evidence = stored_evidence if include_evidence else None
    glyphs = stored_evidence.glyphs if stored_evidence is not None else []
    return TracingRunOut(
        id=run.id,
        game_id=run.game_id,
        child_id=run.child_id,
        status=RunTraceStatus(run.status),
        score=run.score,
        duration_seconds=run.duration_seconds,
        glyph_set_id=run.glyph_set_id,
        glyph_set_version=run.glyph_set_version,
        glyph_set_sha256=run.glyph_set_sha256,
        threshold=run.threshold,
        contact_mode=ContactMode(run.contact_mode) if run.contact_mode else None,
        pause_grace_ms=run.pause_grace_ms,
        scoring_version=run.scoring_version,
        schema_version=run.schema_version,
        effective_config=config,
        glyph_sequence=sequence,
        glyphs=glyphs,
        evidence_sha256=run.evidence_sha256,
        evidence_version=run.evidence_version,
        evidence=evidence,
        glyph_set=_glyph_set_catalog(_run_glyph_set(db, run)),
        started_at=run.started_at,
        completed_at=run.completed_at,
        last_activity_at=run.last_activity_at,
    )


def _authorized_run(db: DbSession, run_id: int, user: CurrentUser) -> GameRun:
    run = db.get(GameRun, run_id)
    if run is None or run.effective_config is None:
        raise CHILD_NOT_FOUND
    get_tracing_access(db, run.child_id, run.game_id, user)
    return run


@router.get("/glyph-sets", response_model=GlyphSetCatalogResponse)
def list_active_glyph_sets(db: DbSession, current_user: CurrentUser) -> GlyphSetCatalogResponse:
    """Return only immutable active geometry available to authenticated adults."""
    glyph_sets = db.scalars(
        select(GlyphSet)
        .where(GlyphSet.status == "active", GlyphSet.immutable.is_(True))
        .order_by(GlyphSet.id)
    ).all()
    return GlyphSetCatalogResponse(items=[_glyph_set_catalog(item) for item in glyph_sets])


@router.get("/config/{game_id}", response_model=GameDefaultsOut)
def get_game_tracing_config(
    game_id: int, db: DbSession, current_user: CurrentUser
) -> GameDefaultsOut:
    _owned_game(db, game_id, current_user)
    defaults = db.get(GameDefaults, game_id)
    if defaults is None:
        raise CHILD_NOT_FOUND
    return GameDefaultsOut.model_validate(defaults)


@router.patch("/config/{game_id}", response_model=GameDefaultsOut)
def update_game_tracing_config(
    game_id: int,
    payload: GameTracingConfigPatch,
    db: DbSession,
    current_user: CurrentUser,
) -> GameDefaultsOut:
    _owned_game(db, game_id, current_user)
    defaults = db.scalar(
        select(GameDefaults).where(GameDefaults.game_id == game_id).with_for_update()
    )
    if defaults is None:
        raise CHILD_NOT_FOUND
    if "glyph_set_id" in payload.model_fields_set:
        glyph_set = _active_glyph_set(db, cast(int, payload.glyph_set_id))
        defaults.glyph_set_id = glyph_set.id
        defaults.glyph_set_version = glyph_set.version
        defaults.glyph_set_sha256 = glyph_set.artifact_sha256
    if "threshold" in payload.model_fields_set:
        defaults.threshold = cast(int, payload.threshold)
    if "contact_mode" in payload.model_fields_set:
        defaults.contact_mode = cast(ContactMode, payload.contact_mode).value
    if "pause_grace_ms" in payload.model_fields_set:
        defaults.pause_grace_ms = cast(int, payload.pause_grace_ms)
    db.commit()
    db.refresh(defaults)
    return GameDefaultsOut.model_validate(defaults)


@router.get("/assignments/{assignment_id}", response_model=AssignmentTracingConfigOut)
def get_assignment_tracing_config(
    assignment_id: int, db: DbSession, current_user: CurrentUser
) -> AssignmentTracingConfigOut:
    return _assignment_config_response(_owned_assignment(db, assignment_id, current_user))


@router.patch("/assignments/{assignment_id}", response_model=AssignmentTracingConfigOut)
def update_assignment_tracing_config(
    assignment_id: int,
    payload: AssignmentTraceOverrides,
    db: DbSession,
    current_user: CurrentUser,
) -> AssignmentTracingConfigOut:
    assignment = _owned_assignment(db, assignment_id, current_user)
    if (
        "glyph_set_id_override" in payload.model_fields_set
        and payload.glyph_set_id_override is not None
    ):
        _active_glyph_set(db, payload.glyph_set_id_override)
    for field in (
        "glyph_set_id_override",
        "threshold_override",
        "contact_mode_override",
        "pause_grace_ms_override",
    ):
        if field in payload.model_fields_set:
            setattr(assignment, field, getattr(payload, field))
    db.commit()
    db.refresh(assignment)
    return _assignment_config_response(assignment)


@router.get("/children", response_model=LinkedChildrenResponse)
def list_professional_linked_children(
    db: DbSession, current_user: CurrentProfessional
) -> LinkedChildrenResponse:
    rows = db.execute(
        select(GameAssignment, Child)
        .join(Child, Child.id == GameAssignment.child_id)
        .where(GameAssignment.professional_id == current_user.id)
        .order_by(Child.name, GameAssignment.id)
    ).all()
    children: dict[UUID, LinkedChildOut] = {}
    for assignment, child in rows:
        item = children.setdefault(
            child.id,
            LinkedChildOut(child_id=child.id, name=child.name, assignments=[]),
        )
        item.assignments.append(
            LinkedAssignmentOut(assignment_id=assignment.id, game_id=assignment.game_id)
        )
    return LinkedChildrenResponse(items=list(children.values()))


@router.get("", response_model=TracingRunListResponse)
def list_tracing_runs(
    db: DbSession,
    current_user: CurrentUser,
    child_id: Annotated[UUID | None, Query()] = None,
    game_id: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TracingRunListResponse:
    query = (
        select(GameRun)
        .join(Child, Child.id == GameRun.child_id)
        .where(
            GameRun.status.in_(
                (
                    RunTraceStatus.STARTED.value,
                    RunTraceStatus.COMPLETED.value,
                    RunTraceStatus.ABANDONED.value,
                )
            )
        )
    )
    if current_user.role == "family":
        query = query.where(Child.user_id == current_user.id)
    elif current_user.role == "professional":
        query = query.join(
            GameAssignment,
            (GameAssignment.child_id == GameRun.child_id)
            & (GameAssignment.game_id == GameRun.game_id)
            & (GameAssignment.professional_id == current_user.id),
        )
    else:
        raise CHILD_NOT_FOUND
    if child_id is not None:
        query = query.where(GameRun.child_id == child_id)
    if game_id is not None:
        query = query.where(GameRun.game_id == game_id)
    query = query.order_by(GameRun.last_activity_at.desc().nullslast(), GameRun.id.desc())
    runs = list(db.scalars(query.offset(offset).limit(limit + 1)).all())
    has_more = len(runs) > limit
    if has_more:
        runs = runs[:limit]
    return TracingRunListResponse(
        items=[_run_response(db, run, include_evidence=False) for run in runs],
        limit=limit,
        offset=offset,
        has_more=has_more,
    )


@router.post("/start", response_model=TracingRunOut, status_code=status.HTTP_201_CREATED)
def start_tracing_run(
    payload: TracingRunStartRequest, db: DbSession, current_user: CurrentUser
) -> TracingRunOut:
    game = _published_game(db)
    child, assignment = get_tracing_access(
        db, payload.child_id, game.id, current_user, payload.assignment_id
    )
    defaults = db.get(GameDefaults, game.id)
    if defaults is None:
        raise _CONFIGURATION_ERROR
    config, glyph_set = _effective_config(db, child.name, defaults, assignment)
    now = datetime.now(UTC)
    run = GameRun(
        game_id=game.id,
        child_id=child.id,
        status=RunTraceStatus.STARTED.value,
        glyph_set_id=glyph_set.id,
        glyph_set_version=glyph_set.version,
        glyph_set_sha256=glyph_set.artifact_sha256,
        threshold=cast(int, config["threshold"]),
        contact_mode=cast(str, config["contact_mode"]),
        pause_grace_ms=cast(int, config["pause_grace_ms"]),
        scoring_version=cast(int, config["scoring_version"]),
        schema_version=cast(int, config["schema_version"]),
        effective_config=config,
        started_at=now,
        last_activity_at=now,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _run_response(db, run, include_evidence=False)


def _validate_run_evidence(run: GameRun, evidence: TraceEvidence) -> tuple[TraceReplay, list[str]]:
    config = run.effective_config or {}
    sequence = [str(item) for item in cast(list[object], config.get("glyph_sequence", []))]
    if (
        not sequence
        or run.glyph_set_id is None
        or run.glyph_set_version is None
        or run.glyph_set_sha256 is None
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Run de tracing inválido")
    if (
        evidence.schema_version != run.schema_version
        or evidence.scoring_version != run.scoring_version
        or evidence.glyph_set_id != run.glyph_set_id
        or evidence.glyph_set_version != run.glyph_set_version
        or evidence.glyph_set_sha256 != run.glyph_set_sha256
        or evidence.artifact_version != run.glyph_set_version
        or evidence.artifact_sha256 != run.glyph_set_sha256
        or evidence.pause_grace_ms != run.pause_grace_ms
    ):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Evidence não corresponde ao run"
        )
    for event in evidence.events:
        if event.glyph_index >= len(sequence):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Glyph index inválido"
            )
    try:
        replay = replay_trace(
            evidence.events,
            ContactMode(run.contact_mode or ContactMode.TIMED_PAUSE),
            pause_grace_ms=run.pause_grace_ms or 0,
        )
    except (TraceValidationError, ValidationError, ValueError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return replay, sequence


@router.post("/{run_id}/finalize", response_model=TracingRunOut)
def finalize_tracing_run(
    run_id: int,
    payload: TracingRunFinalizeRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> TracingRunOut:
    run = db.scalar(select(GameRun).where(GameRun.id == run_id).with_for_update())
    if run is None or run.effective_config is None:
        raise CHILD_NOT_FOUND
    get_tracing_access(db, run.child_id, run.game_id, current_user)
    if run.idempotency_key is not None:
        if run.idempotency_key == payload.idempotency_key:
            return _run_response(db, run, include_evidence=False)
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Run já finalizado")
    if run.status != RunTraceStatus.STARTED.value:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Run já finalizado")

    replay, sequence = _validate_run_evidence(run, payload.evidence)
    glyph_set = db.get(GlyphSet, run.glyph_set_id)
    if glyph_set is None:
        raise _CONFIGURATION_ERROR
    targets = [cast(GlyphGeometry, glyph_set.geometry[grapheme]) for grapheme in sequence]
    mode = ContactMode(run.contact_mode or ContactMode.TIMED_PAUSE)
    result = score_run(
        payload.evidence.events,
        targets,
        mode,
        pause_grace_ms=run.pause_grace_ms or 0,
    )
    down_order: list[int] = []
    for event in payload.evidence.events:
        if event.type.value == "down" and (not down_order or down_order[-1] != event.glyph_index):
            down_order.append(event.glyph_index)
    ordered = down_order == list(range(len(down_order)))
    threshold = run.threshold if run.threshold is not None else 0
    every_glyph_meets_threshold = len(result.glyphs) == len(sequence) and all(
        item.score >= threshold for item in result.glyphs
    )
    completed = result.completed and ordered and not replay.errors and every_glyph_meets_threshold
    aggregate = TraceScore(
        score=result.score,
        coverage=result.coverage,
        precision=result.precision,
        engagement=result.engagement,
        completed=completed,
        valid_trace_length=sum(item.valid_trace_length for item in result.glyphs),
        target_length=sum(item.target_length for item in result.glyphs),
    )
    authoritative = make_trace_evidence(
        payload.evidence.events,
        cast(str, run.glyph_set_version),
        cast(str, run.glyph_set_sha256),
        aggregate,
        glyph_set_id=run.glyph_set_id,
        graphemes=sequence,
        glyph_scores=result.glyphs,
        mode=mode,
        pause_grace_ms=run.pause_grace_ms or 0,
        minimum_score=threshold,
    )
    evidence_payload = authoritative.model_dump(mode="json")
    evidence_payload["status"] = (
        RunTraceStatus.COMPLETED.value if completed else RunTraceStatus.ABANDONED.value
    )
    authoritative = TraceEvidence.model_validate(evidence_payload)
    now = datetime.now(UTC)
    times = [event.t_ms for event in payload.evidence.events]
    run.status = RunTraceStatus.COMPLETED.value if completed else RunTraceStatus.ABANDONED.value
    run.score = result.score
    run.duration_seconds = (max(times) - min(times)) // 1000 if times else 0
    run.completed_at = now
    run.last_activity_at = now
    run.idempotency_key = payload.idempotency_key
    run.evidence = authoritative.model_dump(mode="json")
    run.evidence_sha256 = evidence_sha256(authoritative)
    run.evidence_version = authoritative.schema_version
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Idempotency key já utilizada"
        ) from exc
    db.refresh(run)
    return _run_response(db, run, include_evidence=False)


@router.get("/{run_id}", response_model=TracingRunOut)
def get_tracing_run(run_id: int, db: DbSession, current_user: CurrentUser) -> TracingRunOut:
    return _run_response(db, _authorized_run(db, run_id, current_user), include_evidence=False)


@router.get("/{run_id}/replay", response_model=TracingRunOut)
def replay_tracing_run(run_id: int, db: DbSession, current_user: CurrentUser) -> TracingRunOut:
    run = _authorized_run(db, run_id, current_user)
    if run.evidence is None:
        raise CHILD_NOT_FOUND
    return _run_response(db, run, include_evidence=True)
