import uuid
from datetime import date
from decimal import Decimal
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


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


class ChildRegister(BaseModel):
    name: str = Field(min_length=2)
    birth_date: date | None = None
    weight_kg: Decimal | None = Field(default=None, gt=0, le=300)
    conditions: list[ConditionType] = Field(default_factory=list)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole = UserRole.FAMILY
    family_role: FamilyRole | None = None
    phone: str | None = None
    birth_date: date | None = None
    children: list[ChildRegister] = Field(default_factory=list)
    support_network: list[FamilyRole] = Field(default_factory=list)

    @model_validator(mode="after")
    def family_role_required_for_family(self) -> Self:
        if self.role == UserRole.FAMILY and self.family_role is None:
            raise ValueError("family_role é obrigatório para o papel family")
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
    phone: str | None
    birth_date: date | None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MeResponse(BaseModel):
    user: UserOut
