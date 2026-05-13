import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "sybilpass_changeme"
    OUTPUT_DIR: str = "/app/output"
    PORT: int = 8000  # Render injects PORT env var

    class Config:
        env_file = ".env"

settings = Settings()
