import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Self

import phonenumbers
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)
from validate_docbr import CNPJ, CPF


class UserRole(StrEnum):
    FAMILY = "family"
    PROFESSIONAL = "professional"


class FamilyRole(StrEnum):
    MAMAE = "mamae"
    PAPAI = "papai"
    VOVO = "vovo"
    VOVO_M = "vovo-m"
    RESPONSAVEL = "responsavel"
    OUTRO = "outro"


class ConditionType(StrEnum):
    TEA = "tea"
    TDAH = "tdah"
    DISLEXIA = "dislexia"
    TOD = "tod"
    ATRASO_FALA = "atraso_fala"
    OUTRA = "outra"


class ProfessionType(StrEnum):
    PSICOLOGO = "psicologo"
    PSIQUIATRA = "psiquiatra"
    TERAPEUTA_OCUPACIONAL = "terapeuta_ocupacional"
    FONOAUDIOLOGO = "fonoaudiologo"
    PEDIATRA = "pediatra"
    NEUROPEDIATRA = "neuropediatra"
    PSICOPEDAGOGO = "psicopedagogo"
    OUTRO = "outro"


class CouncilType(StrEnum):
    CRM = "crm"
    CRP = "crp"
    CREFITO = "crefito"
    CRFA = "crfa"
    CRO = "cro"
    OUTRO = "outro"


class SpecialtyType(StrEnum):
    TEA = "tea"
    TDAH = "tdah"
    DISLEXIA = "dislexia"
    TOD = "tod"
    ATRASO_FALA = "atraso_fala"
    OUTRA = "outra"


class AgeGroup(StrEnum):
    ZERO_TRES = "0-3"
    QUATRO_SEIS = "4-6"
    SETE_DEZ = "7-10"
    ONZE_QUATORZE = "11-14"
    QUINZE_MAIS = "15+"


class ServiceMode(StrEnum):
    PRESENCIAL = "presencial"
    ONLINE = "online"


# Contrato único com o front: só letras (acentos ok) e espaços, mínimo 2 caracteres.
_NAME_PATTERN = re.compile(r"^[^\W\d_]+(?:\s+[^\W\d_]+)*$")
# Mínimo 8 caracteres com pelo menos uma letra e um número (sem exigir símbolo/maiúscula).
_PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")
_MAX_AGE_YEARS = 120


def _validate_name(value: str, too_short_message: str) -> str:
    name = value.strip()
    if len(name) < 2:
        raise ValueError(too_short_message)
    if _NAME_PATTERN.fullmatch(name) is None:
        raise ValueError("O nome só pode conter letras e espaços")
    return value


def _validate_password(value: str) -> str:
    if _PASSWORD_PATTERN.fullmatch(value) is None:
        raise ValueError("A senha precisa ter pelo menos 8 caracteres, com letra e número")
    return value


def _validate_phone(value: str) -> str:
    try:
        parsed = phonenumbers.parse(value, "BR")
    except phonenumbers.NumberParseException:
        raise ValueError("Telefone inválido") from None
    if not phonenumbers.is_valid_number(parsed):
        raise ValueError("Telefone inválido")
    return value


# Só dígitos ("123.456.789-09" e "12345678909" viram "12345678909").
def _validate_cpf(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if not CPF().validate(digits):
        raise ValueError("CPF inválido")
    return digits


# Só dígitos ("01310-100" e "01310100" viram "01310100"); exatamente 8 dígitos.
def _validate_cep(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 8:
        raise ValueError("CEP inválido")
    return digits


# Só dígitos ("11.222.333/0001-81" e "11222333000181" viram "11222333000181");
# dígitos verificadores validados com validate-docbr.
def _validate_cnpj(value: str | None) -> str | None:
    if value is None:
        return None
    digits = re.sub(r"\D", "", value)
    if not CNPJ().validate(digits):
        raise ValueError("CNPJ inválido")
    return digits


# 27 UFs brasileiras (siglas oficiais do IBGE).
_BRAZILIAN_UFS = frozenset(
    {
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RO",
        "RR",
        "RS",
        "SC",
        "SP",
        "SE",
        "TO",
    }
)


# Região numérica dos conselhos regionais (CRP 01–23, CREFITO 1–21, CRFa 1–9):
# 1 ou 2 dígitos; o intervalo válido depende do conselho.
_REGION_NUMBER_PATTERN = re.compile(r"^\d{1,2}$")
# Número do registro por conselho — padrões idênticos aos do front.
_NUMBER_PATTERNS: dict[CouncilType, re.Pattern[str]] = {
    CouncilType.CRM: re.compile(r"^\d{4,7}$"),
    CouncilType.CRP: re.compile(r"^\d{4,6}$"),
    CouncilType.CREFITO: re.compile(r"^\d{4,6}(?:-(?:F|TO))?$"),
    CouncilType.CRFA: re.compile(r"^(?:\d{4,6}|\d{1,2}-\d{4,6})$"),
    CouncilType.CRO: re.compile(r"^\d{4,6}$"),
    CouncilType.OUTRO: re.compile(r"^\d{4,10}$"),
}
# Erro amigável em pt-BR citando o conselho (mesma regra do front).
_COUNCIL_NUMBER_ERRORS: dict[CouncilType, str] = {
    CouncilType.CRM: "Número do CRM inválido — use de 4 a 7 dígitos (ex.: 1234567)",
    CouncilType.CRP: "Número do CRP inválido — use de 4 a 6 dígitos (ex.: 12345)",
    CouncilType.CREFITO: (
        "Número do CREFITO inválido — use de 4 a 6 dígitos, com sufixo opcional -F ou -TO "
        "(ex.: 123456-F)"
    ),
    CouncilType.CRFA: (
        "Número do CRFa inválido — use 4 a 6 dígitos ou o formato região-número (ex.: 2-12345)"
    ),
    CouncilType.CRO: "Número do CRO inválido — use de 4 a 6 dígitos (ex.: 12345)",
    CouncilType.OUTRO: "Número do conselho inválido — use de 4 a 10 dígitos",
}


def _validate_council_region(value: str | None, council_type: CouncilType | None) -> str | None:
    """Região do conselho conforme o conselho: UF (crm/cro/outro) ou número (crp/crefito/crfa)."""
    if value is None or council_type is None:
        return value
    region = value.strip().upper()
    if council_type in (CouncilType.CRM, CouncilType.CRO, CouncilType.OUTRO):
        if region not in _BRAZILIAN_UFS:
            raise ValueError("Região do conselho inválida — informe uma UF válida (ex.: SP)")
        return region
    if council_type is CouncilType.CRP:
        if _REGION_NUMBER_PATTERN.fullmatch(region) is None or not 1 <= int(region) <= 23:
            raise ValueError("Região do CRP inválida — informe um número entre 01 e 23")
        # Normaliza "1" → "01" (padrão oficial do CRP).
        return region.zfill(2)
    if council_type is CouncilType.CREFITO:
        if _REGION_NUMBER_PATTERN.fullmatch(region) is None or not 1 <= int(region) <= 21:
            raise ValueError("Região do CREFITO inválida — informe um número entre 1 e 21")
        return region
    if _REGION_NUMBER_PATTERN.fullmatch(region) is None or not 1 <= int(region) <= 9:
        raise ValueError("Região do CRFa inválida — informe um número entre 1 e 9")
    return region


def _validate_council_number(value: str | None, council_type: CouncilType | None) -> str | None:
    """Número do registro conforme o conselho (padrões idênticos aos do front)."""
    if value is None or council_type is None:
        return value
    number = value.strip()
    if _NUMBER_PATTERNS[council_type].fullmatch(number) is None:
        raise ValueError(_COUNCIL_NUMBER_ERRORS[council_type])
    return number


# Tag custom (condição/especialidade): letras (acentos ok), espaços e hífen;
# 3 a 40 caracteres após trim.
_TAG_PATTERN = re.compile(r"^[^\W\d_]+(?:[\s-]+[^\W\d_]+)*$")
_MAX_TAGS = 15
_KNOWN_CONDITIONS = frozenset(condition.value for condition in ConditionType)
_KNOWN_SPECIALTIES = frozenset(specialty.value for specialty in SpecialtyType)


def _validate_tag(value: str, known: frozenset[str], label: str) -> str:
    """Enum conhecido passa direto (trim); senão exige texto custom válido."""
    tag = value.strip()
    if tag in known:
        return tag
    if len(tag) < 3 or len(tag) > 40 or _TAG_PATTERN.fullmatch(tag) is None:
        raise ValueError(f"{label} inválida: {tag}")
    return tag


def _validate_condition(value: str) -> str:
    return _validate_tag(value, _KNOWN_CONDITIONS, "Condição")


def _validate_specialty(value: str) -> str:
    return _validate_tag(value, _KNOWN_SPECIALTIES, "Especialidade")


ConditionValue = Annotated[str, AfterValidator(_validate_condition)]
SpecialtyValue = Annotated[str, AfterValidator(_validate_specialty)]


def _validate_tag_count(value: list[str], label: str) -> list[str]:
    if len(value) > _MAX_TAGS:
        raise ValueError(f"No máximo {_MAX_TAGS} {label}")
    return value


def _validate_birth_date(value: date) -> date:
    today = date.today()
    if value > today:
        raise ValueError("A data de nascimento não pode estar no futuro")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age > _MAX_AGE_YEARS:
        raise ValueError("A data de nascimento indica mais de 120 anos")
    return value


class ChildRegister(BaseModel):
    name: str
    cpf: str
    birth_date: date | None = None
    weight_kg: Decimal | None = Field(default=None, gt=0, le=300)
    conditions: list[ConditionValue] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def _name_valid(cls, value: str) -> str:
        return _validate_name(value, "O nome da criança precisa ter pelo menos 2 letras")

    @field_validator("cpf")
    @classmethod
    def _cpf_valid(cls, value: str) -> str:
        return _validate_cpf(value)

    @field_validator("birth_date")
    @classmethod
    def _birth_date_valid(cls, value: date | None) -> date | None:
        return _validate_birth_date(value) if value is not None else None

    @field_validator("conditions")
    @classmethod
    def _conditions_count_valid(cls, value: list[str]) -> list[str]:
        return _validate_tag_count(value, "condições por criança")


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.FAMILY
    family_role: FamilyRole | None = None
    cpf: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    cep: str | None = None
    lgpd_consent: bool | None = None
    children: list[ChildRegister] = Field(default_factory=list)
    support_network: list[FamilyRole] = Field(default_factory=list)
    profession: ProfessionType | None = None
    council_type: CouncilType | None = None
    council_number: str | None = None
    council_region: str | None = None
    cnpj: str | None = None
    specialties: list[SpecialtyValue] = Field(default_factory=list)
    age_groups: list[AgeGroup] = Field(default_factory=list)
    service_modes: list[ServiceMode] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def _name_valid(cls, value: str) -> str:
        return _validate_name(value, "O nome precisa ter pelo menos 2 letras")

    @field_validator("password")
    @classmethod
    def _password_valid(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("phone")
    @classmethod
    def _phone_valid(cls, value: str | None) -> str | None:
        return _validate_phone(value) if value is not None else None

    @field_validator("cpf")
    @classmethod
    def _cpf_valid(cls, value: str | None) -> str | None:
        return _validate_cpf(value) if value is not None else None

    @field_validator("birth_date")
    @classmethod
    def _birth_date_valid(cls, value: date | None) -> date | None:
        return _validate_birth_date(value) if value is not None else None

    @field_validator("cep")
    @classmethod
    def _cep_valid(cls, value: str | None) -> str | None:
        return _validate_cep(value) if value is not None else None

    @field_validator("cnpj")
    @classmethod
    def _cnpj_valid(cls, value: str | None) -> str | None:
        return _validate_cnpj(value)

    @field_validator("specialties")
    @classmethod
    def _specialties_count_valid(cls, value: list[str]) -> list[str]:
        return _validate_tag_count(value, "especialidades")

    @model_validator(mode="after")
    def council_format_valid(self) -> Self:
        # Valida número e região conforme o conselho escolhido (None quando o
        # papel não usa conselho — a obrigatoriedade é do professional_fields_required).
        self.council_number = _validate_council_number(self.council_number, self.council_type)
        self.council_region = _validate_council_region(self.council_region, self.council_type)
        return self

    @model_validator(mode="after")
    def family_fields_required(self) -> Self:
        if self.role == UserRole.FAMILY:
            if self.family_role is None:
                raise ValueError("family_role é obrigatório para o papel family")
            if self.cpf is None:
                raise ValueError("O CPF é obrigatório para o papel family")
            if self.lgpd_consent is not True:
                raise ValueError("O consentimento LGPD é obrigatório para criar a conta")
        return self

    @model_validator(mode="after")
    def professional_fields_required(self) -> Self:
        if self.role == UserRole.PROFESSIONAL:
            if self.profession is None:
                raise ValueError("A profissão é obrigatória para o papel professional")
            if self.council_type is None:
                raise ValueError("O conselho é obrigatório para o papel professional")
            if self.council_number is None:
                raise ValueError("O número do conselho é obrigatório para o papel professional")
            if self.council_region is None:
                raise ValueError("A região do conselho é obrigatória para o papel professional")
            if self.cpf is None:
                raise ValueError("O CPF é obrigatório para o papel professional")
            if self.lgpd_consent is not True:
                raise ValueError("O consentimento LGPD é obrigatório para criar a conta")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str
    family_role: str | None
    cpf: str | None
    phone: str | None
    birth_date: date | None
    cep: str | None
    profession: str | None
    council_type: str | None
    council_number: str | None
    council_region: str | None
    cnpj: str | None
    specialties: list[str]
    age_groups: list[str]
    service_modes: list[str]


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MeResponse(BaseModel):
    user: UserOut


# ── Modo criança: jogos ────────────────────────────────────────────────────────


class GameVisibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"


class GameStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


# Cor no formato #RRGGBB (hex), igual ao contrato com o front. Normaliza para
# maiúsculas para o valor canônico ficar estável no banco.
_COR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")
_MAX_CORES = 10
_MAX_TEXTO_JOGO = 5000


def _validate_cor(value: str) -> str:
    cor = value.strip().upper()
    if _COR_PATTERN.fullmatch(cor) is None:
        raise ValueError("Cor inválida — use o formato #RRGGBB (ex.: #08ADAE)")
    return cor


ColorValue = Annotated[str, AfterValidator(_validate_cor)]


def _validate_titulo(value: str) -> str:
    titulo = value.strip()
    if len(titulo) < 2:
        raise ValueError("O título do jogo precisa ter pelo menos 2 caracteres")
    if len(titulo) > 200:
        raise ValueError("O título do jogo pode ter no máximo 200 caracteres")
    return titulo


def _validate_texto_jogo(value: str, label: str) -> str:
    texto = value.strip()
    if not texto:
        raise ValueError(f"{label} é obrigatória")
    if len(texto) > _MAX_TEXTO_JOGO:
        raise ValueError(f"{label} pode ter no máximo {_MAX_TEXTO_JOGO} caracteres")
    return texto


def _validate_categoria(value: str) -> str:
    categoria = value.strip()
    if not categoria:
        raise ValueError("A categoria é obrigatória")
    if len(categoria) > 50:
        raise ValueError("A categoria pode ter no máximo 50 caracteres")
    return categoria


class GameCreate(BaseModel):
    titulo: str
    descricao: str
    tutorial: str
    categoria: str
    visibilidade: GameVisibility = GameVisibility.PUBLIC
    cores: list[ColorValue] = Field(default_factory=list, max_length=_MAX_CORES)

    @field_validator("titulo")
    @classmethod
    def _titulo_valid(cls, value: str) -> str:
        return _validate_titulo(value)

    @field_validator("descricao")
    @classmethod
    def _descricao_valid(cls, value: str) -> str:
        return _validate_texto_jogo(value, "A descrição")

    @field_validator("tutorial")
    @classmethod
    def _tutorial_valid(cls, value: str) -> str:
        return _validate_texto_jogo(value, "O tutorial")

    @field_validator("categoria")
    @classmethod
    def _categoria_valid(cls, value: str) -> str:
        return _validate_categoria(value)


class GameUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    tutorial: str | None = None
    categoria: str | None = None
    visibilidade: GameVisibility | None = None
    status: GameStatus | None = None
    cores: list[ColorValue] | None = Field(default=None, max_length=_MAX_CORES)

    @field_validator("titulo")
    @classmethod
    def _titulo_valid(cls, value: str | None) -> str | None:
        return _validate_titulo(value) if value is not None else None

    @field_validator("descricao")
    @classmethod
    def _descricao_valid(cls, value: str | None) -> str | None:
        return _validate_texto_jogo(value, "A descrição") if value is not None else None

    @field_validator("tutorial")
    @classmethod
    def _tutorial_valid(cls, value: str | None) -> str | None:
        return _validate_texto_jogo(value, "O tutorial") if value is not None else None

    @field_validator("categoria")
    @classmethod
    def _categoria_valid(cls, value: str | None) -> str | None:
        return _validate_categoria(value) if value is not None else None


# ── Modo criança: contrato do front (frontend/src/types/game.ts) ──────────────


class GameStats(BaseModel):
    partidas: int = 0
    tempo_medio_min: int = 0
    score_medio: int = 0


class GameOut(BaseModel):
    id: int
    slug: str
    titulo: str
    descricao: str
    tutorial: str
    categoria: str
    visibilidade: str
    status: str
    svg_url: str | None
    cores: list[str]
    stats: GameStats


class GameListResponse(BaseModel):
    items: list[GameOut]


class AssignmentOut(GameOut):
    # Id da TAREFA (game_assignments.id), não do jogo: é o que o DELETE
    # /api/assignments/{id} espera. O front (types/game.ts) ainda não consome;
    # a integração T8 pode tipar quando precisar.
    assignment_id: int
    # Presente apenas em GET /api/children/{child_id}/assignments.
    atribuido_em: datetime


class AssignmentListResponse(BaseModel):
    items: list[AssignmentOut]


class AssignmentCreate(BaseModel):
    child_id: uuid.UUID
    game_id: int


class GameRunCreate(BaseModel):
    game_id: int
    child_id: uuid.UUID
    score: int = Field(ge=0, le=100)
    duration_seconds: int = Field(ge=0)


class GameRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    child_id: uuid.UUID
    score: int
    duration_seconds: int
    created_at: datetime


class PinRequest(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def _pin_has_six_digits(cls, value: str) -> str:
        if re.fullmatch(r"\d{6}", value) is None:
            raise ValueError("O PIN precisa ter exatamente 6 dígitos")
        return value


class PinValidateResponse(BaseModel):
    valido: bool


class PinSetResponse(BaseModel):
    ok: bool


class ChildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class ChildrenListResponse(BaseModel):
    items: list[ChildOut]


class SvgUploadResponse(BaseModel):
    svg_url: str
