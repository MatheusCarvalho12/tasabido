import uuid
from typing import Any, cast

from fastapi.testclient import TestClient


def _register(client: TestClient, email: str = "ana@example.com") -> dict[str, Any]:
    response = client.post(
        "/auth/register",
        json={"name": "Ana Souza", "email": email, "password": "senha-segura-123"},
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def test_register_ok(client: TestClient) -> None:
    body = _register(client)

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["name"] == "Ana Souza"
    assert body["user"]["email"] == "ana@example.com"
    assert body["user"]["role"] == "family"
    uuid.UUID(body["user"]["id"])


def test_register_duplicate_email_409(client: TestClient) -> None:
    _register(client)

    response = client.post(
        "/auth/register",
        json={"name": "Outra Ana", "email": "ana@example.com", "password": "outra-senha-123"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "E-mail já cadastrado"


def test_register_invalid_payload_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"name": "A", "email": "nao-e-email", "password": "curto"},
    )

    assert response.status_code == 422


def test_login_ok(client: TestClient) -> None:
    _register(client)

    response = client.post(
        "/auth/login", json={"email": "ana@example.com", "password": "senha-segura-123"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "ana@example.com"
    assert body["user"]["role"] == "family"


def test_login_wrong_password_401(client: TestClient) -> None:
    _register(client)

    response = client.post(
        "/auth/login", json={"email": "ana@example.com", "password": "senha-errada"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha incorretos"


def test_login_unknown_email_401(client: TestClient) -> None:
    response = client.post(
        "/auth/login", json={"email": "ninguem@example.com", "password": "qualquer-senha"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha incorretos"


def test_me_with_token_200(client: TestClient) -> None:
    registered = _register(client)
    token = registered["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["id"] == registered["user"]["id"]
    assert body["user"]["name"] == "Ana Souza"
    assert body["user"]["email"] == "ana@example.com"
    assert body["user"]["role"] == "family"


def test_me_without_token_401(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Não autenticado"


def test_me_invalid_token_401(client: TestClient) -> None:
    response = client.get("/auth/me", headers={"Authorization": "Bearer token-invalido"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Não autenticado"
