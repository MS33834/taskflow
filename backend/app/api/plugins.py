"""插件管理 API"""
import hashlib
import hmac
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.plugins.manager import plugin_manager
from app.utils.logger import logger

router = APIRouter(prefix="/plugins", tags=["plugins"])


class PluginResponse(BaseModel):
    """插件响应"""
    name: str
    status: str


class LoadPluginRequest(BaseModel):
    """加载插件请求"""
    name: str
    module_path: str
    expected_hash: Optional[str] = None


def _resolve_plugin_path(module_path: str) -> Path:
    """将插件路径限制在配置白名单目录内。"""
    from app.utils.validator import _safe_join

    plugins_dir = settings.plugins_dir.resolve()
    plugins_dir.mkdir(parents=True, exist_ok=True)

    # 拒绝绝对路径：插件必须从白名单目录内按相对路径指定
    if Path(module_path).is_absolute():
        raise ValueError("插件路径不能为绝对路径，必须相对于 plugins_dir")

    target = _safe_join(plugins_dir, module_path)

    if not target.is_file():
        raise ValueError(f"插件文件不存在: {target}")

    return target


def _verify_plugin_hash(file_path: Path, expected_hash: Optional[str]) -> None:
    """校验插件文件 SHA-256 哈希。"""
    if not expected_hash:
        return

    actual_hash = hashlib.sha256(file_path.read_bytes()).hexdigest()
    if not hmac.compare_digest(actual_hash.lower(), expected_hash.strip().lower()):
        raise ValueError("插件文件 SHA-256 哈希校验失败")


@router.get("/", response_model=List[PluginResponse])
async def list_plugins():
    """获取所有已加载的插件列表"""
    plugins = plugin_manager.list_plugins()
    return [
        PluginResponse(name=name, status="loaded")
        for name in plugins
    ]


@router.post("/load")
async def load_plugin(request: LoadPluginRequest):
    """加载插件"""
    try:
        import importlib.util
        import sys

        target_path = _resolve_plugin_path(request.module_path)
        _verify_plugin_hash(target_path, request.expected_hash)

        # 动态加载模块
        spec = importlib.util.spec_from_file_location(
            request.name,
            str(target_path),
        )
        if spec is None or spec.loader is None:
            raise ValueError(f"无法加载模块: {target_path}")

        module = importlib.util.module_from_spec(spec)
        sys.modules[request.name] = module
        spec.loader.exec_module(module)

        # 加载插件
        plugin_manager.load_plugin(request.name, module)

        return {
            "status": "success",
            "message": f"插件 {request.name} 加载成功"
        }
    except Exception as e:
        logger.error(f"加载插件失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/unload/{plugin_name}")
async def unload_plugin(plugin_name: str):
    """卸载插件"""
    try:
        plugin_manager.unload_plugin(plugin_name)
        return {
            "status": "success",
            "message": f"插件 {plugin_name} 已卸载"
        }
    except Exception as e:
        logger.error(f"卸载插件失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/discover")
async def discover_plugins():
    """发现并加载所有插件"""
    try:
        plugin_manager.discover_plugins()
        plugins = plugin_manager.list_plugins()
        return {
            "status": "success",
            "message": f"发现 {len(plugins)} 个插件",
            "plugins": plugins
        }
    except Exception as e:
        logger.error(f"发现插件失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))
