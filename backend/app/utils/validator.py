"""参数校验工具"""
import ipaddress
import os
import re
import socket
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse


class ValidationError(Exception):
    """参数校验异常"""
    pass


def _safe_join(base_dir: Path, subpath: str) -> Path:
    """将受校验的子路径安全地拼接到 base_dir 下。

    先对子路径做规范化（os.path.normpath），再通过与 base_dir 的绝对路径
    做 startswith 前缀校验，确保结果一定位于 base_dir 之内。该写法与
    CodeQL 内置的 path-injection 清洗模型（PathNormalization +
    SafeAccessCheck）对齐，可被静态分析识别为安全的数据流。
    """
    if not subpath or not subpath.strip():
        raise ValidationError("子路径不能为空")
    if "\x00" in subpath:
        raise ValidationError("子路径包含空字符")

    base = os.path.abspath(str(base_dir))
    normalized = os.path.normpath(subpath)

    # 禁止向上逃逸的相对路径
    if normalized.startswith("..") or "/../" in (normalized + os.sep):
        raise ValidationError(f"子路径超出允许范围: {subpath}")

    full = os.path.join(base, normalized)

    # startswith 前缀校验是 CodeQL 认可的 SafeAccessCheck 清洗点
    if not (full == base or full.startswith(base + os.sep)):
        raise ValidationError(f"文件路径超出允许范围: {subpath}")

    return Path(full)


def validate_file_path(path: str, base_dir: Optional[Path] = None) -> Path:
    """校验文件路径合法性

    如果提供 base_dir，则要求解析后的路径必须位于 base_dir 之内，
    防止目录遍历攻击。
    """
    if not path or not path.strip():
        raise ValidationError("文件路径不能为空")

    if "\x00" in path:
        raise ValidationError("文件路径包含空字符")

    # 检查危险字符
    dangerous_chars = ["..", "~", "$", "`", "|", "&", ";"]
    for char in dangerous_chars:
        if char in path:
            raise ValidationError(f"文件路径包含非法字符: {char}")

    try:
        # 使用 os.path.normpath 进行路径规范化，该函数被 CodeQL 识别为
        # PathNormalization，可与后续 startswith 前缀校验组成完整清洗链。
        normalized = os.path.normpath(path)
    except Exception as e:
        raise ValidationError(f"无效的文件路径: {e}")

    if base_dir is not None:
        return _safe_join(base_dir, normalized)

    # 无 base_dir 限制时，仍禁止向上逃逸并转为绝对路径
    if normalized.startswith("..") or "/../" in (normalized + os.sep):
        raise ValidationError(f"文件路径超出允许范围: {path}")

    return Path(os.path.abspath(normalized))


def is_internal_ip(ip: str) -> bool:
    """判断 IP 地址是否属于私有、回环、链路本地或保留范围。"""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved


def _is_internal_host(hostname: str) -> bool:
    """判断主机名是否指向内网、回环或链路本地地址。

    用于防止通过 Git 克隆接口发起 SSRF，避免后端请求内网元数据服务
    （如 169.254.169.254）或本地服务。
    """
    if not hostname:
        return True

    lower = hostname.lower()
    if lower in ("localhost", "127.0.0.1", "::1"):
        return True

    return is_internal_ip(hostname)


def validate_git_url(url: str) -> str:
    """校验 Git 仓库 URL，拒绝内网/回环/链路本地地址与非标准端口，防止 SSRF。"""
    if not url or not url.strip():
        raise ValidationError("Git URL 不能为空")

    url = url.strip()

    # 支持 HTTPS 和 SSH 格式
    https_pattern = r"^https?://[\w\-\.]+(:\d+)?/[\w\-\.]+/[\w\-\.]+(\.git)?$"
    ssh_pattern = r"^git@[\w\-\.]+:[\w\-\.]+/[\w\-\.]+(\.git)?$"

    if not (re.match(https_pattern, url) or re.match(ssh_pattern, url)):
        raise ValidationError(f"无效的 Git URL 格式: {url}")

    is_ssh = url.startswith("git@")
    parsed = urlparse(url)

    if is_ssh:
        # SSH 格式 git@host:path 没有 scheme，urlparse 会把 host 放到 path
        hostname: Optional[str] = url.split(":", 1)[0].split("@", 1)[-1]
        port: Optional[int] = 22
    else:
        hostname = parsed.hostname
        port = parsed.port

    if not hostname:
        raise ValidationError(f"无效的 Git URL 格式: {url}")

    # 未显式指定端口时根据 scheme 推断
    if port is None:
        port = 443 if parsed.scheme == "https" else 80

    allowed_ports = {22, 80, 443, 9418}
    if port not in allowed_ports:
        raise ValidationError(f"Git URL 使用了非标准端口，不被允许: {port}")

    # 检查主机名是否直接指向内部地址
    if _is_internal_host(hostname):
        raise ValidationError(f"Git URL 指向内部或本地地址，不被允许: {url}")

    # 对域名进行二次解析，防止 DNS 解析到内部地址
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        try:
            resolved_ip = socket.gethostbyname(hostname)
        except (socket.gaierror, UnicodeError) as exc:
            raise ValidationError(f"无法解析 Git URL 主机名: {hostname}") from exc
        if is_internal_ip(resolved_ip):
            raise ValidationError(f"Git URL 解析到内部地址，不被允许: {url}")

    return url


def validate_model_config(provider: str, model: str) -> None:
    """校验大模型配置"""
    valid_providers = ["openai", "ollama"]
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
    if not category:
        raise ValidationError("分类名称不能为空")

    if len(category) > 100:
        raise ValidationError("分类名称不能超过 100 个字符")

    if any(c in category for c in ("..", "/", "\\", os.sep)):
        raise ValidationError("分类名称包含非法字符")

    if category in (".", ".."):
        raise ValidationError("分类名称不能为 '.' 或 '..'")

    return category
