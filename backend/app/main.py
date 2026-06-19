from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import files, git, plugins, tasks
from app.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    await init_db()
    yield
    # 关闭时清理资源

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

# 配置 CORS — 开发环境允许所有来源，便于前端在不同端口（Expo web 默认 8081、
# Vite 5173、Next.js 3000 等）下进行联调。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


# 注册 API 路由
app.include_router(files.router, prefix="/api/v1")
app.include_router(git.router, prefix="/api/v1")
app.include_router(plugins.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
