from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
import secrets

import jwt

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import (
    BaseModel,
    Field,
    ConfigDict,
)

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)

from pwdlib import PasswordHash

from sqlalchemy import (
    DateTime,
    Integer,
    String,
    Text,
    LargeBinary,
    create_engine,
    select,
)

from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    sessionmaker,
)


# ============================================================
# CONFIGURAÇÕES
# ============================================================

class Settings(BaseSettings):

    database_url: str = "sqlite:///./sara.db"

    jwt_secret: str

    access_token_minutes: int = 120

    public_origin: str = "http://127.0.0.1:5500"

    admin_origin: str = "http://127.0.0.1:5501"

    admin_email: str

    admin_password: str

    prayer_email: str

    prayer_password: str

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        extra="ignore"
    )


settings = Settings()


# ============================================================
# BANCO DE DADOS
# ============================================================

connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)


engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


class Base(DeclarativeBase):
    pass


# ============================================================
# USUÁRIO
# ============================================================

class User(Base):

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255)
    )

    role: Mapped[str] = mapped_column(
        String(30),
        index=True
    )


# ============================================================
# EVENTOS
# ============================================================

class Event(Base):

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    title: Mapped[str] = mapped_column(
        String(150)
    )

    description: Mapped[str] = mapped_column(
        Text()
    )

    date: Mapped[str] = mapped_column(
        String(10)
    )

    time: Mapped[str] = mapped_column(
        String(5)
    )

    featured: Mapped[bool] = mapped_column(
        default=False
    )

    active: Mapped[bool] = mapped_column(
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


# ============================================================
# PEDIDOS DE ORAÇÃO
# ============================================================

class PrayerRequest(Base):

    __tablename__ = "prayer_requests"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(120)
    )

    request: Mapped[str] = mapped_column(
        Text()
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="novo",
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )


# ============================================================
# FOTOS DO SITE
# ============================================================

class SiteImage(Base):

    __tablename__ = "site_images"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    key: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True
    )

    filename: Mapped[str] = mapped_column(
        String(255)
    )

    content_type: Mapped[str] = mapped_column(
        String(100)
    )

    data: Mapped[bytes] = mapped_column(
        LargeBinary
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )


# ============================================================
# CRIA TABELAS
# ============================================================

Base.metadata.create_all(engine)


# ============================================================
# MIGRAÇÃO DO completed_at
# ============================================================

def ensure_prayer_completed_at_column():

    if not settings.database_url.startswith("sqlite"):
        return

    from sqlalchemy import inspect, text

    inspector = inspect(engine)

    columns = {
        column["name"]
        for column in inspector.get_columns(
            "prayer_requests"
        )
    }

    if "completed_at" not in columns:

        with engine.begin() as connection:

            connection.execute(
                text(
                    "ALTER TABLE prayer_requests "
                    "ADD COLUMN completed_at DATETIME"
                )
            )


ensure_prayer_completed_at_column()


# ============================================================
# CONFIGURAÇÃO DAS FOTOS
# ============================================================

SITE_IMAGE_KEYS = {
    "sobre_nos",
    "revisao_vidas",
}


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


MAX_IMAGE_SIZE = 8 * 1024 * 1024


# ============================================================
# SENHAS
# ============================================================

password_hash = PasswordHash.recommended()


# ============================================================
# BANCO
# ============================================================

def db():

    session = SessionLocal()

    try:

        yield session

    finally:

        session.close()


# ============================================================
# CRIAR / ATUALIZAR USUÁRIOS
# ============================================================

def seed_users():

    with SessionLocal() as session:

        admin_email = (
            settings.admin_email
            .strip()
            .lower()
        )

        prayer_email = (
            settings.prayer_email
            .strip()
            .lower()
        )

        # ----------------------------------------------------
        # ADMIN
        # ----------------------------------------------------

        admin = session.scalar(
            select(User).where(
                User.email == admin_email
            )
        )

        if not admin:

            admin = User(
                email=admin_email,
                password_hash=password_hash.hash(
                    settings.admin_password
                ),
                role="admin",
            )

            session.add(admin)

        elif not password_hash.verify(
            settings.admin_password,
            admin.password_hash
        ):

            admin.password_hash = (
                password_hash.hash(
                    settings.admin_password
                )
            )

            admin.role = "admin"

        # ----------------------------------------------------
        # ORAÇÃO
        # ----------------------------------------------------

        prayer = session.scalar(
            select(User).where(
                User.email == prayer_email
            )
        )

        if not prayer:

            prayer = User(
                email=prayer_email,
                password_hash=password_hash.hash(
                    settings.prayer_password
                ),
                role="prayer",
            )

            session.add(prayer)

        elif not password_hash.verify(
            settings.prayer_password,
            prayer.password_hash
        ):

            prayer.password_hash = (
                password_hash.hash(
                    settings.prayer_password
                )
            )

            prayer.role = "prayer"

        session.commit()


seed_users()


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Sara Pirajussara API",
    docs_url="/docs",
    redoc_url=None
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.public_origin,
        settings.admin_origin,

        # Localhost
        "http://localhost:5500",
        "http://localhost:5501",

        # 127.0.0.1
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
    ],
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Content-Type",
        "X-CSRF-Token",
    ],
)


# ============================================================
# AUTENTICAÇÃO
# ============================================================

COOKIE_NAME = "sara_session"

CSRF_COOKIE = "sara_csrf"

ALGORITHM = "HS256"


# ============================================================
# MODELO DE LOGIN
# ============================================================

class LoginIn(BaseModel):

    email: str = Field(
        min_length=3,
        max_length=255
    )

    password: str = Field(
        min_length=1,
        max_length=200
    )


# ============================================================
# MODELOS DE EVENTO
# ============================================================

class EventIn(BaseModel):

    title: str = Field(
        min_length=1,
        max_length=150
    )

    description: str = Field(
        min_length=1,
        max_length=2000
    )

    date: str = Field(
        pattern=r"^\d{4}-\d{2}-\d{2}$"
    )

    time: str = Field(
        pattern=r"^\d{2}:\d{2}$"
    )

    featured: bool = False

    active: bool = True


class EventOut(EventIn):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# MODELOS DE ORAÇÃO
# ============================================================

class PrayerOut(BaseModel):

    id: int

    name: str

    request: str

    status: str

    created_at: datetime

    completed_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class PrayerIn(BaseModel):

    name: str = Field(
        min_length=1,
        max_length=120
    )

    request: str = Field(
        min_length=1,
        max_length=5000
    )


class StatusIn(BaseModel):

    status: Literal[
        "novo",
        "em_oracao",
        "concluido"
    ]


# ============================================================
# TOKEN
# ============================================================

def create_token(user: User):

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(
            minutes=settings.access_token_minutes
        ),
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=ALGORITHM
    )


# ============================================================
# USUÁRIO ATUAL
# ============================================================

def current_user(
    request: Request,
    session: Session = Depends(db)
) -> User:

    token = request.cookies.get(
        COOKIE_NAME
    )

    if not token:

        raise HTTPException(
            status_code=401,
            detail="Não autenticado"
        )

    try:

        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM]
        )

        user_id = int(
            payload["sub"]
        )

    except (
        jwt.InvalidTokenError,
        KeyError,
        ValueError
    ):

        raise HTTPException(
            status_code=401,
            detail="Sessão inválida"
        )

    user = session.get(
        User,
        user_id
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Usuário inválido"
        )

    return user


# ============================================================
# PERMISSÕES
# ============================================================

def require_role(*roles: str):

    def checker(
        user: User = Depends(current_user)
    ):

        if user.role not in roles:

            raise HTTPException(
                status_code=403,
                detail="Sem permissão para este recurso"
            )

        return user

    return checker


# ============================================================
# CSRF
# ============================================================

def csrf_check(request: Request):

    cookie = request.cookies.get(
        CSRF_COOKIE
    )

    header = request.headers.get(
        "X-CSRF-Token"
    )

    if (
        not cookie
        or not header
        or not secrets.compare_digest(
            cookie,
            header
        )
    ):

        raise HTTPException(
            status_code=403,
            detail="Proteção CSRF inválida"
        )


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {
        "ok": True
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/auth/login")
def login(
    data: LoginIn,
    response: Response,
    session: Session = Depends(db)
):

    user = session.scalar(
        select(User).where(
            User.email
            == data.email.strip().lower()
        )
    )

    if (
        not user
        or not password_hash.verify(
            data.password,
            user.password_hash
        )
    ):

        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos"
        )

    token = create_token(user)

    csrf = secrets.token_urlsafe(32)

    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=(
            settings.access_token_minutes * 60
        ),
        path="/"
    )

    response.set_cookie(
        CSRF_COOKIE,
        csrf,
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=(
            settings.access_token_minutes * 60
        ),
        path="/"
    )

    return {
        "user": {
            "email": user.email,
            "role": user.role
        }
    }


# ============================================================
# LOGOUT
# ============================================================

@app.post("/api/auth/logout")
def logout(
    response: Response,
    user: User = Depends(current_user)
):

    response.delete_cookie(
        COOKIE_NAME,
        path="/"
    )

    response.delete_cookie(
        CSRF_COOKIE,
        path="/"
    )

    return {
        "ok": True
    }


# ============================================================
# USUÁRIO LOGADO
# ============================================================

@app.get("/api/auth/me")
def me(
    user: User = Depends(current_user)
):

    return {
        "email": user.email,
        "role": user.role
    }


# ============================================================
# EVENTOS PÚBLICOS
# ============================================================

@app.get(
    "/api/events",
    response_model=list[EventOut]
)
def list_public_events(
    session: Session = Depends(db)
):

    return list(
        session.scalars(
            select(Event)
            .where(
                Event.active == True
            )
            .order_by(
                Event.date,
                Event.time,
                Event.id
            )
        )
    )


# ============================================================
# EVENTOS ADMIN
# ============================================================

@app.get(
    "/api/admin/events",
    response_model=list[EventOut]
)
def list_admin_events(
    user: User = Depends(
        require_role(
            "admin",
            "prayer"
        )
    ),
    session: Session = Depends(db)
):

    return list(
        session.scalars(
            select(Event)
            .order_by(
                Event.date.desc(),
                Event.time.desc(),
                Event.id.desc()
            )
        )
    )


# ============================================================
# CRIAR EVENTO
# ============================================================

@app.post(
    "/api/admin/events",
    response_model=EventOut,
    status_code=201
)
def create_event(
    data: EventIn,
    request: Request,
    user: User = Depends(
        require_role(
            "admin",
            "prayer"
        )
    ),
    session: Session = Depends(db)
):

    csrf_check(request)

    event = Event(
        **data.model_dump()
    )

    session.add(event)

    session.commit()

    session.refresh(event)

    return event


# ============================================================
# EDITAR EVENTO
# ============================================================

@app.put(
    "/api/admin/events/{event_id}",
    response_model=EventOut
)
def update_event(
    event_id: int,
    data: EventIn,
    request: Request,
    user: User = Depends(
        require_role(
            "admin",
            "prayer"
        )
    ),
    session: Session = Depends(db)
):

    csrf_check(request)

    event = session.get(
        Event,
        event_id
    )

    if not event:

        raise HTTPException(
            status_code=404,
            detail="Evento não encontrado"
        )

    for key, value in data.model_dump().items():

        setattr(
            event,
            key,
            value
        )

    session.commit()

    session.refresh(event)

    return event


# ============================================================
# EXCLUIR EVENTO
# ============================================================

@app.delete(
    "/api/admin/events/{event_id}"
)
def delete_event(
    event_id: int,
    request: Request,
    user: User = Depends(
        require_role(
            "admin",
            "prayer"
        )
    ),
    session: Session = Depends(db)
):

    csrf_check(request)

    event = session.get(
        Event,
        event_id
    )

    if not event:

        raise HTTPException(
            status_code=404,
            detail="Evento não encontrado"
        )

    session.delete(event)

    session.commit()

    return {
        "ok": True
    }


# ============================================================
# CRIAR PEDIDO DE ORAÇÃO
# ============================================================

@app.post(
    "/api/prayer-requests",
    status_code=201
)
def create_prayer(
    data: PrayerIn,
    session: Session = Depends(db)
):

    item = PrayerRequest(
        name=data.name.strip(),
        request=data.request.strip()
    )

    session.add(item)

    session.commit()

    return {
        "message": "Pedido enviado com sucesso."
    }


# ============================================================
# EXCLUIR PEDIDOS CONCLUÍDOS HÁ 10 MINUTOS
# ============================================================

def delete_completed_prayers(
    session: Session
):

    now = datetime.now(
        timezone.utc
    )

    limit = now - timedelta(
        minutes=10
    )

    expired_items = list(
        session.scalars(
            select(
                PrayerRequest
            ).where(
                PrayerRequest.status
                == "concluido",

                PrayerRequest.completed_at.is_not(None),

                PrayerRequest.completed_at
                <= limit
            )
        )
    )

    for item in expired_items:

        session.delete(item)

    if expired_items:

        session.commit()


# ============================================================
# LISTAR PEDIDOS
# ============================================================

@app.get(
    "/api/prayer-requests",
    response_model=list[PrayerOut]
)
def list_prayers(
    user: User = Depends(
        require_role("prayer")
    ),
    session: Session = Depends(db)
):

    delete_completed_prayers(
        session
    )

    return list(
        session.scalars(
            select(
                PrayerRequest
            ).order_by(
                PrayerRequest.created_at.desc()
            )
        )
    )


# ============================================================
# ALTERAR STATUS DA ORAÇÃO
# ============================================================

@app.put(
    "/api/prayer-requests/{request_id}/status"
)
def update_prayer_status(
    request_id: int,
    data: StatusIn,
    request: Request,
    user: User = Depends(
        require_role("prayer")
    ),
    session: Session = Depends(db)
):

    csrf_check(request)

    item = session.get(
        PrayerRequest,
        request_id
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Pedido não encontrado"
        )

    item.status = data.status

    if data.status == "concluido":

        if item.completed_at is None:

            item.completed_at = (
                datetime.now(timezone.utc)
            )

    else:

        item.completed_at = None

    session.commit()

    return {
        "ok": True
    }


# ============================================================
# EXCLUIR PEDIDO MANUALMENTE
# ============================================================

@app.delete(
    "/api/prayer-requests/{request_id}"
)
def delete_prayer(
    request_id: int,
    request: Request,
    user: User = Depends(
        require_role("prayer")
    ),
    session: Session = Depends(db)
):

    csrf_check(request)

    item = session.get(
        PrayerRequest,
        request_id
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Pedido não encontrado"
        )

    session.delete(item)

    session.commit()

    return {
        "ok": True
    }


# ============================================================
# FOTOS DO SITE
# ============================================================

@app.get(
    "/api/site-images/{image_key}"
)
def get_site_image(
    image_key: str,
    session: Session = Depends(db)
):

    if image_key not in SITE_IMAGE_KEYS:

        raise HTTPException(
            status_code=404,
            detail="Imagem não encontrada"
        )

    item = session.scalar(
        select(SiteImage).where(
            SiteImage.key == image_key
        )
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Imagem ainda não cadastrada"
        )

    return Response(
        content=item.data,
        media_type=item.content_type,
        headers={
            "Cache-Control":
            "no-cache, no-store, must-revalidate"
        }
    )


# ============================================================
# LISTAR FOTOS PARA O ADMIN
# ============================================================

@app.get(
    "/api/admin/site-images"
)
def list_site_images(
    user: User = Depends(
        require_role("admin")
    ),
    session: Session = Depends(db)
):

    rows = session.scalars(
        select(SiteImage)
    ).all()

    by_key = {
        row.key: row
        for row in rows
    }

    result = {}

    for key in sorted(
        SITE_IMAGE_KEYS
    ):

        result[key] = {
            "exists": (
                key in by_key
            ),

            "url": (
                f"/api/site-images/{key}"
            ),

            "filename": (
                by_key[key].filename
                if key in by_key
                else None
            ),

            "content_type": (
                by_key[key].content_type
                if key in by_key
                else None
            )
        }

    return result


# ============================================================
# ENVIAR / ALTERAR FOTO
# ============================================================

@app.post(
    "/api/admin/site-images/{image_key}"
)
async def upload_site_image(
    image_key: str,
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(
        require_role("admin")
    ),
    session: Session = Depends(db)
):

    csrf_check(request)

    if image_key not in SITE_IMAGE_KEYS:

        raise HTTPException(
            status_code=404,
            detail="Imagem não encontrada"
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Formato inválido. "
                "Use JPG, PNG ou WEBP."
            )
        )

    data = await file.read()

    if not data:

        raise HTTPException(
            status_code=400,
            detail="O arquivo está vazio."
        )

    if len(data) > MAX_IMAGE_SIZE:

        raise HTTPException(
            status_code=413,
            detail=(
                "A imagem pode ter "
                "no máximo 8 MB."
            )
        )

    existing = session.scalar(
        select(SiteImage).where(
            SiteImage.key == image_key
        )
    )

    if existing:

        existing.filename = (
            file.filename
            or "imagem"
        )

        existing.content_type = (
            file.content_type
        )

        existing.data = data

        existing.updated_at = (
            datetime.now(timezone.utc)
        )

    else:

        new_image = SiteImage(
            key=image_key,

            filename=(
                file.filename
                or "imagem"
            ),

            content_type=(
                file.content_type
            ),

            data=data,

            updated_at=(
                datetime.now(timezone.utc)
            )
        )

        session.add(new_image)

    session.commit()

    return {
        "ok": True,

        "key": image_key,

        "url": (
            f"/api/site-images/{image_key}"
        )
    }


# ============================================================
# EXCLUIR FOTO
# ============================================================

@app.delete(
    "/api/admin/site-images/{image_key}"
)
def delete_site_image(
    image_key: str,
    request: Request,
    user: User = Depends(
        require_role("admin")
    ),
    session: Session = Depends(db)
):

    # Verifica CSRF
    csrf_check(request)

    # Verifica a chave
    if image_key not in SITE_IMAGE_KEYS:

        raise HTTPException(
            status_code=404,
            detail="Imagem não encontrada"
        )

    # Procura a imagem
    existing = session.scalar(
        select(SiteImage).where(
            SiteImage.key == image_key
        )
    )

    if not existing:

        raise HTTPException(
            status_code=404,
            detail="Esta imagem não está cadastrada."
        )

    # Exclui a imagem
    session.delete(existing)

    session.commit()

    return {
        "ok": True,

        "message": (
            "Imagem excluída com sucesso."
        ),

        "key": image_key
    }
