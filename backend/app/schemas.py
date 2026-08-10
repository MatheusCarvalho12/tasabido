import re
import uuid
from datetime import date
from decimal import Decimal
from enum import StrEnum
from typing import Self

import phonenumbers
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from validate_docbr import CPF


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
    conditions: list[ConditionType] = Field(default_factory=list)

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


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.FAMILY
    family_role: FamilyRole | None = None
    cpf: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    children: list[ChildRegister] = Field(default_factory=list)
    support_network: list[FamilyRole] = Field(default_factory=list)

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

    @model_validator(mode="after")
    def family_fields_required(self) -> Self:
        if self.role == UserRole.FAMILY:
            if self.family_role is None:
                raise ValueError("family_role é obrigatório para o papel family")
            if self.cpf is None:
                raise ValueError("O CPF é obrigatório para o papel family")
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


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MeResponse(BaseModel):
    user: UserOut
