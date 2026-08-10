import uuid
from datetime import date, timedelta
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
        "cpf": "52998224725",
        "lgpd_consent": True,
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
            "cpf": user.cpf,
            "phone": user.phone,
            "birth_date": user.birth_date,
            "cep": user.cep,
            "consentido_em": user.consentido_em,
            "support_network": user.support_network,
            "children": [
                {
                    "name": child.name,
                    "cpf": child.cpf,
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
    assert body["user"]["cpf"] == "52998224725"
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
            "cpf": "52998224725",
            "lgpd_consent": True,
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
        cpf="529.982.247-25",
        phone="+55 11 91234-5678",
        birth_date="1990-05-20",
        children=[
            {
                "name": "Bento",
                "cpf": "111.444.777-35",
                "birth_date": "2021-03-10",
                "weight_kg": 12.5,
                "conditions": ["tea", "atraso_fala"],
            },
            {
                "name": "Luna",
                "cpf": "01234567890",
                "birth_date": None,
                "weight_kg": None,
                "conditions": [],
            },
        ],
        support_network=["vovo", "vovo-m", "outro"],
    )

    stored = _user_with_children("familia@example.com")
    assert stored["family_role"] == "mamae"
    assert stored["cpf"] == "52998224725"
    assert stored["phone"] == "+55 11 91234-5678"
    assert stored["birth_date"] == date(1990, 5, 20)
    assert stored["support_network"] == ["vovo", "vovo-m", "outro"]
    assert stored["children"] == [
        {
            "name": "Bento",
            "cpf": "11144477735",
            "birth_date": date(2021, 3, 10),
            "weight_kg": Decimal("12.50"),
            "conditions": ["tea", "atraso_fala"],
        },
        {
            "name": "Luna",
            "cpf": "01234567890",
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
            "cpf": "52998224725",
            "children": [{"name": "Bento", "cpf": "11144477735", "conditions": ["inexistente"]}],
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
                "cpf": "52998224725",
                "children": [{"name": "Bento", "cpf": "11144477735", "weight_kg": invalid_weight}],
            },
        )

        assert response.status_code == 422


def test_register_child_weight_kg_upper_bound_201(client: TestClient) -> None:
    _register(
        client,
        email="peso300@example.com",
        children=[{"name": "Bento", "cpf": "11144477735", "weight_kg": 300}],
    )

    stored = _user_with_children("peso300@example.com")
    assert stored["children"][0]["weight_kg"] == Decimal("300.00")


def test_register_professional_family_data_ignored_201(client: TestClient) -> None:
    body = _register(
        client,
        email="pro@example.com",
        role="professional",
        family_role="mamae",
        children=[{"name": "Bento", "cpf": "11144477735", "conditions": ["tea"]}],
        support_network=["vovo"],
    )

    assert body["user"]["role"] == "professional"
    assert body["user"]["family_role"] is None
    assert body["user"]["cpf"] is None
    stored = _user_with_children("pro@example.com")
    assert stored["family_role"] is None
    assert stored["cpf"] is None
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


# --- Validações do contrato único (mesmas regras do front) ---


def _register_payload(**extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Ana Souza",
        "email": "ana@example.com",
        "password": "senha-segura-123",
        "family_role": "mamae",
        "cpf": "52998224725",
        "lgpd_consent": True,
    }
    payload.update(extra)
    return payload


def test_register_password_without_number_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(password="somenteletras"))

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "A senha precisa ter pelo menos 8 caracteres, com letra e número"
    )


def test_register_password_short_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(password="abc12"))

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "A senha precisa ter pelo menos 8 caracteres, com letra e número"
    )


def test_register_password_letters_and_digits_201(client: TestClient) -> None:
    body = _register(client, email="senhaok@example.com", password="abc12345")

    assert body["user"]["email"] == "senhaok@example.com"


def test_register_name_with_digits_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(name="Ana 123"))

    assert response.status_code == 422
    assert response.json()["detail"] == "O nome só pode conter letras e espaços"


def test_register_short_name_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(name="A"))

    assert response.status_code == 422
    assert response.json()["detail"] == "O nome precisa ter pelo menos 2 letras"


def test_register_invalid_phone_bad_ddd_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(phone="(00) 98765-4321"))

    assert response.status_code == 422
    assert response.json()["detail"] == "Telefone inválido"


def test_register_invalid_phone_gibberish_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(phone="abc"))

    assert response.status_code == 422
    assert response.json()["detail"] == "Telefone inválido"


def test_register_formatted_phone_201(client: TestClient) -> None:
    body = _register(client, email="telefoneok@example.com", phone="(11) 98765-4321")

    assert body["user"]["phone"] == "(11) 98765-4321"


def test_register_future_birth_date_422(client: TestClient) -> None:
    future = (date.today() + timedelta(days=1)).isoformat()
    response = client.post("/auth/register", json=_register_payload(birth_date=future))

    assert response.status_code == 422
    assert response.json()["detail"] == "A data de nascimento não pode estar no futuro"


def test_register_birth_date_130_years_422(client: TestClient) -> None:
    too_old = (date.today() - timedelta(days=365 * 130)).isoformat()
    response = client.post("/auth/register", json=_register_payload(birth_date=too_old))

    assert response.status_code == 422
    assert response.json()["detail"] == "A data de nascimento indica mais de 120 anos"


def test_register_valid_birth_date_201(client: TestClient) -> None:
    valid = (date.today() - timedelta(days=365 * 30)).isoformat()
    body = _register(client, email="datanasc@example.com", birth_date=valid)

    assert body["user"]["birth_date"] == valid


def test_register_child_future_birth_date_422(client: TestClient) -> None:
    future = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        "/auth/register",
        json=_register_payload(
            children=[{"name": "Bento", "cpf": "11144477735", "birth_date": future}]
        ),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "A data de nascimento não pode estar no futuro"


def test_register_child_short_name_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json=_register_payload(children=[{"name": "A", "cpf": "11144477735"}]),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O nome da criança precisa ter pelo menos 2 letras"


# --- CPF (responsável e criança) ---


def test_register_family_without_cpf_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Sem CPF",
            "email": "semcpf@example.com",
            "password": "senha-segura-123",
            "family_role": "mamae",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O CPF é obrigatório para o papel family"


def test_register_invalid_cpf_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(cpf="123.456.789-00"))

    assert response.status_code == 422
    assert response.json()["detail"] == "CPF inválido"


def test_register_cpf_repeated_digits_422(client: TestClient) -> None:
    response = client.post("/auth/register", json=_register_payload(cpf="111.111.111-11"))

    assert response.status_code == 422
    assert response.json()["detail"] == "CPF inválido"


def test_register_formatted_cpf_normalized_201(client: TestClient) -> None:
    body = _register(client, email="cpfformatado@example.com", cpf="529.982.247-25")

    # Normaliza: pontuação removida, só dígitos persistidos e devolvidos.
    assert body["user"]["cpf"] == "52998224725"
    stored = _user_with_children("cpfformatado@example.com")
    assert stored["cpf"] == "52998224725"


def test_register_duplicate_cpf_409(client: TestClient) -> None:
    _register(client)

    response = client.post(
        "/auth/register",
        json=_register_payload(email="outracpf@example.com", cpf="52998224725"),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "CPF já cadastrado"


def test_register_child_without_cpf_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json=_register_payload(children=[{"name": "Bento"}]),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O CPF da criança é obrigatório"


def test_register_child_invalid_cpf_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json=_register_payload(children=[{"name": "Bento", "cpf": "000.000.000-00"}]),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "CPF inválido"


def test_me_returns_cpf(client: TestClient) -> None:
    registered = _register(client)
    token = registered["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["user"]["cpf"] == "52998224725"


# --- CEP + consentimento LGPD ---


def test_register_family_without_lgpd_consent_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Sem Consentimento",
            "email": "semconsentimento@example.com",
            "password": "senha-segura-123",
            "family_role": "mamae",
            "cpf": "52998224725",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O consentimento LGPD é obrigatório para criar a conta"


def test_register_family_lgpd_consent_false_422(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json=_register_payload(email="consentfalso@example.com", lgpd_consent=False),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "O consentimento LGPD é obrigatório para criar a conta"


def test_register_family_lgpd_consent_true_201_records_timestamp(client: TestClient) -> None:
    body = _register(client, email="consentiu@example.com")

    stored = _user_with_children("consentiu@example.com")
    assert stored["consentido_em"] is not None
    # consentido_em é interno (registro LGPD) — nunca vai na resposta.
    assert "consentido_em" not in body["user"]


def test_register_invalid_cep_422(client: TestClient) -> None:
    for bad_cep in ["123", "123456789", "abcdefgh", "01310-1000"]:
        response = client.post("/auth/register", json=_register_payload(cep=bad_cep))

        assert response.status_code == 422
        assert response.json()["detail"] == "CEP inválido"


def test_register_formatted_cep_normalized_201(client: TestClient) -> None:
    body = _register(client, email="cepok@example.com", cep="01310-100")

    # Normaliza: pontuação removida, só dígitos persistidos e devolvidos.
    assert body["user"]["cep"] == "01310100"
    stored = _user_with_children("cepok@example.com")
    assert stored["cep"] == "01310100"


def test_register_professional_without_lgpd_consent_201(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": "Pro Sem Consentimento",
            "email": "prosemconsentimento@example.com",
            "password": "senha-segura-123",
            "role": "professional",
            "cep": "01310100",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "professional"
    # CEP é ignorado para professional (não persiste, não vaza na resposta).
    assert body["user"]["cep"] is None
    stored = _user_with_children("prosemconsentimento@example.com")
    assert stored["cep"] is None
    assert stored["consentido_em"] is None


def test_me_returns_cep_but_not_consent(client: TestClient) -> None:
    registered = _register(client, cep="01310100")
    token = registered["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["user"]["cep"] == "01310100"
    assert "consentido_em" not in response.json()["user"]
