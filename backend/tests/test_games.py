import uuid
from typing import Any, cast

from fastapi.testclient import TestClient

SVG_CONTENT = (
    b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
    b'<rect width="100" height="100" fill="#08ADAE"/></svg>'
)


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
        payload.update({"role": "family", "family_role": "mamae"})
    payload.update(extra)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _auth(email: str) -> dict[str, str]:
    """Token do usuário já registrado (lido do banco, não de mock)."""
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import User
    from app.security import create_access_token

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email))
        assert user is not None
        return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def _child_id(email: str) -> uuid.UUID:
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email))
        assert user is not None and user.children
        return user.children[0].id


def _create_game(
    client: TestClient,
    headers: dict[str, str],
    titulo: str = "Escreva seu nome",
    **extra: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "titulo": titulo,
        "descricao": "Atividade de escrita do nome.",
        "tutorial": "Escreva seu nome passando o dedo sobre as letras pontilhadas.",
        "categoria": "escrita",
        "visibilidade": "public",
        "cores": ["#08ADAE", "#F75A3D"],
    }
    payload.update(extra)
    response = client.post("/api/games", json=payload, headers=headers)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def test_create_game_ok(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")

    game = _create_game(client, headers)

    assert game["id"] >= 1
    assert game["slug"] == "escreva-seu-nome"
    assert game["titulo"] == "Escreva seu nome"
    assert game["status"] == "draft"
    assert game["visibilidade"] == "public"
    assert game["cores"] == ["#08ADAE", "#F75A3D"]
    assert game["svg_url"] is None
    assert game["stats"] == {"partidas": 0, "tempo_medio_min": 0, "score_medio": 0}


def test_create_game_slug_never_collides(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")

    first = _create_game(client, headers)
    second = _create_game(client, headers)

    assert first["slug"] == "escreva-seu-nome"
    assert second["slug"] == "escreva-seu-nome-2"


def test_create_game_slug_normalizes_accents(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")

    game = _create_game(client, headers, titulo="Pinte o arco-íris!")

    assert game["slug"] == "pinte-o-arco-iris"


def test_patch_game_updates_and_regenerates_slug(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.patch(
        f"/api/games/{game['id']}",
        json={"titulo": "Desenhe o macaco", "visibilidade": "private"},
        headers=headers,
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["titulo"] == "Desenhe o macaco"
    assert updated["slug"] == "desenhe-o-macaco"
    assert updated["visibilidade"] == "private"
    assert updated["descricao"] == "Atividade de escrita do nome."


def test_patch_published_to_draft(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.patch(
        f"/api/games/{game['id']}", json={"status": "published"}, headers=headers
    )
    assert response.json()["status"] == "published"

    response = client.patch(f"/api/games/{game['id']}", json={"status": "draft"}, headers=headers)
    assert response.json()["status"] == "draft"


def test_patch_forbidden_for_other_professional(client: TestClient) -> None:
    _register(client, "prof-a@example.com", "professional", "52998224725")
    _register(client, "prof-b@example.com", "professional", "11144477735")
    game = _create_game(client, _auth("prof-a@example.com"))

    response = client.patch(
        f"/api/games/{game['id']}", json={"titulo": "Hackeado"}, headers=_auth("prof-b@example.com")
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Você não é o dono deste jogo"


def test_patch_not_found_404(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")

    response = client.patch(
        "/api/games/99999", json={"titulo": "Qualquer"}, headers=_auth("prof@example.com")
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado"


def test_publish_flow(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)
    assert game["status"] == "draft"

    response = client.post(f"/api/games/{game['id']}/publish", headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "published"

    # Idempotente: publicar de novo não é erro.
    response = client.post(f"/api/games/{game['id']}/publish", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "published"


def test_upload_svg_ok_and_get(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.post(
        f"/api/games/{game['id']}/svg",
        files={"file": ("desenho.svg", SVG_CONTENT, "image/svg+xml")},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == {"svg_url": f"/api/games/{game['id']}/svg"}

    # Jogo refletido no GET (svg_url setado) e arquivo servido de verdade.
    listed = client.get("/api/games?scope=mine", headers=headers).json()
    assert listed["items"][0]["svg_url"] == f"/api/games/{game['id']}/svg"

    svg_response = client.get(f"/api/games/{game['id']}/svg", headers=headers)
    assert svg_response.status_code == 200
    assert svg_response.headers["content-type"] == "image/svg+xml"
    assert svg_response.content == SVG_CONTENT


def test_upload_svg_rejects_wrong_extension(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.post(
        f"/api/games/{game['id']}/svg",
        files={"file": ("desenho.png", SVG_CONTENT, "image/png")},
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O arquivo precisa ser um SVG (.svg)"


def test_upload_svg_rejects_non_svg_content(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.post(
        f"/api/games/{game['id']}/svg",
        files={"file": ("falso.svg", b"nada a ver com svg", "image/svg+xml")},
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O conteúdo do arquivo não parece um SVG válido"


def test_upload_svg_rejects_too_large(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    huge = b"<svg" + b"a" * (500 * 1024)
    response = client.post(
        f"/api/games/{game['id']}/svg",
        files={"file": ("grande.svg", huge, "image/svg+xml")},
        headers=headers,
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "O arquivo SVG precisa ter no máximo 500 KB"


def test_get_svg_not_found_404(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.get(f"/api/games/{game['id']}/svg", headers=headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "SVG não encontrado"


def test_delete_game_ok_and_404(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)

    response = client.delete(f"/api/games/{game['id']}", headers=headers)

    assert response.status_code == 204

    # Jogo sumiu: qualquer operação por id responde 404 (o contrato não tem GET individual).
    response = client.patch(
        f"/api/games/{game['id']}", json={"titulo": "Qualquer"}, headers=headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado"
    assert client.get(f"/api/games/{game['id']}/svg", headers=headers).status_code == 404


def test_delete_forbidden_for_other_professional(client: TestClient) -> None:
    _register(client, "prof-a@example.com", "professional", "52998224725")
    _register(client, "prof-b@example.com", "professional", "11144477735")
    game = _create_game(client, _auth("prof-a@example.com"))

    response = client.delete(f"/api/games/{game['id']}", headers=_auth("prof-b@example.com"))

    assert response.status_code == 403


def test_list_scopes(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")
    publica = _create_game(client, headers, titulo="Jogo público")
    client.patch(f"/api/games/{publica['id']}", json={"status": "published"}, headers=headers)
    privado = _create_game(client, headers, titulo="Jogo privado", visibilidade="private")
    draft = _create_game(client, headers, titulo="Jogo em rascunho")

    public = client.get("/api/games?scope=public", headers=headers).json()
    assert [g["id"] for g in public["items"]] == [publica["id"]]

    mine = client.get("/api/games?scope=mine", headers=headers).json()
    assert {g["id"] for g in mine["items"]} == {publica["id"], privado["id"], draft["id"]}

    all_games = client.get("/api/games?scope=all", headers=headers).json()
    assert {g["id"] for g in all_games["items"]} == {publica["id"], privado["id"], draft["id"]}


def test_scope_mine_forbidden_for_family(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")
    headers = _auth("mae@example.com")

    response = client.get("/api/games?scope=mine", headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Apenas profissionais podem usar esse filtro"


def test_family_cannot_create_game(client: TestClient) -> None:
    _register(client, "mae@example.com", "family", "52998224725")

    response = client.post(
        "/api/games",
        json={
            "titulo": "Jogo da mamãe",
            "descricao": "desc",
            "tutorial": "tutorial",
            "categoria": "escrita",
        },
        headers=_auth("mae@example.com"),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Apenas profissionais podem criar jogos"


def test_unauthenticated_401(client: TestClient) -> None:
    assert client.get("/api/games").status_code == 401
    assert client.get("/api/games?scope=mine").status_code == 401
    assert (
        client.post(
            "/api/games",
            json={
                "titulo": "X",
                "descricao": "d",
                "tutorial": "t",
                "categoria": "c",
            },
        ).status_code
        == 401
    )


def test_stats_aggregated_from_real_runs(client: TestClient) -> None:
    """Stats vêm de game_runs reais no banco — média de 600s/840s → 12 min, 90/84 → 87."""
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import Game, GameRun

    _register(
        client,
        "mae@example.com",
        "family",
        "52998224725",
        children=[{"name": "Bia", "cpf": "11144477735"}],
    )
    _register(client, "prof@example.com", "professional", "39053344705")
    headers = _auth("prof@example.com")
    game = _create_game(client, headers)
    child_id = _child_id("mae@example.com")

    with SessionLocal() as session:
        session.add_all(
            [
                GameRun(game_id=game["id"], child_id=child_id, score=90, duration_seconds=600),
                GameRun(game_id=game["id"], child_id=child_id, score=84, duration_seconds=840),
            ]
        )
        session.commit()

    listed = client.get("/api/games?scope=mine", headers=headers).json()
    assert listed["items"][0]["stats"] == {"partidas": 2, "tempo_medio_min": 12, "score_medio": 87}

    # Jogo sem runs → stats zeradas (nunca inventar número).
    other = _create_game(client, headers, titulo="Sem partidas")
    mine = client.get("/api/games?scope=mine", headers=headers).json()
    by_id = {g["id"]: g for g in mine["items"]}
    assert by_id[other["id"]]["stats"] == {"partidas": 0, "tempo_medio_min": 0, "score_medio": 0}

    # Evidência direta no banco (o count da lista não é mock).
    with SessionLocal() as session:
        game_row = session.scalar(select(Game).where(Game.id == game["id"]))
        assert game_row is not None
        assert session.scalar(select(GameRun).where(GameRun.game_id == game["id"])) is not None


def test_create_game_validation_messages(client: TestClient) -> None:
    _register(client, "prof@example.com", "professional", "52998224725")
    headers = _auth("prof@example.com")

    response = client.post(
        "/api/games",
        json={"titulo": "A", "descricao": "", "tutorial": "t", "categoria": "c"},
        headers=headers,
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail in (
        "O título do jogo precisa ter pelo menos 2 caracteres",
        "A descrição é obrigatória",
    )
