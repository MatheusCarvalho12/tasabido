"""Deterministic v1 trace replay, scoring, and faithful run evidence."""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import TypeAlias

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.glyphs import GlyphGeometry

TRACE_SCHEMA_VERSION = 1
TRACE_SCORING_VERSION = 1
ENGAGEMENT_TARGET_FRACTION = 0.25
DEFAULT_CORRIDOR_RADIUS = 0.085
DEFAULT_PAUSE_GRACE_MS = 1_500
MAX_PAUSE_GRACE_MS = 3_000

Point: TypeAlias = tuple[float, float]  # noqa: UP040


class ContactMode(StrEnum):
    STRICT_CONTINUOUS = "strict_continuous"
    TIMED_PAUSE = "timed_pause"
    FREE = "free"


class TraceEventType(StrEnum):
    DOWN = "down"
    MOVE = "move"
    UP = "up"
    CANCEL = "cancel"
    RESET = "reset"
    GRACE_EXPIRE = "grace_expire"


class SegmentStatus(StrEnum):
    OPEN = "open"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESET = "reset"
    GRACE_EXPIRED = "grace_expired"


class GlyphTraceStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    INVALID = "invalid"


class RunTraceStatus(StrEnum):
    STARTED = "started"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    LEGACY = "legacy"


class TraceValidationError(ValueError):
    """A trace violates a monotonic ordering or pointer-state invariant."""

    def __init__(self, index: int, reason: str) -> None:
        self.index = index
        self.reason = reason
        super().__init__(f"Invalid trace event at index {index}: {reason}")


class TraceEvent(BaseModel):
    """One raw event in normalized coordinates, retained in received order."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    seq: int = Field(ge=0)
    type: TraceEventType = Field(
        validation_alias=AliasChoices("type", "event", "kind", "event_type")
    )
    pointer_id: int = Field(default=0, ge=0)
    x_norm: float | None = Field(default=None, validation_alias=AliasChoices("x_norm", "x"))
    y_norm: float | None = Field(default=None, validation_alias=AliasChoices("y_norm", "y"))
    t_ms: int = Field(validation_alias=AliasChoices("t_ms", "timestamp_ms", "time_ms", "t"), ge=0)
    in_bounds: bool = True
    glyph_index: int = Field(default=0, ge=0)
    segment_index: int = Field(default=0, ge=0)

    @field_validator("x_norm", "y_norm")
    @classmethod
    def _finite_coordinate(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("trace coordinates must be finite")
        return value

    @model_validator(mode="after")
    def _coordinate_contract(self) -> TraceEvent:
        if self.type not in (
            TraceEventType.CANCEL,
            TraceEventType.RESET,
            TraceEventType.GRACE_EXPIRE,
        ) and (self.x_norm is None or self.y_norm is None):
            raise ValueError(f"{self.type.value} events require x_norm and y_norm")
        return self


@dataclass(frozen=True, slots=True)
class TraceSegment:
    points: tuple[Point, ...]
    glyph_index: int
    segment_index: int
    pointer_id: int
    status: SegmentStatus
    started_at_ms: int
    ended_at_ms: int
    event_seqs: tuple[int, ...] = ()
    point_in_bounds: tuple[bool, ...] = ()

    @property
    def completed(self) -> bool:
        return self.status is SegmentStatus.COMPLETED

    @property
    def valid_strokes(self) -> tuple[tuple[Point, ...], ...]:
        """Return in-bounds runs without joining across an outside point."""

        if not self.points:
            return ()
        if len(self.point_in_bounds) != len(self.points):
            return (self.points,)
        strokes: list[tuple[Point, ...]] = []
        current: list[Point] = []
        for point, in_bounds in zip(self.points, self.point_in_bounds, strict=True):
            if in_bounds:
                current.append(point)
            elif current:
                strokes.append(tuple(current))
                current = []
        if current:
            strokes.append(tuple(current))
        return tuple(strokes)


@dataclass(frozen=True, slots=True)
class TraceReplay:
    events: tuple[TraceEvent, ...]
    segments: tuple[TraceSegment, ...]
    completed: bool
    cancelled: bool
    errors: tuple[TraceValidationError, ...] = ()

    @property
    def strokes(self) -> tuple[tuple[Point, ...], ...]:
        return tuple(segment.points for segment in self.segments if segment.completed)

    @property
    def points(self) -> tuple[Point, ...]:
        return tuple(point for stroke in self.strokes for point in stroke)


@dataclass(frozen=True, slots=True)
class TraceScore:
    score: int
    coverage: float
    precision: float
    engagement: float
    completed: bool
    valid_trace_length: float = 0.0
    target_length: float = 0.0
    schema_version: int = TRACE_SCHEMA_VERSION
    scoring_version: int = TRACE_SCORING_VERSION

    def as_dict(self) -> dict[str, int | float | bool]:
        return {
            "score": self.score,
            "coverage": self.coverage,
            "precision": self.precision,
            "engagement": self.engagement,
            "completed": self.completed,
            "valid_trace_length": self.valid_trace_length,
            "target_length": self.target_length,
            "schema_version": self.schema_version,
            "scoring_version": self.scoring_version,
        }


class TraceSegmentEvidence(BaseModel):
    segment_index: int = Field(ge=0)
    glyph_index: int = Field(ge=0)
    pointer_id: int = Field(ge=0)
    status: SegmentStatus
    started_at_ms: int = Field(ge=0)
    ended_at_ms: int = Field(ge=0)
    event_seqs: list[int] = Field(default_factory=list)
    points: list[tuple[float, float]] = Field(default_factory=list)
    in_bounds: list[bool] = Field(default_factory=list)


class GlyphTraceEvidence(BaseModel):
    glyph_index: int = Field(ge=0)
    grapheme: str = Field(min_length=1, max_length=8)
    status: GlyphTraceStatus
    segments: list[TraceSegmentEvidence] = Field(default_factory=list)
    score: int = Field(ge=0, le=100)
    coverage: float = Field(ge=0, le=1)
    precision: float = Field(ge=0, le=1)
    engagement: float = Field(ge=0, le=1)


class TraceEvidence(BaseModel):
    """Complete run evidence: raw ordered events plus per-glyph outcomes."""

    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(default=TRACE_SCHEMA_VERSION, ge=1)
    scoring_version: int = Field(default=TRACE_SCORING_VERSION, ge=1)
    pause_grace_ms: int = Field(default=DEFAULT_PAUSE_GRACE_MS, ge=0, le=MAX_PAUSE_GRACE_MS)
    glyph_set_id: int | None = Field(default=None, ge=1)
    glyph_set_version: str | None = Field(default=None, min_length=1, max_length=120)
    glyph_set_sha256: str | None = Field(default=None, min_length=64, max_length=64)
    artifact_version: str = Field(min_length=1, max_length=120)
    artifact_sha256: str = Field(min_length=64, max_length=64)
    events: list[TraceEvent]
    glyphs: list[GlyphTraceEvidence] = Field(default_factory=list)
    status: RunTraceStatus = RunTraceStatus.STARTED
    score: TraceScore | None = None

    @field_validator("artifact_sha256")
    @classmethod
    def _sha256_hex(cls, value: str) -> str:
        if len(value) != 64 or any(character not in "0123456789abcdef" for character in value):
            raise ValueError("artifact_sha256 must be a lowercase SHA-256 hex digest")
        return value

    @model_validator(mode="after")
    def _glyph_identity(self) -> TraceEvidence:
        if self.glyph_set_version is not None and self.glyph_set_version != self.artifact_version:
            raise ValueError("glyph_set_version must match artifact_version")
        if self.glyph_set_sha256 is not None and self.glyph_set_sha256 != self.artifact_sha256:
            raise ValueError("glyph_set_sha256 must match artifact_sha256")
        return self


def _event(value: TraceEvent | Mapping[str, object], fallback_seq: int) -> TraceEvent:
    if isinstance(value, TraceEvent):
        return value
    data = dict(value)
    data.setdefault("seq", fallback_seq)
    data.setdefault("pointer_id", 0)
    data.setdefault("glyph_index", 0)
    data.setdefault("segment_index", 0)
    if "in_bounds" not in data:
        x = data.get("x_norm", data.get("x"))
        y = data.get("y_norm", data.get("y"))
        data["in_bounds"] = (
            isinstance(x, (int, float))
            and isinstance(y, (int, float))
            and 0 <= x <= 1
            and 0 <= y <= 1
        )
    return TraceEvent.model_validate(data)


def _invalid(index: int, reason: str) -> TraceValidationError:
    return TraceValidationError(index, reason)


def _pause_value(pause_grace_ms: int, grace_ms: int | None) -> int:
    value = pause_grace_ms if grace_ms is None else grace_ms
    if not 0 <= value <= MAX_PAUSE_GRACE_MS:
        raise ValueError(f"pause_grace_ms must be between 0 and {MAX_PAUSE_GRACE_MS}")
    return value


def replay_trace(
    events: Sequence[TraceEvent | Mapping[str, object]],
    mode: ContactMode | str = ContactMode.STRICT_CONTINUOUS,
    pause_grace_ms: int = DEFAULT_PAUSE_GRACE_MS,
    *,
    grace_ms: int | None = None,
) -> TraceReplay:
    """Replay all segments, resets, and invalid releases without losing evidence."""

    try:
        selected_mode = ContactMode(mode)
    except ValueError as exc:
        raise ValueError(f"unknown contact mode: {mode!r}") from exc
    pause_grace_ms = _pause_value(pause_grace_ms, grace_ms)
    parsed = tuple(_event(item, index) for index, item in enumerate(events))
    errors: list[TraceValidationError] = []
    segments: list[TraceSegment] = []
    current: list[Point] = []
    active_pointer: int | None = None
    current_glyph = 0
    current_segment = 0
    started_at = 0
    current_event_seqs: list[int] = []
    current_point_in_bounds: list[bool] = []
    last_seq: int | None = None
    last_t: int | None = None
    last_release: int | None = None
    completed = False
    cancelled = False

    def finish(status: SegmentStatus, ended_at: int) -> None:
        nonlocal current, active_pointer, current_point_in_bounds
        if active_pointer is not None:
            segments.append(
                TraceSegment(
                    points=tuple(current),
                    glyph_index=current_glyph,
                    segment_index=current_segment,
                    pointer_id=active_pointer,
                    status=status,
                    started_at_ms=started_at,
                    ended_at_ms=ended_at,
                    event_seqs=tuple(current_event_seqs),
                    point_in_bounds=tuple(current_point_in_bounds),
                )
            )
        current = []
        current_event_seqs.clear()
        current_point_in_bounds = []
        active_pointer = None

    for index, item in enumerate(parsed):
        if last_seq is not None and item.seq <= last_seq:
            raise _invalid(index, "seq must be strictly increasing")
        if last_t is not None and item.t_ms < last_t:
            raise _invalid(index, "timestamps must be non-decreasing")
        last_seq = item.seq
        last_t = item.t_ms

        if item.type is TraceEventType.DOWN:
            if active_pointer is not None:
                errors.append(_invalid(index, "down cannot start while a pointer is active"))
                continue
            if (
                selected_mode is ContactMode.TIMED_PAUSE
                and last_release is not None
                and item.t_ms - last_release > pause_grace_ms
            ):
                errors.append(_invalid(index, "pause exceeds pause_grace_ms"))
            active_pointer = item.pointer_id
            current_glyph = item.glyph_index
            current_segment = item.segment_index
            started_at = item.t_ms
            current_event_seqs = [item.seq]
            current = []
            current_point_in_bounds = []
            if item.x_norm is not None and item.y_norm is not None:
                current.append((item.x_norm, item.y_norm))
                current_point_in_bounds.append(item.in_bounds)
            completed = False
            continue

        if item.type is TraceEventType.MOVE:
            if active_pointer != item.pointer_id:
                errors.append(_invalid(index, "move requires its active pointer"))
                continue
            if item.x_norm is not None and item.y_norm is not None:
                current.append((item.x_norm, item.y_norm))
                current_point_in_bounds.append(item.in_bounds)
            current_event_seqs.append(item.seq)
            continue

        if item.type is TraceEventType.UP:
            if active_pointer != item.pointer_id:
                errors.append(_invalid(index, "release without its active pointer"))
                if active_pointer is not None:
                    current_event_seqs.append(item.seq)
                    finish(SegmentStatus.RESET, item.t_ms)
                    current_segment += 1
                # An invalid release is non-terminal: a later down can begin a
                # new segment and all later events remain replayable.
                continue
            if item.x_norm is not None and item.y_norm is not None:
                current.append((item.x_norm, item.y_norm))
                current_point_in_bounds.append(item.in_bounds)
            current_event_seqs.append(item.seq)
            finish(SegmentStatus.COMPLETED, item.t_ms)
            last_release = item.t_ms
            completed = True
            cancelled = False
            continue

        if item.type is TraceEventType.CANCEL:
            if active_pointer == item.pointer_id:
                if item.x_norm is not None and item.y_norm is not None:
                    current.append((item.x_norm, item.y_norm))
                    current_point_in_bounds.append(item.in_bounds)
                current_event_seqs.append(item.seq)
                finish(SegmentStatus.CANCELLED, item.t_ms)
            else:
                errors.append(_invalid(index, "cancel without its active pointer"))
            completed = False
            cancelled = True
            continue

        if item.type is TraceEventType.RESET:
            if active_pointer is not None:
                current_event_seqs.append(item.seq)
                finish(SegmentStatus.RESET, item.t_ms)
            current_segment = max(current_segment + 1, item.segment_index)
            completed = False
            cancelled = False
            continue

        if item.type is TraceEventType.GRACE_EXPIRE:
            if selected_mode is not ContactMode.TIMED_PAUSE:
                errors.append(_invalid(index, "grace_expire requires timed_pause"))
            if active_pointer is not None:
                current_event_seqs.append(item.seq)
                finish(SegmentStatus.GRACE_EXPIRED, item.t_ms)
            current_segment = max(current_segment + 1, item.segment_index)
            completed = False

    if active_pointer is not None:
        finish(SegmentStatus.OPEN, last_t if last_t is not None else started_at)
        completed = False
    return TraceReplay(tuple(parsed), tuple(segments), completed, cancelled, tuple(errors))


def validate_trace_events(
    events: Sequence[TraceEvent | Mapping[str, object]],
    mode: ContactMode | str = ContactMode.STRICT_CONTINUOUS,
    pause_grace_ms: int = DEFAULT_PAUSE_GRACE_MS,
    *,
    grace_ms: int | None = None,
) -> TraceReplay:
    replay = replay_trace(events, mode, pause_grace_ms, grace_ms=grace_ms)
    if replay.errors:
        raise replay.errors[0]
    return replay


def _distance(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _point_segment_distance(point: Point, start: Point, end: Point) -> float:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length_squared = dx * dx + dy * dy
    if length_squared == 0:
        return _distance(point, start)
    projection = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length_squared
    projection = max(0.0, min(1.0, projection))
    return _distance(point, (start[0] + projection * dx, start[1] + projection * dy))


def _segments(polylines: Sequence[Sequence[Point]]) -> tuple[tuple[Point, Point, float], ...]:
    result: list[tuple[Point, Point, float]] = []
    for polyline in polylines:
        result.extend(
            (start, end, _distance(start, end))
            for start, end in zip(polyline, polyline[1:], strict=False)
            if _distance(start, end) > 0
        )
    return tuple(result)


def _sample_segment(
    start: Point, end: Point, length: float, step: float = 0.01
) -> tuple[Point, ...]:
    count = max(1, math.ceil(length / step))
    return tuple(
        (
            start[0] + (end[0] - start[0]) * fraction / count,
            start[1] + (end[1] - start[1]) * fraction / count,
        )
        for fraction in range(count + 1)
    )


def _near_segments(
    point: Point, segments: Sequence[tuple[Point, Point, float]], radius: float
) -> bool:
    return any(_point_segment_distance(point, start, end) <= radius for start, end, _ in segments)


def _target_geometry(
    target: Sequence[Sequence[Point]] | GlyphGeometry,
) -> tuple[tuple[Point, ...], ...]:
    return tuple(tuple((float(x), float(y)) for x, y in stroke) for stroke in target)


def _score_components(
    target: Sequence[Sequence[Point]] | GlyphGeometry,
    user_polylines: Sequence[Sequence[Point]],
    completed: bool,
    corridor_radius: float,
) -> TraceScore:
    target_segments = _segments(_target_geometry(target))
    target_length = sum(length for _, _, length in target_segments)
    user_segments = _segments(user_polylines)
    valid_trace_length = sum(length for _, _, length in user_segments)
    if not completed or target_length == 0 or valid_trace_length == 0:
        return TraceScore(0, 0.0, 0.0, 0.0, completed, valid_trace_length, target_length)

    covered_length = 0.0
    for start, end, length in target_segments:
        samples = _sample_segment(start, end, length)
        covered_length += (
            length
            * sum(_near_segments(sample, user_segments, corridor_radius) for sample in samples)
            / len(samples)
        )
    coverage = min(1.0, covered_length / target_length)

    precise_length = 0.0
    for start, end, length in user_segments:
        samples = _sample_segment(start, end, length)
        precise_length += (
            length
            * sum(_near_segments(sample, target_segments, corridor_radius) for sample in samples)
            / len(samples)
        )
    precision = min(1.0, precise_length / valid_trace_length)
    engagement = max(
        0.0, min(1.0, valid_trace_length / (target_length * ENGAGEMENT_TARGET_FRACTION))
    )
    score = round(100 * coverage * precision * engagement)
    return TraceScore(
        score,
        coverage,
        precision,
        engagement,
        completed,
        valid_trace_length,
        target_length,
    )


def score_trace(
    events: Sequence[TraceEvent | Mapping[str, object]],
    target: Sequence[Sequence[Point]] | GlyphGeometry,
    mode: ContactMode | str = ContactMode.STRICT_CONTINUOUS,
    pause_grace_ms: int = DEFAULT_PAUSE_GRACE_MS,
    corridor_radius: float = DEFAULT_CORRIDOR_RADIUS,
    *,
    grace_ms: int | None = None,
) -> TraceScore:
    """Score completed segments using frozen scoring version 1 constants."""

    if not math.isfinite(corridor_radius) or corridor_radius <= 0:
        raise ValueError("corridor_radius must be a positive finite number")
    replay = replay_trace(events, mode, pause_grace_ms, grace_ms=grace_ms)
    user_polylines = tuple(
        stroke
        for segment in replay.segments
        if segment.completed
        for stroke in segment.valid_strokes
    )
    return _score_components(target, user_polylines, replay.completed, corridor_radius)


@dataclass(frozen=True, slots=True)
class RunScore:
    score: int
    glyphs: tuple[TraceScore, ...]
    coverage: float
    precision: float
    engagement: float
    completed: bool


def score_run(
    events: Sequence[TraceEvent | Mapping[str, object]],
    targets: Sequence[Sequence[Sequence[Point]] | GlyphGeometry],
    mode: ContactMode | str = ContactMode.STRICT_CONTINUOUS,
    pause_grace_ms: int = DEFAULT_PAUSE_GRACE_MS,
    corridor_radius: float = DEFAULT_CORRIDOR_RADIUS,
) -> RunScore:
    """Score an ordered full-glyph run and retain a result for every glyph."""

    replay = replay_trace(events, mode, pause_grace_ms)
    glyph_scores: list[TraceScore] = []
    for glyph_index, target in enumerate(targets):
        points = tuple(
            stroke
            for segment in replay.segments
            if segment.completed and segment.glyph_index == glyph_index
            for stroke in segment.valid_strokes
        )
        glyph_scores.append(_score_components(target, points, bool(points), corridor_radius))
    if not glyph_scores:
        return RunScore(0, (), 0.0, 0.0, 0.0, False)
    coverage = sum(item.coverage for item in glyph_scores) / len(glyph_scores)
    precision = sum(item.precision for item in glyph_scores) / len(glyph_scores)
    engagement = sum(item.engagement for item in glyph_scores) / len(glyph_scores)
    completed = replay.completed and all(item.completed for item in glyph_scores)
    return RunScore(
        round(100 * coverage * precision * engagement),
        tuple(glyph_scores),
        coverage,
        precision,
        engagement,
        completed,
    )


def _segment_evidence(replay: TraceReplay, glyph_index: int) -> list[TraceSegmentEvidence]:
    return [
        TraceSegmentEvidence(
            segment_index=segment.segment_index,
            glyph_index=segment.glyph_index,
            pointer_id=segment.pointer_id,
            status=segment.status,
            started_at_ms=segment.started_at_ms,
            ended_at_ms=segment.ended_at_ms,
            event_seqs=list(segment.event_seqs),
            points=list(segment.points),
            in_bounds=list(segment.point_in_bounds),
        )
        for segment in replay.segments
        if segment.glyph_index == glyph_index
    ]


def make_trace_evidence(
    events: Sequence[TraceEvent | Mapping[str, object]],
    artifact_version: str,
    artifact_sha256: str,
    score: TraceScore | None = None,
    *,
    glyph_set_id: int | None = None,
    graphemes: Sequence[str] | None = None,
    glyph_scores: Sequence[TraceScore] | None = None,
    mode: ContactMode | str = ContactMode.STRICT_CONTINUOUS,
    pause_grace_ms: int = DEFAULT_PAUSE_GRACE_MS,
) -> TraceEvidence:
    """Build complete evidence without smoothing or rendered-image substitution."""

    replay = replay_trace(events, mode, pause_grace_ms)
    parsed = list(replay.events)
    names = list(graphemes or ())
    scores = list(glyph_scores or ((score,) if score is not None else ()))
    event_glyph_count = max((event.glyph_index for event in parsed), default=-1) + 1
    glyph_count = max(1, event_glyph_count, len(names), len(scores))
    glyphs: list[GlyphTraceEvidence] = []
    for glyph_index in range(glyph_count):
        item = scores[glyph_index] if glyph_index < len(scores) else TraceScore(0, 0, 0, 0, False)
        segments = _segment_evidence(replay, glyph_index)
        if item.completed:
            status = GlyphTraceStatus.COMPLETED
        elif any(segment.status is SegmentStatus.CANCELLED for segment in segments):
            status = GlyphTraceStatus.ABANDONED
        elif segments:
            status = GlyphTraceStatus.INVALID
        else:
            status = GlyphTraceStatus.PENDING
        glyphs.append(
            GlyphTraceEvidence(
                glyph_index=glyph_index,
                grapheme=names[glyph_index] if glyph_index < len(names) else "?",
                status=status,
                segments=segments,
                score=item.score,
                coverage=item.coverage,
                precision=item.precision,
                engagement=item.engagement,
            )
        )
    return TraceEvidence(
        glyph_set_id=glyph_set_id,
        glyph_set_version=artifact_version,
        glyph_set_sha256=artifact_sha256,
        artifact_version=artifact_version,
        artifact_sha256=artifact_sha256,
        pause_grace_ms=pause_grace_ms,
        events=parsed,
        glyphs=glyphs,
        status=RunTraceStatus.COMPLETED if replay.completed else RunTraceStatus.ABANDONED,
        score=score,
    )


def evidence_sha256(evidence: TraceEvidence | Mapping[str, object]) -> str:
    payload: object = (
        evidence.model_dump(mode="json") if isinstance(evidence, TraceEvidence) else evidence
    )
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


replay_events = replay_trace
score = score_trace
