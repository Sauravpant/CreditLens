import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, ErrorNote, PageHeader } from "../../components/ui";
import { api, ApiError, type FieldErrors } from "../../lib/api";
import { FEATURE_LABELS, formatPercent } from "../../lib/labels";
import { useAppState } from "../../state/AppStateContext";
import { ApplicantForm } from "./ApplicantForm";
import { ContributionChart } from "./ContributionChart";
import { FactorBreakdown } from "./FactorBreakdown";
import { RiskSummary } from "./RiskSummary";

function EmptyResult() {
  return (
    <Card>
      <div className="flex min-h-80 flex-col items-center justify-center text-center">
        <div className="grid size-11 place-items-center rounded-lg border border-salt-200 bg-salt-50">
          <svg className="size-5 text-indigo-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-4 text-sm font-semibold">No assessment yet</h2>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Fill in the applicant details and run an assessment. You will see the default probability and how each field
          moved it.
        </p>
      </div>
    </Card>
  );
}

export function AssessPage() {
  const { form, setForm, assessment, setAssessment } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();

  const stale = assessment !== null && JSON.stringify(assessment.applicant) !== JSON.stringify(form);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const applicant = { ...form };
      const prediction = await api.predict(applicant);
      setAssessment({ applicant, prediction });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, "Unexpected error.");
      setError(err.message);
      setFieldErrors(err.fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Risk assessment"
        description="Score a loan application with the trained model. Every result comes with a SHAP breakdown that shows which fields drove the score."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
        <Card title="Application" className="lg:sticky lg:top-20">
          <ApplicantForm value={form} onChange={setForm} onSubmit={submit} loading={loading} errors={fieldErrors} />
          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </Card>

        {assessment ? (
          <div key={assessment.prediction.risk_score} className={`animate-rise space-y-6 transition-opacity ${stale || loading ? "opacity-60" : ""}`}>
            {stale && (
              <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-900">
                The inputs changed since this result. Run the assessment again to update it.
              </p>
            )}
            <Card
              title="Result"
              action={<span className="text-xs text-ink-500">{assessment.prediction.model_used}</span>}
            >
              <RiskSummary prediction={assessment.prediction} />
              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-salt-200 bg-salt-200 sm:grid-cols-3">
                {[
                  ["Debt-to-income", formatPercent(assessment.prediction.debt_to_income)],
                  ["Strongest factor", FEATURE_LABELS[assessment.prediction.top_factors[0]?.feature] ?? "None"],
                  ["Decision band", assessment.prediction.risk_level.toLowerCase()],
                ].map(([label, value]) => (
                  <div key={label} className="bg-salt-50 px-4 py-3">
                    <dt className="text-[11px] text-ink-500">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums first-letter:uppercase">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card
              title="What drove this score"
              description="SHAP values show how far each field pushed this applicant's risk up or down compared with an average applicant in the training data. Longer bars mean a stronger effect. Values are on the model's log-odds scale."
            >
              <ContributionChart
                contributions={assessment.prediction.contributions}
                applicant={assessment.applicant}
                debtToIncome={assessment.prediction.debt_to_income}
              />
            </Card>

            <Card title="Top factors" description="The three fields with the largest effect on this result.">
              <FactorBreakdown
                factors={assessment.prediction.top_factors}
                applicant={assessment.applicant}
                debtToIncome={assessment.prediction.debt_to_income}
              />
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-salt-200 bg-white px-5 py-4">
              <p className="text-sm text-ink-500">Ask the advisor why, or what would change the outcome.</p>
              <Button variant="secondary" onClick={() => navigate("/chat")}>
                Discuss this applicant
              </Button>
            </div>
          </div>
        ) : (
          <EmptyResult />
        )}
      </div>
    </>
  );
}
