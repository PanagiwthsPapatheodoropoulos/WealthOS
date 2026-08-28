from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    wealthos_backend_url: str = "http://localhost:8080"
    redis_host: str = "localhost"
    redis_port: int = 6379

    class Config:
        env_file = ".env"

settings = Settings()
