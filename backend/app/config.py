import os
from typing import Optional
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Root is C:\dev\conference-graph
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = PROJECT_ROOT / ".env"

if ENV_PATH.is_file():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "Conference Graph Explorer"
    ENV: str = Field(default_factory=lambda: os.getenv("ENV", "development"))

    # Oracle Primary
    ORACLE_USER: str = Field(default_factory=lambda: os.getenv("ORACLE_USER", "academic"))
    ORACLE_PASSWORD: str = Field(default_factory=lambda: os.getenv("ORACLE_PASSWORD", ""))
    ORACLE_DSN: str = Field(default_factory=lambda: os.getenv("ORACLE_DSN", "localhost:1521/FREEPDB1"))

    # Neo4j Primary
    NEO4J_URI: str = Field(default_factory=lambda: os.getenv("NEO4J_URI", "bolt://127.0.0.1:7687"))
    NEO4J_USER: str = Field(default_factory=lambda: os.getenv("NEO4J_USER", "neo4j"))
    NEO4J_PASSWORD: str = Field(default_factory=lambda: os.getenv("NEO4J_PASSWORD", ""))
    NEO4J_DATABASE: str = Field(default_factory=lambda: os.getenv("NEO4J_DATABASE", "neo4j"))

    # Admin & Web
    ADMIN_TOKEN: str = Field(default_factory=lambda: os.getenv("ADMIN_TOKEN", ""))
    ALLOWED_ORIGIN: str = Field(default_factory=lambda: os.getenv("ALLOWED_ORIGIN", "http://localhost:5173"))
    ALLOWED_ORIGIN_REGEX: Optional[str] = Field(default_factory=lambda: os.getenv("ALLOWED_ORIGIN_REGEX", None))
    BACKEND_HOST: str = Field(default_factory=lambda: os.getenv("HOST", os.getenv("BACKEND_HOST", "0.0.0.0")))
    BACKEND_PORT: int = Field(default_factory=lambda: int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8000"))))

    # Scale database targets
    ORACLE_SCALE_USER: str = Field(default_factory=lambda: os.getenv("ORACLE_SCALE_USER", "academic_scale"))
    ORACLE_SCALE_PASSWORD: str = Field(default_factory=lambda: os.getenv("ORACLE_SCALE_PASSWORD", ""))
    NEO4J_SCALE_DATABASE: str = Field(default_factory=lambda: os.getenv("NEO4J_SCALE_DATABASE", "scale"))

    # Data directory
    DATA_DIR: Path = Field(default_factory=lambda: (PROJECT_ROOT / os.getenv("DATA_DIR", "./data")).resolve())


settings = Settings()
