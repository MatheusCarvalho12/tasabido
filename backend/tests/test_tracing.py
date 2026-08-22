from __future__ import annotations

import pytest

from app.glyphs import canonical_glyph_set
from app.tracing import (
    DEFAULT_PAUSE_GRACE_MS,
    ENGAGEMENT_TARGET_FRACTION,
    MAX_PAUSE_GRACE_MS,
    ContactMode,
    RunTraceStatus,
    SegmentStatus,
    TraceEvidence,
    TraceValidationError,
    make_trace_evidence,
    replay_trace,
    score_run,
    score_trace,
    validate_trace_events,
)


def test_pause_grace_contract_uses_frozen_default_and_bounds() -> None:
    assert DEFAULT_PAUSE_GRACE_MS == 1500
    assert MAX_PAUSE_GRACE_MS == 3000
    replay_trace([], pause_grace_ms=MAX_PAUSE_GRACE_MS)
    with pytest.raises(ValueError, match="3000"):
        replay_trace([], pause_grace_ms=MAX_PAUSE_GRACE_MS + 1)


def _events_for_strokes(
    strokes: tuple[tuple[tuple[float, float], ...], ...],
    glyph_index: int = 0,
) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    seq = 0
    timestamp = 0
    for segment_index, stroke in enumerate(strokes):
        events.append(
            {
                "seq": seq,
                "type": "down",
                "pointer_id": 1,
                "x_norm": stroke[0][0],
                "y_norm": stroke[0][1],
                "t_ms": timestamp,
                "in_bounds": True,
                "glyph_index": glyph_index,
                "segment_index": segment_index,
            }
        )
        seq += 1
        for x, y in stroke[1:-1]:
            timestamp += 10
            events.append(
                {
                    "seq": seq,
                    "type": "move",
                    "pointer_id": 1,
                    "x_norm": x,
                    "y_norm": y,
                    "t_ms": timestamp,
                    "in_bounds": True,
                    "glyph_index": glyph_index,
                    "segment_index": segment_index,
                }
            )
            seq += 1
        timestamp += 10
        events.append(
            {
                "seq": seq,
                "type": "up",
                "pointer_id": 1,
                "x_norm": stroke[-1][0],
                "y_norm": stroke[-1][1],
                "t_ms": timestamp,
                "in_bounds": True,
                "glyph_index": glyph_index,
                "segment_index": segment_index,
            }
        )
        seq += 1
        timestamp += 20
    return events


def test_release_is_the_only_completion_event() -> None:
    target = canonical_glyph_set().geometry["V"]
    events = [
        {"seq": 0, "type": "down", "x_norm": 0.08, "y_norm": 0.0, "t_ms": 0},
        {"seq": 1, "type": "move", "x_norm": 0.5, "y_norm": 1.0, "t_ms": 10},
    ]
    replay = replay_trace(events)
    assert not replay.completed
    assert replay.segments[0].status is SegmentStatus.OPEN
    assert score_trace(events, target).score == 0


def test_blank_and_short_dot_are_zero_or_low() -> None:
    target = canonical_glyph_set().geometry["V"]
    events = [
        {"seq": 0, "type": "down", "x_norm": 0.08, "y_norm": 0.0, "t_ms": 0},
        {"seq": 1, "type": "up", "x_norm": 0.08, "y_norm": 0.0, "t_ms": 10},
    ]
    assert score_trace([], target).score == 0
    assert score_trace(events, target).score <= 1


def test_accurate_trace_is_high_and_formula_is_exact() -> None:
    target = canonical_glyph_set().geometry["V"]
    result = score_trace(_events_for_strokes(target), target)
    assert result.score >= 95
    assert result.engagement == 1
    assert result.score == round(100 * result.coverage * result.precision * result.engagement)


def test_frozen_engagement_fraction_is_point_twenty_five() -> None:
    target = (((0.0, 0.0), (1.0, 0.0)),)
    events = [
        {"seq": 0, "type": "down", "x_norm": 0.0, "y_norm": 0.0, "t_ms": 0},
        {"seq": 1, "type": "move", "x_norm": 0.2, "y_norm": 0.0, "t_ms": 10},
        {"seq": 2, "type": "up", "x_norm": 0.2, "y_norm": 0.0, "t_ms": 20},
    ]
    result = score_trace(events, target)
    assert ENGAGEMENT_TARGET_FRACTION == 0.25
    assert result.engagement == pytest.approx(0.8)
    assert result.score == round(100 * result.coverage * result.precision * result.engagement)


def test_scribble_all_and_outside_marks_lower_precision() -> None:
    target = canonical_glyph_set().geometry["V"]
    scribble = [
        {"seq": 0, "type": "down", "x_norm": -1.0, "y_norm": -1.0, "t_ms": 0, "in_bounds": False},
        {"seq": 1, "type": "move", "x_norm": 2.0, "y_norm": -1.0, "t_ms": 10, "in_bounds": False},
        {"seq": 2, "type": "move", "x_norm": 2.0, "y_norm": 2.0, "t_ms": 20, "in_bounds": False},
        {"seq": 3, "type": "move", "x_norm": -1.0, "y_norm": 2.0, "t_ms": 30, "in_bounds": False},
        {"seq": 4, "type": "up", "x_norm": -1.0, "y_norm": -1.0, "t_ms": 40, "in_bounds": False},
    ]
    accurate = score_trace(_events_for_strokes(target), target)
    noisy = score_trace(scribble, target)
    assert noisy.score < accurate.score
    assert noisy.precision < accurate.precision


def test_outside_points_do_not_count_as_valid_engagement_even_on_target() -> None:
    target = (((0.0, 0.0), (1.0, 0.0)),)
    events = [
        {
            "seq": 0,
            "type": "down",
            "x_norm": 0.0,
            "y_norm": 0.0,
            "t_ms": 0,
            "in_bounds": False,
        },
        {
            "seq": 1,
            "type": "move",
            "x_norm": 1.0,
            "y_norm": 0.0,
            "t_ms": 10,
            "in_bounds": False,
        },
        {
            "seq": 2,
            "type": "up",
            "x_norm": 1.0,
            "y_norm": 0.0,
            "t_ms": 20,
            "in_bounds": False,
        },
    ]
    result = score_trace(events, target)
    assert result.valid_trace_length == 0
    assert result.engagement == 0
    assert result.score == 0


def test_invalid_release_does_not_poison_later_down_and_reset_segments_are_preserved() -> None:
    events = [
        {"seq": 0, "type": "down", "pointer_id": 1, "x_norm": 0.0, "y_norm": 0.0, "t_ms": 0},
        {"seq": 1, "type": "up", "pointer_id": 2, "x_norm": 0.0, "y_norm": 0.0, "t_ms": 10},
        {
            "seq": 2,
            "type": "down",
            "pointer_id": 1,
            "x_norm": 0.0,
            "y_norm": 0.0,
            "t_ms": 20,
            "segment_index": 1,
        },
        {"seq": 3, "type": "reset", "pointer_id": 1, "t_ms": 30, "segment_index": 2},
        {
            "seq": 4,
            "type": "down",
            "pointer_id": 1,
            "x_norm": 0.0,
            "y_norm": 0.0,
            "t_ms": 40,
            "segment_index": 3,
        },
        {
            "seq": 5,
            "type": "up",
            "pointer_id": 1,
            "x_norm": 1.0,
            "y_norm": 0.0,
            "t_ms": 50,
            "segment_index": 3,
        },
    ]
    replay = replay_trace(events)
    assert replay.completed
    assert replay.errors
    assert [segment.status for segment in replay.segments] == [
        SegmentStatus.RESET,
        SegmentStatus.RESET,
        SegmentStatus.COMPLETED,
    ]
    assert replay.segments[1].event_seqs == (2, 3)
    assert [event.seq for event in replay.events] == list(range(6))


def test_timed_pause_grace_expire_creates_a_new_segment() -> None:
    events = [
        {"seq": 0, "type": "down", "pointer_id": 1, "x_norm": 0.0, "y_norm": 0.0, "t_ms": 0},
        {"seq": 1, "type": "up", "pointer_id": 1, "x_norm": 0.5, "y_norm": 0.5, "t_ms": 10},
        {"seq": 2, "type": "grace_expire", "pointer_id": 1, "t_ms": 300},
        {
            "seq": 3,
            "type": "down",
            "pointer_id": 1,
            "x_norm": 0.5,
            "y_norm": 0.5,
            "t_ms": 310,
            "segment_index": 1,
        },
        {
            "seq": 4,
            "type": "up",
            "pointer_id": 1,
            "x_norm": 1.0,
            "y_norm": 1.0,
            "t_ms": 320,
            "segment_index": 1,
        },
    ]
    replay = replay_trace(events, ContactMode.TIMED_PAUSE, pause_grace_ms=DEFAULT_PAUSE_GRACE_MS)
    assert replay.completed
    assert [segment.status for segment in replay.segments] == [
        SegmentStatus.COMPLETED,
        SegmentStatus.COMPLETED,
    ]


def test_cancel_never_completes_and_preserves_segment_evidence() -> None:
    events = [
        {"seq": 0, "type": "down", "pointer_id": 1, "x_norm": 0.0, "y_norm": 0.0, "t_ms": 0},
        {"seq": 1, "type": "move", "pointer_id": 1, "x_norm": 0.5, "y_norm": 0.5, "t_ms": 10},
        {"seq": 2, "type": "cancel", "pointer_id": 1, "t_ms": 20},
    ]
    replay = replay_trace(events)
    assert not replay.completed
    assert replay.cancelled
    assert replay.segments[0].status is SegmentStatus.CANCELLED


def test_event_contract_has_explicit_pointer_coordinates_bounds_glyph_and_segment() -> None:
    replay = replay_trace(
        [
            {
                "seq": 7,
                "type": "down",
                "pointer_id": 3,
                "x_norm": 0.2,
                "y_norm": 0.3,
                "t_ms": 40,
                "in_bounds": True,
                "glyph_index": 2,
                "segment_index": 4,
            }
        ]
    )
    event = replay.events[0]
    assert event.seq == 7
    assert event.pointer_id == 3
    assert event.x_norm == 0.2 and event.y_norm == 0.3
    assert event.t_ms == 40 and event.in_bounds
    assert event.glyph_index == 2 and event.segment_index == 4


def test_monotonic_sequence_and_timestamps_are_validated() -> None:
    with pytest.raises(TraceValidationError, match="seq"):
        replay_trace(
            [
                {"seq": 1, "type": "down", "x_norm": 0.0, "y_norm": 0.0, "t_ms": 1},
                {"seq": 1, "type": "up", "x_norm": 0.0, "y_norm": 0.0, "t_ms": 2},
            ]
        )
    with pytest.raises(TraceValidationError, match="timestamps"):
        replay_trace(
            [
                {"seq": 0, "type": "down", "x_norm": 0.0, "y_norm": 0.0, "t_ms": 2},
                {"seq": 1, "type": "up", "x_norm": 0.0, "y_norm": 0.0, "t_ms": 1},
            ]
        )


def test_validate_entry_point_rejects_state_errors_but_replay_keeps_evidence() -> None:
    events = [{"seq": 0, "type": "move", "x_norm": 0.0, "y_norm": 0.0, "t_ms": 0}]
    with pytest.raises(TraceValidationError, match="move requires"):
        validate_trace_events(events)
    assert len(replay_trace(events).errors) == 1


def test_full_run_score_and_evidence_cover_ordered_glyphs_and_segments() -> None:
    glyph_set = canonical_glyph_set()
    first = _events_for_strokes(glyph_set.geometry["V"], glyph_index=0)
    second = _events_for_strokes(glyph_set.geometry["I"], glyph_index=1)
    offset = len(first)
    for event in second:
        event["seq"] = int(event["seq"]) + offset
        event["t_ms"] = int(event["t_ms"]) + 100
    events = first + second
    result = score_run(events, [glyph_set.geometry["V"], glyph_set.geometry["I"]])
    evidence = make_trace_evidence(
        events,
        glyph_set.version,
        glyph_set.artifact_sha256,
        result.glyphs[0],
        glyph_set_id=1,
        graphemes=["V", "I"],
        glyph_scores=result.glyphs,
    )
    assert result.completed
    assert evidence.status is RunTraceStatus.COMPLETED
    assert [glyph.grapheme for glyph in evidence.glyphs] == ["V", "I"]
    assert evidence.glyphs[0].segments[0].event_seqs
    assert [event.seq for event in evidence.events] == list(range(len(events)))


def test_full_run_is_not_complete_when_an_ordered_glyph_is_missing() -> None:
    glyph_set = canonical_glyph_set()
    events = _events_for_strokes(glyph_set.geometry["I"], glyph_index=1)
    result = score_run(events, [glyph_set.geometry["V"], glyph_set.geometry["I"]])
    assert not result.completed
    assert result.glyphs[0].score == 0
    assert result.glyphs[1].score > 0


def test_evidence_keeps_event_order_and_exact_artifact_identity() -> None:
    artifact = canonical_glyph_set()
    events = [
        {"seq": 0, "type": "down", "x_norm": 0.1, "y_norm": 0.2, "t_ms": 0},
        {"seq": 1, "type": "cancel", "t_ms": 4},
    ]
    evidence = make_trace_evidence(events, artifact.version, artifact.artifact_sha256)
    assert isinstance(evidence, TraceEvidence)
    assert [event.type.value for event in evidence.events] == ["down", "cancel"]
    assert evidence.artifact_version == artifact.version
    assert evidence.artifact_sha256 == artifact.artifact_sha256
    assert evidence.pause_grace_ms == DEFAULT_PAUSE_GRACE_MS
