import os
from collections.abc import Callable

from google import genai
from google.genai import types

from agent.providers.base import ToolLoopExhausted, ToolSpec, timeout_seconds

DEFAULT_MODEL = "gemini-3.5-flash-lite"


def _client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    options = types.HttpOptions(
        timeout=int(timeout_seconds() * 1000),
        retry_options=types.HttpRetryOptions(attempts=2),
    )
    
    return genai.Client(api_key=key, http_options=options)


def run(system: str, message: str, tool: ToolSpec, run_tool: Callable[[str, dict], dict], max_rounds: int) -> str:
    client = _client()
    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    declaration = types.FunctionDeclaration(
        name=tool.name, description=tool.description, parameters_json_schema=tool.parameters
    )
    
    config = types.GenerateContentConfig(
        system_instruction=system,
        tools=[types.Tool(function_declarations=[declaration])],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        temperature=0.2,
    )
    
    contents = [types.Content(role="user", parts=[types.Part.from_text(text=message)])]
    
    for _ in range(max_rounds):
        response = client.models.generate_content(model=model, contents=contents, config=config)
        calls = response.function_calls or []
        if not calls:
            return (response.text or "").strip()
        contents.append(response.candidates[0].content)
        results = [
            types.Part.from_function_response(name=c.name, response=run_tool(c.name, c.args or {})) for c in calls
        ]
        contents.append(types.Content(role="user", parts=results))
        
    raise ToolLoopExhausted(f"Gemini exceeded {max_rounds} tool rounds")
