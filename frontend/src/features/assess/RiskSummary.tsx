import { formatPercent, RISK_STYLES, RISK_THRESHOLDS } from "../../lib/labels";
import type { Prediction } from "../../lib/types";

const { medium, high } = RISK_THRESHOLDS;

const SEGMENTS = [
  { from: 0, to: medium, label: "Low", range: `under ${formatPercent(medium, 0)}`, color: "bg-emerald-100" },
  { from: medium, to: high, label: "Medium", range: `${formatPercent(medium, 0)}–${formatPercent(high, 0)}`, color: "bg-amber-100" },
  { from: high, to: 1, label: "High", range: `over ${formatPercent(high, 0)}`, color: "bg-rose-100" },
];

export function RiskSummary({ prediction }: { prediction: Prediction }) {
  const style = RISK_STYLES[prediction.risk_level];
  const score = prediction.risk_score;

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
      <div>
        <p className="text-xs font-medium text-ink-500">Probability of default</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums text-ink-900">{formatPercent(score)}</p>
        <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      <div>
        <div className="relative pt-7">
          <div
            className="absolute top-0 -translate-x-1/2 transition-[left] duration-500 ease-out"
            style={{ left: `${score * 100}%` }}
          >
            <div className="rounded bg-ink-900 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
              {formatPercent(score, 0)}
            </div>
            <div className="mx-auto h-2 w-px bg-ink-900" />
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {SEGMENTS.map((s) => (
              <div key={s.label} className={s.color} style={{ width: `${(s.to - s.from) * 100}%` }} />
            ))}
          </div>
          <div className="mt-2 flex text-[11px] text-ink-500">
            {SEGMENTS.map((s) => (
              <div key={s.label} style={{ width: `${(s.to - s.from) * 100}%` }}>
                <span className="font-medium text-ink-700">{s.label}</span>
                <span className="block sm:inline"> {s.range}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-ink-700">{prediction.explanation}</p>
      </div>
    </div>
  );
}
