import logging
from collections.abc import Callable

from agent.providers import gemini_provider, groq_provider
from agent.providers.base import ToolSpec

logger = logging.getLogger(__name__)

PROVIDERS = [("gemini", gemini_provider.run), ("groq", groq_provider.run)]


class AllProvidersFailed(RuntimeError):
    pass


def chat_with_tools(
    system: str, message: str, tool: ToolSpec, run_tool: Callable[[str, dict], dict], max_rounds: int = 5
) -> str:
    errors = []
    for name, run in PROVIDERS:
        try:
            reply = run(system, message, tool, run_tool, max_rounds)
            logger.info("LLM reply from %s", name)
            return reply
        except Exception as e:
            logger.warning("LLM provider %s failed: %s", name, e)
            errors.append(f"{name}: {e}")
    raise AllProvidersFailed("All LLM providers failed. " + " | ".join(errors))
