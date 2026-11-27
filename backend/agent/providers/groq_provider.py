import json
import os
from collections.abc import Callable

from groq import Groq

from agent.providers.base import ToolLoopExhausted, ToolSpec, timeout_seconds

DEFAULT_MODEL = "openai/gpt-oss-120b"


def _client() -> Groq:
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=key, timeout=timeout_seconds(), max_retries=1)


def _parse_args(raw: str | None) -> dict:
    try:
        args = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return args if isinstance(args, dict) else {}


def run(system: str, message: str, tool: ToolSpec, run_tool: Callable[[str, dict], dict], max_rounds: int) -> str:
    
    client = _client()
    model = os.getenv("GROQ_MODEL", DEFAULT_MODEL)
    tools = [{
        "type": "function",
        "function": {"name": tool.name, "description": tool.description, "parameters": tool.parameters},
    }]
    
    messages: list[dict] = [{"role": "system", "content": system}, {"role": "user", "content": message}]
    
    for _ in range(max_rounds):
        response = client.chat.completions.create(
            model=model, messages=messages, tools=tools, tool_choice="auto", temperature=0.2
        )
        reply = response.choices[0].message
        if not reply.tool_calls:
            return (reply.content or "").strip()
        messages.append(reply.model_dump(include={"role", "content", "tool_calls"}))
        
        for call in reply.tool_calls:
            result = run_tool(call.function.name, _parse_args(call.function.arguments))
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
            
    raise ToolLoopExhausted(f"Groq exceeded {max_rounds} tool rounds")
