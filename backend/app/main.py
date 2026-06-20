from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import files, git, plugins, tasks
from app.api.deps import get_current_user
from app.config import settings
from app.core.security import get_api_token_file_path, get_or_create_api_token
from app.database import init_db
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库并确保 API token 已生成
    await init_db()
    token = get_or_create_api_token()
    token_file = get_api_token_file_path()
    logger.info(
        f"TaskFlow backend started on {settings.api_host}:{settings.api_port}"
    )
    if settings.api_token_file is not None:
        logger.info(f"API token file: {token_file}")
    else:
        logger.info(
            "API token is kept in memory. Pass it to clients via API_TOKEN env var."
        )
    logger.info(f"Health check: http://{settings.api_host}:{settings.api_port}/health")
    _ = token
    yield
    # 关闭时清理资源

# 生产环境默认关闭交互式 API 文档，可通过 ENABLE_DOCS=true 临时开启
docs_enabled = settings.debug or settings.enable_docs
docs_url = "/docs" if docs_enabled else None
redoc_url = "/redoc" if docs_enabled else None
openapi_url = "/openapi.json" if docs_enabled else None

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# 配置 CORS：从环境变量读取允许来源，生产环境禁止 "*" 与 allow_credentials 同时启用
_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
allow_credentials = True
if "*" in _origins and not settings.debug:
    allow_credentials = False
    logger.warning(
        "CORS 配置包含通配符且未启用 DEBUG，已自动禁用 allow_credentials"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# 注册 API 路由，所有 /api/v1/* 端点都需要认证
app.include_router(
    files.router, prefix="/api/v1", dependencies=[Depends(get_current_user)]
)
app.include_router(
    git.router, prefix="/api/v1", dependencies=[Depends(get_current_user)]
)
app.include_router(
    plugins.router, prefix="/api/v1", dependencies=[Depends(get_current_user)]
)
app.include_router(
    tasks.router, prefix="/api/v1", dependencies=[Depends(get_current_user)]
)
