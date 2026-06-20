"""API token 生成与校验。

本模块为本地桌面应用提供轻量级认证：
- 启动时生成一个高熵随机 token（也可通过环境变量注入）。
- 将 token 写入本地已知位置的临时文件，便于桌面端读取。
- 通过 HTTP Bearer 头校验请求。

注意：该方案仅适用于后端绑定在 127.0.0.1 的本地单用户场景。
"""
import os
import secrets
import tempfile
from pathlib import Path

from app.utils.logger import logger

_API_TOKEN: str | None = None
_TOKEN_FILE_PATH: Path | None = None


def _token_file_path() -> Path:
    """返回 token 文件路径。

    优先级：
    1. TASKFLOW_API_TOKEN_FILE 环境变量
    2. 系统临时目录下的 taskflow_api_token.txt
    """
    env_path = os.getenv("TASKFLOW_API_TOKEN_FILE")
    if env_path:
        return Path(env_path).resolve()
    return Path(tempfile.gettempdir()) / "taskflow_api_token.txt"


def generate_api_token() -> str:
    """生成新的随机 API token。"""
    return secrets.token_urlsafe(32)


def get_or_create_api_token() -> str:
    """获取当前 API token；如未初始化则生成并持久化到临时文件。"""
    global _API_TOKEN
    if _API_TOKEN is not None:
        return _API_TOKEN

    # 允许通过环境变量显式注入固定 token
    env_token = os.getenv("TASKFLOW_API_TOKEN")
    if env_token:
        _API_TOKEN = env_token
        logger.info("API token 已从 TASKFLOW_API_TOKEN 环境变量加载")
        return _API_TOKEN

    token_file = _token_file_path()
    if token_file.exists():
        try:
            _API_TOKEN = token_file.read_text(encoding="utf-8").strip()
            if _API_TOKEN:
                logger.info(f"API token 已从已有文件加载: {token_file}")
                return _API_TOKEN
        except OSError:
            pass

    _API_TOKEN = generate_api_token()
    token_file.write_text(_API_TOKEN, encoding="utf-8")
    try:
        token_file.chmod(0o600)
    except OSError:
        logger.warning(f"无法设置 token 文件权限: {token_file}")
    logger.info(f"已生成新的 API token 并写入: {token_file}")
    return _API_TOKEN


def get_api_token_file_path() -> Path:
    """返回当前使用的 token 文件路径。"""
    global _TOKEN_FILE_PATH
    if _TOKEN_FILE_PATH is None:
        _TOKEN_FILE_PATH = _token_file_path()
    return _TOKEN_FILE_PATH


def verify_api_token(token: str) -> bool:
    """校验提供的 token 是否与当前有效 token 一致。"""
    expected = get_or_create_api_token()
    if not expected:
        return False
    return secrets.compare_digest(expected, token)
