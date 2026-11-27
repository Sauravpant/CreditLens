import os
from dataclasses import dataclass

DEFAULT_TIMEOUT_SECONDS = 60.0


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict


class ToolLoopExhausted(RuntimeError):
    pass


def timeout_seconds() -> float:
    return float(os.getenv("LLM_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
