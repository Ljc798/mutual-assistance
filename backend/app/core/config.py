from pydantic_settings import BaseSettings
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str
    DB_USERNAME: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_NAME: str
    admin_username: str
    admin_password: str

    class Config:
        env_file = ".env"

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}/{self.DB_NAME}"
settings = Settings()