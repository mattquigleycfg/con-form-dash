from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    ml_api_key: str = ""
    odoo_url: str = ""
    odoo_username: str = ""
    odoo_password: str = ""
    odoo_db: str = "con-formgroup-main-10348162"

    model_retrain_interval_hours: int = 24
    min_training_samples: int = 20
    prediction_cache_ttl_minutes: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
