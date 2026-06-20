"""大模型统一调度模块"""
import re
from typing import AsyncIterator, Dict, List, Optional, Tuple

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.config import settings
from app.utils.logger import logger
from app.utils.validator import validate_model_config

# 简单敏感实体正则：API key、密码片段、身份证号（中国大陆 15/18 位）、手机号、信用卡号
_SENSITIVE_PATTERNS = [
    re.compile(r"\b(sk-[a-zA-Z0-9]{20,})\b"),  # OpenAI-style API key
    re.compile(r"\b(password|passwd|pwd)\s*[:=]\s*([^\s]{4,})\b", re.IGNORECASE),
    re.compile(r"\b\d{17}[\dxX]|\d{15}\b"),  # 身份证
    re.compile(r"\b1[3-9]\d{9}\b"),  # 手机号
    re.compile(r"\b(?:\d{4}[- ]?){3}\d{4}\b"),  # 信用卡号
]


def _sanitize_text(text: str) -> Tuple[str, int]:
    """对文本进行简单脱敏，返回脱敏后的文本与命中规则数。"""
    masked = text
    hits = 0
    for pattern in _SENSITIVE_PATTERNS:
        matches = list(pattern.finditer(masked))
        if matches:
            hits += len(matches)
            for match in reversed(matches):
                start, end = match.span()
                masked = masked[:start] + "***" + masked[end:]
    return masked, hits


def _sanitize_messages(
    messages: List[Dict[str, str]],
) -> Tuple[List[Dict[str, str]], int]:
    """对消息列表进行脱敏，返回新列表与命中次数。"""
    sanitized = []
    total_hits = 0
    for msg in messages:
        content = msg.get("content", "")
        masked, hits = _sanitize_text(content)
        total_hits += hits
        sanitized.append({**msg, "content": masked})
    return sanitized, total_hits


class LLMManager:
    """大模型统一管理器"""
    
    def __init__(self):
        self._llm: Optional[BaseChatModel] = None
        self._provider: Optional[str] = None
        self._model: Optional[str] = None
    
    def _create_openai_llm(self) -> BaseChatModel:
        """创建 OpenAI 模型"""
        from langchain_openai import ChatOpenAI
        
        if not settings.openai_api_key:
            raise ValueError("OpenAI API Key 未配置")
        
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            temperature=0.7,
            max_tokens=2000,
        )
    
    def _create_ollama_llm(self) -> BaseChatModel:
        """创建 Ollama 模型"""
        from langchain_community.chat_models import ChatOllama
        
        return ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            temperature=0.7,
            num_predict=2000,
        )
    
    def get_llm(self) -> BaseChatModel:
        """获取大模型实例"""
        current_model = (
            settings.openai_model if settings.llm_provider == "openai"
            else settings.ollama_model
        )
        validate_model_config(settings.llm_provider, current_model)
        
        # 如果配置没变，返回缓存的实例
        if (self._llm and 
            self._provider == settings.llm_provider and 
            self._model == current_model):
            return self._llm
        
        # 创建新实例
        if settings.llm_provider == "openai":
            self._llm = self._create_openai_llm()
        elif settings.llm_provider == "ollama":
            self._llm = self._create_ollama_llm()
        else:
            raise ValueError(f"不支持的模型提供商: {settings.llm_provider}")
        
        self._provider = settings.llm_provider
        self._model = current_model
        
        logger.info(f"已切换到大模型: {self._provider}/{self._model}")
        return self._llm
    
    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[BaseMessage]:
        """转换消息格式为 LangChain 格式"""
        converted = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "user":
                converted.append(HumanMessage(content=content))
            elif role == "assistant":
                converted.append(AIMessage(content=content))
            elif role == "system":
                converted.append(SystemMessage(content=content))
            else:
                converted.append(HumanMessage(content=content))
        
        return converted

    def _current_model_name(self) -> str:
        """返回当前正在使用的模型名称（缓存或配置）。"""
        if self._model:
            return self._model
        return (
            settings.openai_model
            if settings.llm_provider == "openai"
            else settings.ollama_model
        )

    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """同步对话"""
        sanitized_messages, sensitive_hits = _sanitize_messages(messages)
        logger.info(
            f"LLM 调用审计: provider={settings.llm_provider}, "
            f"model={self._current_model_name()}, "
            f"sensitive_hits={sensitive_hits}"
        )

        llm = self.get_llm()
        converted_messages = self._convert_messages(sanitized_messages)

        try:
            response = await llm.ainvoke(converted_messages, **kwargs)
            sanitized_response, output_hits = _sanitize_text(response.content)
            if output_hits:
                logger.warning(
                    f"LLM 返回内容命中 {output_hits} 条敏感实体规则，已脱敏"
                )
            return sanitized_response
        except Exception as e:
            logger.error(f"大模型调用失败: {e}")
            raise

    async def stream_chat(
        self, messages: List[Dict[str, str]], **kwargs
    ) -> AsyncIterator[str]:
        """流式对话"""
        sanitized_messages, sensitive_hits = _sanitize_messages(messages)
        logger.info(
            f"LLM 流式调用审计: provider={settings.llm_provider}, "
            f"model={self._current_model_name()}, "
            f"sensitive_hits={sensitive_hits}"
        )

        llm = self.get_llm()
        converted_messages = self._convert_messages(sanitized_messages)

        try:
            async for chunk in llm.astream(converted_messages, **kwargs):
                sanitized_chunk, output_hits = _sanitize_text(chunk.content)
                if output_hits:
                    logger.warning(
                        f"LLM 流式返回命中 {output_hits} 条敏感实体规则，已脱敏"
                    )
                yield sanitized_chunk
        except Exception as e:
            logger.error(f"大模型流式调用失败: {e}")
            raise


# 全局实例
llm_manager = LLMManager()
