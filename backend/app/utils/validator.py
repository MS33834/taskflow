"""参数校验工具"""
from pathlib import Path
from typing import Optional


class ValidationError(Exception):
    """参数校验异常"""
    pass


def validate_file_path(path: str, base_dir: Optional[Path] = None) -> Path:
    """校验文件路径合法性

    如果提供 base_dir，则要求解析后的路径必须位于 base_dir 之内，
    防止目录遍历攻击。
    """
    if not path or not path.strip():
        raise ValidationError("文件路径不能为空")

    # 检查危险字符
    dangerous_chars = ['..', '~', '$', '`', '|', '&', ';']
    for char in dangerous_chars:
        if char in path:
            raise ValidationError(f"文件路径包含非法字符: {char}")

    try:
        resolved = Path(path).resolve()
    except Exception as e:
        raise ValidationError(f"无效的文件路径: {e}")

    if base_dir is not None:
        base_resolved = base_dir.resolve()
        try:
            resolved.relative_to(base_resolved)
        except ValueError as e:
            raise ValidationError(f"文件路径超出允许范围: {e}")

    return resolved


def validate_git_url(url: str) -> str:
    """校验 Git 仓库 URL"""
    if not url or not url.strip():
        raise ValidationError("Git URL 不能为空")
    
    # 支持 HTTPS 和 SSH 格式
    https_pattern = r'^https?://[\w\-\.]+(:\d+)?/[\w\-\.]+/[\w\-\.]+(\.git)?$'
    ssh_pattern = r'^git@[\w\-\.]+:[\w\-\.]+/[\w\-\.]+(\.git)?$'
    
    import re
    if not (re.match(https_pattern, url) or re.match(ssh_pattern, url)):
        raise ValidationError(f"无效的 Git URL 格式: {url}")
    
    return url.strip()


def validate_model_config(provider: str, model: str) -> None:
    """校验大模型配置"""
    valid_providers = ['openai', 'ollama']
    if provider not in valid_providers:
        raise ValidationError(
            f"不支持的模型提供商: {provider}，支持: {valid_providers}"
        )
    
    if not model or not model.strip():
        raise ValidationError("模型名称不能为空")


def validate_category(category: Optional[str]) -> Optional[str]:
    """校验分类名称"""
    if category is None:
        return None
    
    category = category.strip()
    if len(category) > 100:
        raise ValidationError("分类名称不能超过 100 个字符")
    
    return category
