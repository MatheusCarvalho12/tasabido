"""Modo criança (T3): jogos públicos, para casa, partidas, stats e PIN dos pais.

Os jogos são criados via API real (POST /api/games + publish, do T2) porque o
conftest limpa o banco entre testes — nada de mock, stats sempre de game_runs.
"""

import time
import uuid
from typing import Any, cast

from fastapi.testclient import TestClient


def _register(
    client: TestClient,
    email: str,
    role: str,
    cpf: str,
    **extra: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Ana Souza",
        "email": email,
        "password": "senha-segura-123",
        "cpf": cpf,
        "lgpd_consent": True,
    }
    if role == "professional":
        payload.update(
            {
                "role": "professional",
                "profession": "psicologo",
                "council_type": "crp",
                "council_number": "12345",
                "council_region": "06",
            }
        )
    else:
        payload.update(
            {
                "role": "family",
                "family_role": "mamae",
                # Toda família de teste tem uma criança (os endpoints de runs,
                # para casa e stats do modo criança dependem de children).
                "children": [{"name": "Bia", "cpf": "11144477735"}],
            }
        )
    payload.update(extra)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _child_id(email: str) -> str:
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email))
        assert user is not None and user.children
        return str(user.children[0].id)


def _create_published_game(
    client: TestClient,
    token: str,
    titulo: str,
    **extra: Any,
) -> dict[str, Any]:
    """Jogo real via API do T2, publicado (visibilidade public por padrão)."""
    payload: dict[str, Any] = {
        "titulo": titulo,
        "descricao": "Atividade do modo criança.",
        "tutorial": "Siga as instruções na tela.",
        "categoria": "escrita",
        "visibilidade": "public",
        "cores": ["#08ADAE", "#F75A3D"],
    }
    payload.update(extra)
    created = client.post("/api/games", json=payload, headers=_auth(token))
    assert created.status_code == 201
    published = client.post(f"/api/games/{created.json()['id']}/publish", headers=_auth(token))
    assert published.status_code == 200
    return cast(dict[str, Any], published.json())


def _post_run(
    client: TestClient,
    token: str,
    game_id: int,
    child_id: str,
    score: int = 90,
    duration_seconds: int = 180,
):
    return client.post(
        "/api/game-runs",
        json={
            "game_id": game_id,
            "child_id": child_id,
            "score": score,
            "duration_seconds": duration_seconds,
        },
        headers=_auth(token),
    )


def _post_assignment(
    client: TestClient,
    token: str,
    game_id: int,
    child_id: str,
):
    return client.post(
        "/api/assignments",
        json={"game_id": game_id, "child_id": child_id},
        headers=_auth(token),
    )


# --- Jogos públicos (GET /api/games?scope=public) ---


def test_public_games_require_auth_401(client: TestClient) -> None:
    assert client.get("/api/games?scope=public").status_code == 401


def test_public_games_list_contract(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    publico = _create_published_game(client, prof["access_token"], "Jogo público")
    _create_published_game(client, prof["access_token"], "Jogo privado", visibilidade="private")
    # Rascunho: criado sem publicar — não pode aparecer no escopo público.
    client.post(
        "/api/games",
        json={
            "titulo": "Jogo rascunho",
            "descricao": "desc",
            "tutorial": "tutorial",
            "categoria": "escrita",
        },
        headers=_auth(prof["access_token"]),
    )

    response = client.get("/api/games?scope=public", headers=_auth(family["access_token"]))

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items"}
    items = body["items"]
    assert len(items) == 1
    item = items[0]
    assert item["id"] == publico["id"]
    assert set(item) == {
        "id",
        "slug",
        "titulo",
        "descricao",
        "tutorial",
        "categoria",
        "visibilidade",
        "status",
        "svg_url",
        "thumb_url",
        "banner_url",
        "cores",
        "stats",
    }
    assert item["visibilidade"] == "public"
    assert item["status"] == "published"
    assert item["svg_url"] is None  # sem upload de SVG
    assert item["thumb_url"] is None  # sem upload de imagem
    assert item["banner_url"] is None
    assert item["cores"] == ["#08ADAE", "#F75A3D"]
    assert item["stats"] == {"partidas": 0, "tempo_medio_min": 0, "score_medio": 0}


def test_public_games_ordered_by_partidas_desc(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    jogado = _create_published_game(client, prof["access_token"], "Mais jogado")
    pouco_jogado = _create_published_game(client, prof["access_token"], "Pouco jogado")

    # 2 partidas no primeiro, 1 no segundo → o mais jogado lidera a lista.
    for _ in range(2):
        assert _post_run(client, family["access_token"], jogado["id"], child_id).status_code == 201
    assert (
        _post_run(client, family["access_token"], pouco_jogado["id"], child_id).status_code == 201
    )

    items = client.get("/api/games?scope=public", headers=_auth(family["access_token"])).json()[
        "items"
    ]
    assert items[0]["id"] == jogado["id"]
    assert items[0]["stats"]["partidas"] == 2
    assert items[1]["id"] == pouco_jogado["id"]
    assert items[1]["stats"]["partidas"] == 1


def test_public_games_invalid_scope_422(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")

    response = client.get("/api/games?scope=admin", headers=_auth(family["access_token"]))

    assert response.status_code == 422


# --- Stats por jogo (GET /api/games/{id}/stats) ---


def test_game_stats_zero_then_aggregated_from_runs(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Jogo com stats")

    zero = client.get(f"/api/games/{game['id']}/stats", headers=_auth(family["access_token"]))
    assert zero.status_code == 200
    assert zero.json() == {"partidas": 0, "tempo_medio_min": 0, "score_medio": 0}

    # 2 runs: scores 80 e 100 → 90; durações 120s e 240s → média 180s = 3 min.
    assert (
        _post_run(
            client, family["access_token"], game["id"], child_id, score=80, duration_seconds=120
        ).status_code
        == 201
    )
    assert (
        _post_run(
            client, family["access_token"], game["id"], child_id, score=100, duration_seconds=240
        ).status_code
        == 201
    )

    stats = client.get(
        f"/api/games/{game['id']}/stats", headers=_auth(family["access_token"])
    ).json()
    assert stats == {"partidas": 2, "tempo_medio_min": 3, "score_medio": 90}


def test_game_stats_unknown_game_404(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")

    response = client.get("/api/games/99999/stats", headers=_auth(family["access_token"]))

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado"


# --- Partidas (POST /api/game-runs) ---


def test_create_run_ok_201_persists(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Jogo para jogar")

    response = _post_run(
        client,
        family["access_token"],
        game["id"],
        child_id,
        score=75,
        duration_seconds=150,
    )

    assert response.status_code == 201
    run = response.json()
    assert run["game_id"] == game["id"]
    assert run["child_id"] == child_id
    assert run["score"] == 75
    assert run["duration_seconds"] == 150
    assert isinstance(run["id"], int)
    assert run["created_at"]

    # Evidência direta no banco.
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import GameRun

    with SessionLocal() as session:
        stored = session.scalar(select(GameRun).where(GameRun.id == run["id"]))
        assert stored is not None
        assert stored.score == 75
        assert stored.duration_seconds == 150


def test_create_run_family_other_child_404(client: TestClient) -> None:
    _register(client, "mae-a@example.com", "family", "52998224725")
    other_family = _register(
        client,
        "mae-b@example.com",
        "family",
        "11144477735",
        children=[{"name": "Luna", "cpf": "01234567890"}],
    )
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_of_a = _child_id("mae-a@example.com")
    game = _create_published_game(client, prof["access_token"], "Jogo alheio")

    response = _post_run(client, other_family["access_token"], game["id"], child_of_a)

    assert response.status_code == 404
    assert response.json()["detail"] == "Criança não encontrada"


def test_create_run_unknown_game_404(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    child_id = _child_id("mae@example.com")

    response = _post_run(client, family["access_token"], 99999, child_id)

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado"


def test_create_run_draft_game_409(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    draft = client.post(
        "/api/games",
        json={
            "titulo": "Jogo em rascunho",
            "descricao": "desc",
            "tutorial": "tutorial",
            "categoria": "escrita",
        },
        headers=_auth(prof["access_token"]),
    ).json()

    response = _post_run(client, family["access_token"], draft["id"], child_id)

    assert response.status_code == 409
    assert response.json()["detail"] == "Este jogo ainda não está disponível para jogar"


def test_create_run_invalid_score_and_duration_422(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Jogo validação")

    for payload in [
        {"score": 101},
        {"score": -1},
        {"duration_seconds": -5},
    ]:
        response = _post_run(client, family["access_token"], game["id"], child_id, **payload)
        assert response.status_code == 422
        assert response.json()["detail"] in (
            "A pontuação precisa ser entre 0 e 100",
            "A duração da partida não pode ser negativa",
        )


def test_create_run_professional_any_child_201(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Jogo do profissional")

    response = _post_run(client, prof["access_token"], game["id"], child_id)

    assert response.status_code == 201


# --- Para casa (assignments) ---


def test_create_assignment_ok_201_contract(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Tarefa da Bia")

    response = _post_assignment(client, prof["access_token"], game["id"], child_id)

    assert response.status_code == 201
    item = response.json()
    assert item["id"] == game["id"]
    assert item["slug"] == "tarefa-da-bia"
    assert item["atribuido_em"]
    assert item["stats"] == {"partidas": 0, "tempo_medio_min": 0, "score_medio": 0}

    # Evidência direta no banco.
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import GameAssignment

    with SessionLocal() as session:
        stored = session.scalar(select(GameAssignment).where(GameAssignment.game_id == game["id"]))
        assert stored is not None
        assert str(stored.child_id) == child_id


def test_create_assignment_duplicate_409(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Tarefa duplicada")

    first = _post_assignment(client, prof["access_token"], game["id"], child_id)
    assert first.status_code == 201
    second = _post_assignment(client, prof["access_token"], game["id"], child_id)

    assert second.status_code == 409
    assert second.json()["detail"] == "Esta criança já tem essa tarefa para casa"


def test_create_assignment_family_forbidden_403(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Tarefa proibida")

    response = _post_assignment(client, family["access_token"], game["id"], child_id)

    assert response.status_code == 403
    assert response.json()["detail"] == "Acesso restrito a profissionais"


def test_create_assignment_unknown_game_or_child_404(client: TestClient) -> None:
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    random_child = str(uuid.uuid4())

    game = _post_assignment(client, prof["access_token"], 99999, random_child)
    assert game.status_code == 404
    assert game.json()["detail"] == "Jogo não encontrado"


def test_list_assignments_own_child_ordered_desc(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    first = _create_published_game(client, prof["access_token"], "Primeira tarefa")
    # Garante timestamps distintos: a lista ordena por atribuido_em desc.
    time.sleep(1.1)
    second = _create_published_game(client, prof["access_token"], "Segunda tarefa")
    assert _post_assignment(client, prof["access_token"], first["id"], child_id).status_code == 201
    assert _post_assignment(client, prof["access_token"], second["id"], child_id).status_code == 201

    response = client.get(
        f"/api/children/{child_id}/assignments",
        headers=_auth(prof["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items"}
    items = body["items"]
    assert [item["id"] for item in items] == [second["id"], first["id"]]
    assert all("atribuido_em" in item for item in items)


def test_list_assignments_other_family_404(client: TestClient) -> None:
    _register(client, "mae-a@example.com", "family", "52998224725")
    other = _register(
        client,
        "mae-b@example.com",
        "family",
        "11144477735",
        children=[{"name": "Luna", "cpf": "01234567890"}],
    )
    child_of_a = _child_id("mae-a@example.com")

    response = client.get(
        f"/api/children/{child_of_a}/assignments",
        headers=_auth(other["access_token"]),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Criança não encontrada"


def test_list_assignments_empty_items(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")

    response = client.get(
        f"/api/children/{child_id}/assignments",
        headers=_auth(prof["access_token"]),
    )

    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_delete_assignment_204_then_404(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Tarefa removível")
    created = _post_assignment(client, prof["access_token"], game["id"], child_id).json()

    deleted = client.delete(
        f"/api/assignments/{created['assignment_id']}", headers=_auth(prof["access_token"])
    )
    assert deleted.status_code == 204

    missing = client.delete(
        f"/api/assignments/{created['assignment_id']}", headers=_auth(prof["access_token"])
    )
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Tarefa não encontrada"


def test_delete_assignment_family_forbidden_403(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    child_id = _child_id("mae@example.com")
    game = _create_published_game(client, prof["access_token"], "Tarefa da família")
    created = _post_assignment(client, prof["access_token"], game["id"], child_id).json()

    response = client.delete(
        f"/api/assignments/{created['assignment_id']}", headers=_auth(family["access_token"])
    )

    assert response.status_code == 403


# --- PIN dos pais ---


def test_pin_set_and_validate_ok(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    headers = _auth(family["access_token"])

    patched = client.patch("/api/family/pin", json={"pin": "123456"}, headers=headers)
    assert patched.status_code == 200
    assert patched.json() == {"ok": True}

    validated = client.post("/api/family/pin/validate", json={"pin": "123456"}, headers=headers)
    assert validated.status_code == 200
    assert validated.json() == {"valido": True}


def test_pin_wrong_401(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    headers = _auth(family["access_token"])
    assert (
        client.patch("/api/family/pin", json={"pin": "123456"}, headers=headers).status_code == 200
    )

    response = client.post("/api/family/pin/validate", json={"pin": "654321"}, headers=headers)

    assert response.status_code == 401
    assert response.json() == {"valido": False}


def test_pin_without_pin_set_401(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")

    response = client.post(
        "/api/family/pin/validate",
        json={"pin": "123456"},
        headers=_auth(family["access_token"]),
    )

    assert response.status_code == 401
    assert response.json() == {"valido": False}


def test_pin_wrong_size_422(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    headers = _auth(family["access_token"])

    for wrong_pin in ["12345", "1234567", "abcdef", "12345a", ""]:
        patched = client.patch("/api/family/pin", json={"pin": wrong_pin}, headers=headers)
        assert patched.status_code == 422
        assert patched.json()["detail"] == "O PIN precisa ter exatamente 6 dígitos"

        validated = client.post(
            "/api/family/pin/validate", json={"pin": wrong_pin}, headers=headers
        )
        assert validated.status_code == 422


def test_pin_professional_forbidden_403(client: TestClient) -> None:
    prof = _register(client, "prof@example.com", "professional", "39053344705")
    headers = _auth(prof["access_token"])

    assert (
        client.patch("/api/family/pin", json={"pin": "123456"}, headers=headers).status_code == 403
    )
    assert (
        client.post("/api/family/pin/validate", json={"pin": "123456"}, headers=headers).status_code
        == 403
    )


def test_pin_hash_stored_argon2(client: TestClient) -> None:
    family = _register(client, "mae@example.com", "family", "52998224725")
    assert (
        client.patch(
            "/api/family/pin", json={"pin": "123456"}, headers=_auth(family["access_token"])
        ).status_code
        == 200
    )

    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import User
    from app.security import verify_password

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == "mae@example.com"))
        assert user is not None
        assert user.pin_hash is not None
        assert user.pin_hash.startswith("$argon2id$")
        assert verify_password("123456", user.pin_hash)
        assert not verify_password("654321", user.pin_hash)


def test_children_list_requires_auth_401(client: TestClient) -> None:
    assert client.get("/api/children").status_code == 401


def test_children_list_own_family_contract(client: TestClient) -> None:
    family = _register(
        client,
        "mae@example.com",
        "family",
        "52998224725",
        children=[
            {"name": "Duda", "cpf": "53196679144"},
            {"name": "Bento", "cpf": "52998224725"},
        ],
    )
    headers = _auth(family["access_token"])

    response = client.get("/api/children", headers=headers)

    assert response.status_code == 200
    items = response.json()["items"]
    assert [child["name"] for child in items] == ["Duda", "Bento"]
    for child in items:
        assert set(child) == {"id", "name"}
        assert uuid.UUID(child["id"])


def test_children_list_only_own_family(client: TestClient) -> None:
    _register(
        client,
        "outra-mae@example.com",
        "family",
        "03478246687",
        children=[{"name": "Alice", "cpf": "53196679144"}],
    )
    family = _register(client, "mae@example.com", "family", "52998224725")

    response = client.get("/api/children", headers=_auth(family["access_token"]))

    assert response.status_code == 200
    # A família só enxerga os próprios filhos (Bia, do helper) — nunca a Alice
    # da outra família registrada no mesmo banco.
    assert [child["name"] for child in response.json()["items"]] == ["Bia"]


def test_children_list_professional_forbidden_403(client: TestClient) -> None:
    prof = _register(client, "prof@example.com", "professional", "39053344705")

    response = client.get("/api/children", headers=_auth(prof["access_token"]))

    assert response.status_code == 403
