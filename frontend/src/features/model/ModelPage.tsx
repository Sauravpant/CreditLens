import { useEffect, useState } from "react";
import { Card, ErrorNote, PageHeader, Spinner } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { formatPercent } from "../../lib/labels";
import type { Metrics, ModelInfo } from "../../lib/types";
import { ComparisonChart, ImportanceChart } from "./charts";

const METRIC_ROWS: { key: keyof Metrics; label: string; meaning: string }[] = [
  { key: "roc_auc", label: "AUC-ROC", meaning: "How well the model ranks defaulters above non-defaulters" },
  { key: "accuracy", label: "Accuracy", meaning: "Share of all applicants classified correctly" },
  { key: "precision", label: "Precision", meaning: "Of applicants flagged, the share that defaulted" },
  { key: "recall", label: "Recall", meaning: "Of applicants who defaulted, the share flagged" },
  { key: "f1", label: "F1", meaning: "Balance of precision and recall" },
];

function ConfusionMatrix({ matrix }: { matrix: number[][] }) {
  const [[tn, fp], [fn, tp]] = matrix;
  const cells = [
    { value: tn, label: "Correctly cleared", hint: "Repaid, predicted low risk", strong: true },
    { value: fp, label: "False alarm", hint: "Repaid, flagged as risky", strong: false },
    { value: fn, label: "Missed default", hint: "Defaulted, predicted low risk", strong: false },
    { value: tp, label: "Caught default", hint: "Defaulted, flagged as risky", strong: true },
  ];

  return (
    <div className="grid h-full grid-cols-[auto_1fr_1fr] grid-rows-[auto_1fr_1fr] gap-2 text-sm">
      <span />
      <span className="text-center text-xs text-ink-500">Predicted low</span>
      <span className="text-center text-xs text-ink-500">Predicted risky</span>
      {[0, 1].map((row) => (
        <div key={row} className="contents">
          <span className="flex items-center pr-2 text-xs text-ink-500">{row === 0 ? "Repaid" : "Defaulted"}</span>
          {cells.slice(row * 2, row * 2 + 2).map((c) => (
            <div key={c.label} className={`flex flex-col justify-center rounded-lg border px-4 py-3 ${c.strong ? "border-indigo-200 bg-indigo-50" : "border-salt-200 bg-salt-50"}`}>
              <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
              <p className="mt-1 text-xs font-medium text-ink-700">{c.label}</p>
              <p className="text-[11px] text-ink-500">{c.hint}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ModelPage() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .modelInfo()
      .then(setInfo)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load model details."));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!info)
    return (
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Spinner /> Loading model details
      </div>
    );

  return (
    <>
      <PageHeader
        title="Model"
        description="Three models were trained on the same data and compared with 5-fold cross-validation. The best one by AUC-ROC was tuned and then tested once on held-out data."
      />

      <div className="space-y-6">
        <Card>
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-500">Selected model</dt>
              <dd className="mt-1 text-lg font-semibold">{info.best_model}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Cross-validation AUC</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{info.cv_auc.toFixed(3)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Held-out test AUC</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{info.test_metrics.roc_auc.toFixed(3)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Tuned parameters</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(info.best_params).map(([k, v]) => (
                  <code key={k} className="rounded bg-salt-100 px-1.5 py-0.5 font-mono text-xs text-ink-700">
                    {k}={typeof v === "number" ? Number(v.toFixed(3)) : v}
                  </code>
                ))}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Model comparison"
            description="Cross-validated scores on the training set. AUC-ROC decided the winner. Precision and recall are low for every model, because only about 10% of applicants default."
          >
            <ComparisonChart
              comparison={info.comparison}
              featureCount={Object.keys(info.global_importance).length}
            />
          </Card>

          <Card
            title="Global feature importance"
            description="Average size of each field's SHAP value across applicants. Higher means the field moves predictions more, in either direction."
          >
            <ImportanceChart importance={info.global_importance} />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Test set outcomes"
            description={`${info.confusion_matrix.flat().reduce((a, b) => a + b, 0)} held-out applicants. An applicant is flagged as risky at a score of 30% or more.`}
          >
            <ConfusionMatrix matrix={info.confusion_matrix} />
          </Card>

          <Card title="Train vs test" description="Similar scores on both sets mean the model is not overfitting.">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-salt-200 text-left text-xs text-ink-500">
                  <th className="pb-2 font-medium">Metric</th>
                  <th className="pb-2 pl-4 text-right font-medium">Train</th>
                  <th className="pb-2 pl-4 text-right font-medium">Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salt-200">
                {METRIC_ROWS.map((m) => (
                  <tr key={m.key}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{m.label}</p>
                      <p className="text-xs text-ink-500">{m.meaning}</p>
                    </td>
                    <td className="py-2.5 pl-4 text-right tabular-nums">{formatPercent(info.train_metrics[m.key])}</td>
                    <td className="py-2.5 pl-4 text-right font-medium tabular-nums">{formatPercent(info.test_metrics[m.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
