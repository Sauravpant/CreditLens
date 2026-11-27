import { FEATURE_LABELS, featureValue } from "../../lib/labels";
import type { Factor, LoanApplication } from "../../lib/types";

function strength(impact: number): string {
  const size = Math.abs(impact);
  if (size >= 0.5) return "Strong";
  if (size >= 0.2) return "Moderate";
  return "Slight";
}

export function FactorBreakdown({ factors, applicant, debtToIncome }: {
  factors: Factor[];
  applicant: LoanApplication;
  debtToIncome: number;
}) {
  return (
    <ol className="divide-y divide-salt-200">
      {factors.map((f, i) => {
        const raises = f.impact > 0;
        return (
          <li key={f.feature} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-salt-100 text-xs font-semibold text-ink-500 tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink-900">
                  {FEATURE_LABELS[f.feature]}
                  <span className="font-normal text-ink-500"> · {featureValue(f.feature, applicant, debtToIncome)}</span>
                </p>
                <span className={`text-xs font-medium tabular-nums ${raises ? "text-rose-700" : "text-indigo-700"}`}>
                  {raises ? "+" : ""}
                  {f.impact.toFixed(3)}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {strength(f.impact)} effect. This value {raises ? "raises" : "lowers"} the predicted default risk compared with
                an average applicant.
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
