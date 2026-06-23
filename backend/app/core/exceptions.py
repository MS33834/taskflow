"""异常处理工具"""
from fastapi import HTTPException

from app.utils.logger import logger


def handle_api_error(
    exc: Exception, status_code: int = 500, log_message: str | None = None
) -> HTTPException:
    """将异常转换为对客户端安全的 HTTPException，并在服务端记录完整 traceback。

    该辅助函数用于捕获 API 处理过程中未预期的异常，避免将内部错误详情
    （如文件路径、堆栈跟踪、第三方库报错）直接返回给客户端，从而降低
    信息泄露风险。
    """
    log_msg = log_message or "API 请求处理失败"
    logger.exception(f"{log_msg}: {exc}")
    return HTTPException(status_code=status_code, detail="Internal server error")
