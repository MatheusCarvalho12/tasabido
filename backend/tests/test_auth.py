import uuid
from datetime import date
from decimal import Decimal
from typing import Any, cast

from fastapi.testclient import TestClient


def _register(
    client: TestClient,
    email: str = "ana@example.com",
    role: str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Ana Souza",
        "email": email,
        "password": "senha-segura-123",
        "family_role": "mamae",
    }
    if role is not None:
        payload["role"] = role
    payload.update(extra)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _user_with_children(email: str) -> dict[str, Any]:
    """Lê o usuário + filhos direto do banco (evidência de persistência)."""
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email))
        assert user is not None
        return {
            "family_role": user.family_role,
            "phone": user.phone,
            "birth_date": user.birth_date,
            "support_network": user.support_network,
            "children": [
                {
                    "name": child.name,
                    "birth_date": child.birth_date,
                    "weight_kg": child.weight_kg,
                    "conditions": child.conditions,
                }
                for child in user.children
            ],
        }


def test_register_ok(client: TestClient) -> None:
    body = _register(client)

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["name"] == "Ana Souza"
    assert body["user"]["email"] == "ana@example.com"
    assert body["user"]["role"] == "family"
    assert body["user"]["family_role"] == "mamae"
    assert body["user"]["phone"] is None
    assert body["user"]["birth_date"] is None
    uuid.UUID(body["user"]["id"])


def test_register_duplicate_email_409(client: TestClient) -> None:
    _register(client)

    response = client.post(
        "/auth/register",
        json={
            "name": "Outra Ana",
            "email": "ana@example.com",
            "password": "outra-senha-123",
            "family_role": "mamae",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "E-mail já cadastrado"


def test_register_invalid_payload_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"name": "A", "email": "nao-e-email", "password": "curto"},
    )

    assert response.status_code == 422


def test_register_with_role_professional_201(client: TestClient) -> None:
    body = _register(client, email="paula@example.com", role="professional")

    assert body["user"]["role"] == "professional"


def test_register_invalid_role_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Paula Lima",
            "email": "paula@example.com",
            "password": "senha-segura-123",
            "role": "admin",
        },
    )

    assert response.status_code == 422


def test_register_full_family_201_persists_everything(client: TestClient) -> None:
    _register(
        client,
        email="familia@example.com",
        family_role="mamae",
        phone="+55 11 91234-5678",
        birth_date="1990-05-20",
        children=[
            {
                "name": "Bento",
                "birth_date": "2021-03-10",
                "weight_kg": 12.5,
                "conditions": ["tea", "atraso_fala"],
            },
            {"name": "Luna", "birth_date": None, "weight_kg": None, "conditions": []},
        ],
        support_network=["vovo", "vovo-m", "outro"],
    )

    stored = _user_with_children("familia@example.com")
    assert stored["family_role"] == "mamae"
    assert stored["phone"] == "+55 11 91234-5678"
    assert stored["birth_date"] == date(1990, 5, 20)
    assert stored["support_network"] == ["vovo", "vovo-m", "outro"]
    assert stored["children"] == [
        {
            "name": "Bento",
            "birth_date": date(2021, 3, 10),
            "weight_kg": Decimal("12.50"),
            "conditions": ["tea", "atraso_fala"],
        },
        {
            "name": "Luna",
            "birth_date": None,
            "weight_kg": None,
            "conditions": [],
        },
    ]


def test_register_without_children_201(client: TestClient) -> None:
    _register(client, email="semfilhos@example.com", family_role="papai")

    stored = _user_with_children("semfilhos@example.com")
    assert stored["family_role"] == "papai"
    assert stored["children"] == []
    assert stored["support_network"] == []


def test_register_family_without_family_role_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Sem Papel",
            "email": "sempapel@example.com",
            "password": "senha-segura-123",
        },
    )

    assert response.status_code == 422


def test_register_invalid_family_role_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Papel Errado",
            "email": "papelerrado@example.com",
            "password": "senha-segura-123",
            "family_role": "tio",
        },
    )

    assert response.status_code == 422


def test_register_invalid_child_condition_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Condicao Errada",
            "email": "condicao@example.com",
            "password": "senha-segura-123",
            "family_role": "mamae",
            "children": [{"name": "Bento", "conditions": ["inexistente"]}],
        },
    )

    assert response.status_code == 422


def test_register_invalid_support_network_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Rede Errada",
            "email": "rede@example.com",
            "password": "senha-segura-123",
            "family_role": "mamae",
            "support_network": ["tio"],
        },
    )

    assert response.status_code == 422


def test_register_child_weight_kg_invalid_422(client: TestClient) -> None:
    for invalid_weight in [0, -1, 301]:
        response = client.post(
            "/auth/register",
            json={
                "name": "Peso Errado",
                "email": f"peso{invalid_weight}@example.com",
                "password": "senha-segura-123",
                "family_role": "mamae",
                "children": [{"name": "Bento", "weight_kg": invalid_weight}],
            },
        )

        assert response.status_code == 422


def test_register_child_weight_kg_upper_bound_201(client: TestClient) -> None:
    _register(
        client,
        email="peso300@example.com",
        children=[{"name": "Bento", "weight_kg": 300}],
    )

    stored = _user_with_children("peso300@example.com")
    assert stored["children"][0]["weight_kg"] == Decimal("300.00")


def test_register_professional_family_data_ignored_201(client: TestClient) -> None:
    body = _register(
        client,
        email="pro@example.com",
        role="professional",
        family_role="mamae",
        children=[{"name": "Bento", "conditions": ["tea"]}],
        support_network=["vovo"],
    )

    assert body["user"]["role"] == "professional"
    assert body["user"]["family_role"] is None
    stored = _user_with_children("pro@example.com")
    assert stored["family_role"] is None
    assert stored["children"] == []
    assert stored["support_network"] == []


def test_login_ok(client: TestClient) -> None:
    _register(client, phone="+55 11 99999-0000", birth_date="1988-11-02")

    response = client.post(
        "/auth/login", json={"email": "ana@example.com", "password": "senha-segura-123"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "ana@example.com"
    assert body["user"]["role"] == "family"
    assert body["user"]["family_role"] == "mamae"
    assert body["user"]["phone"] == "+55 11 99999-0000"
    assert body["user"]["birth_date"] == "1988-11-02"


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


def test_login_with_matching_role_200(client: TestClient) -> None:
    _register(client, email="paula@example.com", role="professional")

    response = client.post(
        "/auth/login",
        json={
            "email": "paula@example.com",
            "password": "senha-segura-123",
            "role": "professional",
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "professional"


def test_login_with_wrong_role_401(client: TestClient) -> None:
    _register(client)

    response = client.post(
        "/auth/login",
        json={
            "email": "ana@example.com",
            "password": "senha-segura-123",
            "role": "professional",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha incorretos"


def test_login_without_role_200_any_role(client: TestClient) -> None:
    _register(client, email="paula@example.com", role="professional")

    response = client.post(
        "/auth/login",
        json={"email": "paula@example.com", "password": "senha-segura-123"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "professional"


def test_me_with_token_200(client: TestClient) -> None:
    registered = _register(client, phone="+55 11 98888-7777", birth_date="1992-01-15")
    token = registered["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["id"] == registered["user"]["id"]
    assert body["user"]["name"] == "Ana Souza"
    assert body["user"]["email"] == "ana@example.com"
    assert body["user"]["role"] == "family"
    assert body["user"]["family_role"] == "mamae"
    assert body["user"]["phone"] == "+55 11 98888-7777"
    assert body["user"]["birth_date"] == "1992-01-15"


def test_me_without_token_401(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Não autenticado"


def test_me_invalid_token_401(client: TestClient) -> None:
    response = client.get("/auth/me", headers={"Authorization": "Bearer token-invalido"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Não autenticado"
