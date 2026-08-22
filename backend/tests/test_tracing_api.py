from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any, cast
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.database import SessionLocal
from app.glyphs import CANONICAL_GLYPH_ARTIFACT_PATH, canonical_glyph_set
from app.models import Game, GameAssignment, GameDefaults, GameRun, GlyphSet, RetentionAudit
from app.retention import purge_expired


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register_family(
    client: TestClient,
    email: str,
    child_name: str = "Bia",
    cpf: str = "52998224725",
    child_cpf: str = "11144477735",
) -> dict[str, Any]:
    response = client.post(
        "/auth/register",
        json={
            "name": "Ana Souza",
            "email": email,
            "password": "senha-segura-123",
            "role": "family",
            "family_role": "mamae",
            "cpf": cpf,
            "lgpd_consent": True,
            "children": [{"name": child_name, "cpf": child_cpf}],
        },
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _cpf_for_professional(email: str) -> str:
    """Derive a stable, valid CPF for a test professional without shared state."""
    base = [digit % 10 for digit in sha256(email.encode("utf-8")).digest()[:9]]
    if len(set(base)) == 1:
        base[-1] = (base[-1] + 1) % 10

    first_sum = sum(digit * (10 - index) for index, digit in enumerate(base))
    first_check = (first_sum * 10) % 11
    if first_check == 10:
        first_check = 0

    second_base = [*base, first_check]
    second_sum = sum(digit * (11 - index) for index, digit in enumerate(second_base))
    second_check = (second_sum * 10) % 11
    if second_check == 10:
        second_check = 0
    return "".join(str(digit) for digit in [*base, first_check, second_check])


def _register_professional(
    client: TestClient, email: str, cpf: str | None = None
) -> dict[str, Any]:
    response = client.post(
        "/auth/register",
        json={
            "name": "Profissional Silva",
            "email": email,
            "password": "senha-segura-123",
            "role": "professional",
            "profession": "psicologo",
            "council_type": "crp",
            "council_number": "12345",
            "council_region": "06",
            "cpf": cpf or _cpf_for_professional(email),
            "lgpd_consent": True,
        },
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _child_id(email: str) -> str:
    from app.models import User

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None and user.children
        return str(user.children[0].id)


def _set_game_owner(game_id: int, email: str) -> None:
    from app.models import User

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        game = db.get(Game, game_id)
        assert user is not None and game is not None
        game.criado_por = user.id
        db.commit()


@dataclass(frozen=True)
class TracingFixture:
    game_id: int
    glyph_set_id: int


@pytest.fixture()
def tracing_fixture() -> TracingFixture:
    """Restore the tracing game contract without relying on seed row IDs."""
    artifact = canonical_glyph_set()
    geometry = {
        grapheme: [[list(point) for point in stroke] for stroke in glyph_geometry]
        for grapheme, glyph_geometry in artifact.geometry.items()
    }
    with SessionLocal() as db:
        glyph_set = db.scalar(select(GlyphSet).where(GlyphSet.version == artifact.version))
        if glyph_set is None:
            glyph_set = GlyphSet(
                version=artifact.version,
                artifact_path=CANONICAL_GLYPH_ARTIFACT_PATH,
                artifact_sha256=artifact.artifact_sha256,
                geometry=geometry,
                immutable=True,
                status="active",
            )
            db.add(glyph_set)
            db.flush()
        else:
            glyph_set.artifact_path = CANONICAL_GLYPH_ARTIFACT_PATH
            glyph_set.artifact_sha256 = artifact.artifact_sha256
            glyph_set.geometry = geometry
            glyph_set.immutable = True
            glyph_set.status = "active"

        game = db.scalar(select(Game).where(Game.slug == "escreva-seu-nome"))
        if game is None:
            game = Game(
                slug="escreva-seu-nome",
                titulo="Escreva seu nome",
                descricao="Atividade de escrita do nome.",
                tutorial="Escreva seu nome passando o dedo sobre as letras pontilhadas.",
                categoria="escrita",
                visibilidade="public",
                status="published",
                cores=["#08ADAE", "#F75A3D"],
            )
            db.add(game)
            db.flush()
        else:
            game.titulo = "Escreva seu nome"
            game.descricao = "Atividade de escrita do nome."
            game.tutorial = "Escreva seu nome passando o dedo sobre as letras pontilhadas."
            game.categoria = "escrita"
            game.visibilidade = "public"
            game.status = "published"
            game.cores = ["#08ADAE", "#F75A3D"]

        defaults = db.get(GameDefaults, game.id)
        if defaults is None:
            defaults = GameDefaults(
                game_id=game.id,
                glyph_set_id=glyph_set.id,
                glyph_set_version=artifact.version,
                glyph_set_sha256=artifact.artifact_sha256,
            )
            db.add(defaults)
        else:
            defaults.glyph_set_id = glyph_set.id
            defaults.glyph_set_version = artifact.version
            defaults.glyph_set_sha256 = artifact.artifact_sha256
            defaults.threshold = 70
            defaults.contact_mode = "timed_pause"
            defaults.pause_grace_ms = 1500
            defaults.scoring_version = 1
            defaults.schema_version = 1
        db.commit()
        return TracingFixture(game_id=game.id, glyph_set_id=glyph_set.id)


def _trace_events(sequence: list[str]) -> list[dict[str, Any]]:
    artifact = canonical_glyph_set()
    events: list[dict[str, Any]] = []
    seq = 0
    t_ms = 0
    segment = 0
    for glyph_index, grapheme in enumerate(sequence):
        for stroke in artifact.geometry[grapheme]:
            events.append(
                {
                    "seq": seq,
                    "type": "down",
                    "pointer_id": 1,
                    "x_norm": stroke[0][0],
                    "y_norm": stroke[0][1],
                    "t_ms": t_ms,
                    "in_bounds": True,
                    "glyph_index": glyph_index,
                    "segment_index": segment,
                }
            )
            seq += 1
            for x_norm, y_norm in stroke[1:-1]:
                t_ms += 10
                events.append(
                    {
                        "seq": seq,
                        "type": "move",
                        "pointer_id": 1,
                        "x_norm": x_norm,
                        "y_norm": y_norm,
                        "t_ms": t_ms,
                        "in_bounds": True,
                        "glyph_index": glyph_index,
                        "segment_index": segment,
                    }
                )
                seq += 1
            t_ms += 10
            events.append(
                {
                    "seq": seq,
                    "type": "up",
                    "pointer_id": 1,
                    "x_norm": stroke[-1][0],
                    "y_norm": stroke[-1][1],
                    "t_ms": t_ms,
                    "in_bounds": True,
                    "glyph_index": glyph_index,
                    "segment_index": segment,
                }
            )
            seq += 1
            segment += 1
            t_ms += 10
    return events


def _low_score_events(sequence: list[str]) -> list[dict[str, Any]]:
    artifact = canonical_glyph_set()
    events: list[dict[str, Any]] = []
    for glyph_index, grapheme in enumerate(sequence):
        point = artifact.geometry[grapheme][0][0]
        events.extend(
            [
                {
                    "seq": len(events),
                    "type": "down",
                    "pointer_id": 1,
                    "x_norm": point[0],
                    "y_norm": point[1],
                    "t_ms": len(events) * 10,
                    "in_bounds": True,
                    "glyph_index": glyph_index,
                    "segment_index": glyph_index,
                },
                {
                    "seq": len(events) + 1,
                    "type": "up",
                    "pointer_id": 1,
                    "x_norm": point[0],
                    "y_norm": point[1],
                    "t_ms": len(events) * 10 + 1,
                    "in_bounds": True,
                    "glyph_index": glyph_index,
                    "segment_index": glyph_index,
                },
            ]
        )
    return events


def _evidence(started: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    artifact = canonical_glyph_set()
    return {
        "schema_version": started["schema_version"],
        "scoring_version": started["scoring_version"],
        "pause_grace_ms": started["pause_grace_ms"],
        "glyph_set_id": started["glyph_set_id"],
        "glyph_set_version": artifact.version,
        "glyph_set_sha256": artifact.artifact_sha256,
        "artifact_version": artifact.version,
        "artifact_sha256": artifact.artifact_sha256,
        "events": events,
        "glyphs": [],
        "status": "started",
        "score": None,
    }


def test_guardian_can_start_and_finalize_authoritatively(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "trace-family@example.com")
    child_id = _child_id("trace-family@example.com")
    started_response = client.post(
        "/api/tracing-runs/start",
        json={"child_id": child_id},
        headers=_auth(family["access_token"]),
    )
    assert started_response.status_code == 201
    started = started_response.json()
    assert started["glyph_sequence"] == ["B", "I", "A"]
    assert started["status"] == "started"
    assert started["contact_mode"] == "timed_pause"
    assert started["pause_grace_ms"] == 1500
    assert started["glyph_set"]["id"] == started["glyph_set_id"]
    assert started["glyph_set"]["version"] == started["glyph_set_version"]
    assert started["glyph_set"]["artifact_sha256"] == started["glyph_set_sha256"]
    assert started["glyph_set"]["geometry"]["B"]
    events = _trace_events(started["glyph_sequence"])
    evidence = _evidence(started, events)
    evidence["score"] = {
        "score": 1,
        "coverage": 0.01,
        "precision": 0.02,
        "engagement": 0.03,
        "completed": True,
        "valid_trace_length": 0.01,
        "target_length": 1.0,
        "schema_version": started["schema_version"],
        "scoring_version": started["scoring_version"],
    }
    finalized = client.post(
        f"/api/tracing-runs/{started['id']}/finalize",
        json={"idempotency_key": "trace-finalize-1", "evidence": evidence},
        headers=_auth(family["access_token"]),
    )
    assert finalized.status_code == 200
    body = finalized.json()
    assert body["status"] == "completed"
    assert body["score"] >= 95
    assert body["score"] != evidence["score"]["score"]
    assert len(body["glyphs"]) == 3

    detail = client.get(f"/api/tracing-runs/{started['id']}", headers=_auth(family["access_token"]))
    assert detail.status_code == 200
    assert detail.json()["glyph_set"] == started["glyph_set"]

    replay = client.get(
        f"/api/tracing-runs/{started['id']}/replay", headers=_auth(family["access_token"])
    )
    assert replay.status_code == 200
    assert [event["seq"] for event in replay.json()["evidence"]["events"]] == list(
        range(len(events))
    )
    assert replay.json()["glyph_set"] == started["glyph_set"]


def test_finalize_is_idempotent_and_rejects_a_different_key(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "idempotent-family@example.com")
    child_id = _child_id("idempotent-family@example.com")
    started = client.post(
        "/api/tracing-runs/start",
        json={"child_id": child_id},
        headers=_auth(family["access_token"]),
    ).json()
    evidence = _evidence(started, _trace_events(started["glyph_sequence"]))
    url = f"/api/tracing-runs/{started['id']}/finalize"
    first = client.post(
        url,
        json={"idempotency_key": "same-key", "evidence": evidence},
        headers=_auth(family["access_token"]),
    )
    second = client.post(
        url,
        json={"idempotency_key": "same-key", "evidence": evidence},
        headers=_auth(family["access_token"]),
    )
    different = client.post(
        url,
        json={"idempotency_key": "different-key", "evidence": evidence},
        headers=_auth(family["access_token"]),
    )
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert different.status_code == 409


def test_active_catalog_is_authenticated_immutable_and_has_no_export_route(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    assert client.get("/api/tracing-runs/glyph-sets").status_code == 401
    family = _register_family(client, "catalog-family@example.com")
    catalog = client.get("/api/tracing-runs/glyph-sets", headers=_auth(family["access_token"]))
    assert catalog.status_code == 200
    items = catalog.json()["items"]
    selected = next(item for item in items if item["id"] == tracing_fixture.glyph_set_id)
    assert selected["immutable"] is True
    assert selected["version"] == "uppercase-block-v1"
    assert selected["artifact_sha256"] == selected["sha256"]
    assert selected["style"] == "uppercase-block"
    assert selected["geometry"]["Á"]
    assert all(
        0 <= point <= 1
        for glyph in selected["geometry"].values()
        for stroke in glyph
        for point_pair in stroke
        for point in point_pair
    )
    paths = client.get("/openapi.json").json()["paths"]
    assert not any("export" in path for path in paths)


def test_game_config_is_owner_only_and_updates_glyph_identity_atomically(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    owner = _register_professional(client, "config-owner@example.com", "39053344705")
    _set_game_owner(tracing_fixture.game_id, "config-owner@example.com")
    read = client.get(
        f"/api/tracing-runs/config/{tracing_fixture.game_id}",
        headers=_auth(owner["access_token"]),
    )
    assert read.status_code == 200
    assert read.json()["contact_mode"] == "timed_pause"
    assert read.json()["pause_grace_ms"] == 1500
    updated = client.patch(
        f"/api/tracing-runs/config/{tracing_fixture.game_id}",
        json={
            "glyph_set_id": tracing_fixture.glyph_set_id,
            "threshold": 82,
            "contact_mode": "free",
            "pause_grace_ms": 0,
        },
        headers=_auth(owner["access_token"]),
    )
    assert updated.status_code == 200
    assert updated.json()["threshold"] == 82
    assert updated.json()["contact_mode"] == "free"
    assert updated.json()["pause_grace_ms"] == 0
    assert updated.json()["glyph_set_version"] == "uppercase-block-v1"
    assert updated.json()["glyph_set_sha256"] == canonical_glyph_set().artifact_sha256

    outsider = _register_professional(client, "config-outsider@example.com", "53196679144")
    family = _register_family(client, "config-family@example.com")
    assert (
        client.get(
            f"/api/tracing-runs/config/{tracing_fixture.game_id}",
            headers=_auth(outsider["access_token"]),
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/tracing-runs/config/{tracing_fixture.game_id}",
            headers=_auth(family["access_token"]),
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/tracing-runs/config/{tracing_fixture.game_id}",
            json={"threshold": 101},
            headers=_auth(owner["access_token"]),
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/api/tracing-runs/config/{tracing_fixture.game_id}",
            json={"pause_grace_ms": 3001},
            headers=_auth(owner["access_token"]),
        ).status_code
        == 422
    )


def test_assignment_override_is_owner_only_field_level_and_nullable(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "assignment-config-family@example.com")
    child_id = _child_id("assignment-config-family@example.com")
    owner = _register_professional(client, "assignment-config-owner@example.com", "39053344705")
    assignment = client.post(
        "/api/assignments",
        json={"game_id": tracing_fixture.game_id, "child_id": child_id},
        headers=_auth(owner["access_token"]),
    ).json()
    assignment_id = assignment["assignment_id"]
    path = f"/api/tracing-runs/assignments/{assignment_id}"
    updated = client.patch(
        path,
        json={
            "glyph_set_id_override": tracing_fixture.glyph_set_id,
            "threshold_override": 83,
            "contact_mode_override": "free",
            "pause_grace_ms_override": 0,
        },
        headers=_auth(owner["access_token"]),
    )
    assert updated.status_code == 200
    assert updated.json()["threshold_override"] == 83
    assert updated.json()["contact_mode_override"] == "free"
    cleared = client.patch(
        path,
        json={"threshold_override": None, "contact_mode_override": None},
        headers=_auth(owner["access_token"]),
    )
    assert cleared.status_code == 200
    assert cleared.json()["threshold_override"] is None
    assert cleared.json()["contact_mode_override"] is None
    outsider = _register_professional(
        client, "assignment-config-outsider@example.com", "53196679144"
    )
    assert client.get(path, headers=_auth(outsider["access_token"])).status_code == 404
    assert (
        client.patch(
            path,
            json={"pause_grace_ms_override": 3001},
            headers=_auth(owner["access_token"]),
        ).status_code
        == 422
    )
    assert client.get(path, headers=_auth(family["access_token"])).status_code == 404


def test_professional_linked_children_are_derived_from_owned_assignments(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "linked-family@example.com")
    child_id = _child_id("linked-family@example.com")
    owner = _register_professional(client, "linked-owner@example.com", "39053344705")
    assignment = client.post(
        "/api/assignments",
        json={"game_id": tracing_fixture.game_id, "child_id": child_id},
        headers=_auth(owner["access_token"]),
    ).json()
    linked = client.get("/api/tracing-runs/children", headers=_auth(owner["access_token"]))
    assert linked.status_code == 200
    assert linked.json()["items"] == [
        {
            "child_id": child_id,
            "name": "Bia",
            "assignments": [
                {"assignment_id": assignment["assignment_id"], "game_id": tracing_fixture.game_id}
            ],
        }
    ]
    outsider = _register_professional(client, "linked-outsider@example.com", "53196679144")
    assert client.get(
        "/api/tracing-runs/children", headers=_auth(outsider["access_token"])
    ).json() == {"items": []}
    assert (
        client.get("/api/tracing-runs/children", headers=_auth(family["access_token"])).status_code
        == 403
    )


def test_tracing_run_list_is_bounded_recent_and_authorized_by_relationship(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "list-family@example.com")
    child_id = _child_id("list-family@example.com")
    owner = _register_professional(client, "list-owner@example.com", "39053344705")
    client.post(
        "/api/assignments",
        json={"game_id": tracing_fixture.game_id, "child_id": child_id},
        headers=_auth(owner["access_token"]),
    )
    started_ids = [
        client.post(
            "/api/tracing-runs/start",
            json={"child_id": child_id},
            headers=_auth(family["access_token"]),
        ).json()["id"]
        for _ in range(2)
    ]
    page = client.get("/api/tracing-runs?limit=1&offset=0", headers=_auth(family["access_token"]))
    assert page.status_code == 200
    assert len(page.json()["items"]) == 1
    assert page.json()["has_more"] is True
    assert page.json()["items"][0]["id"] in started_ids
    assert page.json()["items"][0]["evidence"] is None
    professional_page = client.get("/api/tracing-runs", headers=_auth(owner["access_token"]))
    assert professional_page.status_code == 200
    assert {item["id"] for item in professional_page.json()["items"]} == set(started_ids)
    outsider = _register_professional(client, "list-outsider@example.com", "53196679144")
    assert client.get("/api/tracing-runs", headers=_auth(outsider["access_token"])).json() == {
        "items": [],
        "limit": 50,
        "offset": 0,
        "has_more": False,
    }


def test_professional_requires_owned_assignment_for_start_and_review(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    _register_family(client, "assigned-family@example.com")
    child_id = _child_id("assigned-family@example.com")
    professional = _register_professional(client, "assigned-prof@example.com")
    start_url = "/api/tracing-runs/start"
    denied = client.post(
        start_url,
        json={"child_id": child_id},
        headers=_auth(professional["access_token"]),
    )
    assert denied.status_code == 404
    assignment = client.post(
        "/api/assignments",
        json={"game_id": tracing_fixture.game_id, "child_id": child_id},
        headers=_auth(professional["access_token"]),
    )
    assert assignment.status_code == 201
    allowed = client.post(
        start_url,
        json={"child_id": child_id, "assignment_id": assignment.json()["assignment_id"]},
        headers=_auth(professional["access_token"]),
    )
    assert allowed.status_code == 201


def test_start_uses_field_level_assignment_overrides_and_missing_glyph_is_deterministic(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "override-family@example.com")
    child_id = _child_id("override-family@example.com")
    professional = _register_professional(client, "override-prof@example.com")
    assignment = client.post(
        "/api/assignments",
        json={"game_id": tracing_fixture.game_id, "child_id": child_id},
        headers=_auth(professional["access_token"]),
    )
    assert assignment.status_code == 201
    assignment_id = assignment.json()["assignment_id"]
    with SessionLocal() as db:
        row = db.get(GameAssignment, assignment_id)
        assert row is not None
        row.threshold_override = 88
        row.pause_grace_ms_override = 3000
        db.commit()
    defaults_started = client.post(
        "/api/tracing-runs/start",
        json={"child_id": child_id},
        headers=_auth(family["access_token"]),
    )
    assert defaults_started.status_code == 201
    assert defaults_started.json()["threshold"] == 70
    assert defaults_started.json()["contact_mode"] == "timed_pause"
    assert defaults_started.json()["pause_grace_ms"] == 1500
    assert defaults_started.json()["effective_config"]["assignment_id"] is None

    assigned_started = client.post(
        "/api/tracing-runs/start",
        json={"child_id": child_id, "assignment_id": assignment_id},
        headers=_auth(family["access_token"]),
    )
    assert assigned_started.status_code == 201
    assert assigned_started.json()["threshold"] == 88
    assert assigned_started.json()["pause_grace_ms"] == 3000
    assert assigned_started.json()["effective_config"]["assignment_id"] == assignment_id

    missing_family = _register_family(
        client,
        "missing-glyph@example.com",
        "ẞia",
        cpf="53196679144",
        child_cpf="01234567890",
    )
    missing_child = _child_id("missing-glyph@example.com")
    missing = client.post(
        "/api/tracing-runs/start",
        json={"child_id": missing_child},
        headers=_auth(missing_family["access_token"]),
    )
    assert missing.status_code == 422
    assert "ẞ" in missing.json()["detail"]


def test_finalize_rejects_identity_or_ordering_and_abandons_unreleased_trace(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "invalid-trace@example.com")
    child_id = _child_id("invalid-trace@example.com")
    started = client.post(
        "/api/tracing-runs/start",
        json={"child_id": child_id},
        headers=_auth(family["access_token"]),
    ).json()
    events = _trace_events(started["glyph_sequence"])
    invalid_identity = _evidence(started, events)
    invalid_identity["artifact_sha256"] = "f" * 64
    response = client.post(
        f"/api/tracing-runs/{started['id']}/finalize",
        json={"idempotency_key": "bad-identity", "evidence": invalid_identity},
        headers=_auth(family["access_token"]),
    )
    assert response.status_code == 422

    open_evidence = _evidence(started, events[:-1])
    abandoned = client.post(
        f"/api/tracing-runs/{started['id']}/finalize",
        json={"idempotency_key": "open-trace", "evidence": open_evidence},
        headers=_auth(family["access_token"]),
    )
    assert abandoned.status_code == 200
    assert abandoned.json()["status"] == "abandoned"


def test_low_score_releases_are_abandoned_below_threshold(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    family = _register_family(client, "low-score@example.com")
    child_id = _child_id("low-score@example.com")
    started = client.post(
        "/api/tracing-runs/start",
        json={"child_id": child_id},
        headers=_auth(family["access_token"]),
    ).json()
    evidence = _evidence(started, _low_score_events(started["glyph_sequence"]))
    finalized = client.post(
        f"/api/tracing-runs/{started['id']}/finalize",
        json={"idempotency_key": "low-score", "evidence": evidence},
        headers=_auth(family["access_token"]),
    )
    assert finalized.status_code == 200
    body = finalized.json()
    assert body["status"] == "abandoned"
    assert body["score"] == 0
    assert all(glyph["status"] != "completed" for glyph in body["glyphs"])


def test_retention_clears_evidence_and_keeps_audit_for_safe_rerun(
    client: TestClient, tracing_fixture: TracingFixture
) -> None:
    _register_family(client, "retention-family@example.com")
    child_id = _child_id("retention-family@example.com")
    artifact = canonical_glyph_set()
    with SessionLocal() as db:
        run = GameRun(
            game_id=tracing_fixture.game_id,
            child_id=UUID(child_id),
            status="completed",
            score=80,
            duration_seconds=10,
            glyph_set_id=tracing_fixture.glyph_set_id,
            glyph_set_version=artifact.version,
            glyph_set_sha256=artifact.artifact_sha256,
            threshold=70,
            contact_mode="timed_pause",
            pause_grace_ms=1500,
            scoring_version=1,
            schema_version=1,
            effective_config={"glyph_sequence": ["B"]},
            evidence={"events": []},
            evidence_sha256="a" * 64,
            evidence_version=1,
            last_activity_at=datetime.now(UTC) - timedelta(days=800),
        )
        db.add(run)
        db.commit()
        run_id = run.id
    assert purge_expired(batch_size=1) == 1
    with SessionLocal() as db:
        run = db.get(GameRun, run_id)
        audit = db.scalar(select(RetentionAudit).where(RetentionAudit.game_run_id == run_id))
        assert run is not None and run.evidence is None and run.effective_config is None
        assert run.glyph_set_id == tracing_fixture.glyph_set_id
        assert run.glyph_set_version == artifact.version
        assert run.glyph_set_sha256 == artifact.artifact_sha256
        assert run.threshold == 70
        assert run.contact_mode == "timed_pause"
        assert run.pause_grace_ms == 1500
        assert run.scoring_version == 1
        assert run.schema_version == 1
        sql_values = db.execute(
            text(
                "SELECT evidence, effective_config, evidence IS NULL, "
                "effective_config IS NULL FROM game_runs WHERE id = :run_id"
            ),
            {"run_id": run_id},
        ).one()
        assert tuple(sql_values) == (None, None, True, True)
        assert audit is not None and audit.action == "deleted"
        assert audit.evidence_sha256 == "a" * 64
    assert purge_expired(batch_size=1) == 0
