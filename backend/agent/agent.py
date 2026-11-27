import json
import logging
from functools import cache

from pydantic import ValidationError

from agent.llm import chat_with_tools
from agent.providers.base import ToolSpec
from api.schemas import LoanApplication
from model.predict import ARTIFACTS_DIR, load_artifacts, predict

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 5
DISCLAIMER = "This is a risk assessment, not a lending decision."

SYSTEM_PROMPT = """You are a loan risk analyst at a Nepali financial institution. You assess loan applications \
using a machine learning model trained on lending data anchored to Nepal Rastra Bank statistics.

Rules:
- When asked about a specific applicant, call the assess_risk tool. Never guess a risk score yourself.
- For "what if" questions, call assess_risk again with the changed field and compare both results.
- To compare applicants, call assess_risk once per applicant.
- If required applicant fields are missing, ask the user for them instead of inventing values.
- Explain results using the model's SHAP factors: name each factor, its direction, and its impact.
  Impacts are in log-odds units for linear and tree models; describe them as relative strength, not percentages.
- Risk levels: LOW below 0.3, MEDIUM 0.3 to 0.6, HIGH above 0.6.
- Never make a final lending decision. End every assessment with: "{disclaimer}"
- If asked about anything outside loan risk assessment, say it is outside your scope.
- Amounts are in Nepali rupees (NPR). Provinces: 1 Koshi, 2 Madhes, 3 Bagmati, 4 Gandaki, 5 Lumbini, \
6 Karnali, 7 Sudurpashchim.

Model facts (answer "which model" and "what matters most" questions from these, without calling the tool):
{model_context}"""


def _tool_schema() -> dict:
    schema = LoanApplication.model_json_schema()
    schema.pop("example", None)
    schema.pop("title", None)
    return schema


ASSESS_RISK = ToolSpec(
    name="assess_risk",
    description="Score one loan applicant with the trained model. Returns risk_score (0-1), risk_level, "
    "top_factors (SHAP contributions), a template explanation, and the model name.",
    parameters=_tool_schema(),
)


@cache
def _model_context() -> str:
    _, _, summary = load_artifacts()
    importance = json.loads((ARTIFACTS_DIR / "global_importance.json").read_text())
    comparison = json.loads((ARTIFACTS_DIR / "comparison.json").read_text())
    return json.dumps(
        {"training_summary": summary, "global_feature_importance": importance, "model_comparison_cv": comparison},
        indent=2,
    )


def run_tool(name: str, args: dict) -> dict:
    if name != ASSESS_RISK.name:
        return {"error": f"Unknown tool: {name}"}
    try:
        application = LoanApplication(**args)
    except ValidationError as e:
        return {"error": "Invalid or missing applicant fields", "details": e.errors(include_url=False)}
    return {"applicant": application.model_dump(), **predict(application.model_dump())}


def _user_message(message: str, applicant: dict | None) -> str:
    if not applicant:
        return message
    return f"{message}\n\nApplicant data:\n{json.dumps(applicant)}"


def answer(message: str, applicant: dict | None = None) -> str:
    calls: list[str] = []

    def tracked_run_tool(name: str, args: dict) -> dict:
        calls.append(name)
        return run_tool(name, args)

    reply = chat_with_tools(
        system=SYSTEM_PROMPT.format(disclaimer=DISCLAIMER, model_context=_model_context()),
        message=_user_message(message, applicant),
        tool=ASSESS_RISK,
        run_tool=tracked_run_tool,
        max_rounds=MAX_TOOL_ROUNDS,
    )
    logger.info("Agent tool calls: %s", calls)
    if calls and DISCLAIMER not in reply:
        reply = f"{reply}\n\n{DISCLAIMER}"
    return reply


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    logging.basicConfig(level=logging.INFO)
    sample = LoanApplication.model_json_schema()["example"]
    ok = run_tool("assess_risk", sample)
    assert {"risk_score", "risk_level", "top_factors", "applicant"} <= set(ok), ok
    missing = run_tool("assess_risk", {"age": 30})
    assert missing["error"] == "Invalid or missing applicant fields" and missing["details"], missing
    assert "error" in run_tool("delete_bank", {})
    assert "Logistic Regression" in _model_context()
    print("Offline tool checks passed")
    print(answer("Assess this applicant and explain the main factors.", sample))
