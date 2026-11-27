import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FEATURE_LABELS, featureValue } from "../../lib/labels";
import type { Factor, LoanApplication } from "../../lib/types";

const RAISES = "#be123c";
const LOWERS = "#4338ca";

interface Row {
  label: string;
  value: string;
  impact: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-salt-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink-900">{row.label}</p>
      <p className="mt-0.5 text-ink-500">Value: {row.value}</p>
      <p className="mt-1 tabular-nums" style={{ color: row.impact > 0 ? RAISES : LOWERS }}>
        {row.impact > 0 ? "+" : ""}
        {row.impact.toFixed(3)} {row.impact > 0 ? "toward default" : "away from default"}
      </p>
    </div>
  );
}

export function ContributionChart({ contributions, applicant, debtToIncome }: {
  contributions: Factor[];
  applicant: LoanApplication;
  debtToIncome: number;
}) {
  const rows: Row[] = contributions.map((f) => ({
    label: FEATURE_LABELS[f.feature],
    value: featureValue(f.feature, applicant, debtToIncome),
    impact: f.impact,
  }));
  const limit = Math.max(...rows.map((r) => Math.abs(r.impact)), 0.1);

  return (
    <div>
      <div className="mb-3 flex justify-between pl-[150px] text-[11px] text-ink-500">
        <span>Lowers risk</span>
        <span>Raises risk</span>
      </div>
      <ResponsiveContainer width="100%" height={rows.length * 30 + 20}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={6}>
          <XAxis type="number" domain={[-limit, limit]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#33364a" }}
          />
          <ReferenceLine x={0} stroke="#b9b1a2" />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f6f4ef" }} />
          <Bar dataKey="impact" radius={3} minPointSize={2} isAnimationActive animationDuration={500}>
            {rows.map((r) => (
              <Cell key={r.label} fill={r.impact > 0 ? RAISES : LOWERS} fillOpacity={r.impact === 0 ? 0.2 : 0.85} />
            ))}
            <LabelList
              dataKey="impact"
              position="right"
              formatter={(v: unknown) => (v === 0 ? "No effect" : "")}
              style={{ fontSize: 11, fill: "#736c5f" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
