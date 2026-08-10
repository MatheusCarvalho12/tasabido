from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://tasabido:tasabido@localhost:5432/tasabido"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 7


# jwt_secret é obrigatório e vem do .env (ou da env); type: ignore porque o
# pydantic-settings popula campos em runtime, o que o mypy não enxerga.
settings = Settings()  # type: ignore[call-arg]
