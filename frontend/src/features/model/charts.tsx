import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Text, Tooltip, XAxis, YAxis } from "recharts";
import { FEATURE_LABELS } from "../../lib/labels";
import type { ModelInfo } from "../../lib/types";

const axisTick = { fontSize: 12, fill: "#5b5f73" };
const tooltipStyle = { borderRadius: 8, border: "1px solid #ebe7de", fontSize: 12, boxShadow: "0 4px 12px rgb(0 0 0 / 0.06)" };

const METRICS = [
  { key: "roc_auc", label: "AUC-ROC", color: "#3730a3" },
  { key: "f1", label: "F1", color: "#818cf8" },
  { key: "precision", label: "Precision", color: "#a5b4fc" },
  { key: "recall", label: "Recall", color: "#c7d2fe" },
];

const importanceHeight = (rows: number) => rows * 28 + 10;

function WrappedTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <Text x={x} y={(y ?? 0) + 4} width={80} textAnchor="middle" verticalAnchor="start" {...axisTick}>
      {payload?.value}
    </Text>
  );
}

export function ComparisonChart({ comparison, featureCount }: { comparison: ModelInfo["comparison"]; featureCount: number }) {
  return (
    <ResponsiveContainer width="100%" height={importanceHeight(featureCount)}>
      <BarChart data={comparison} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="#ebe7de" />
        <XAxis dataKey="model" tickLine={false} axisLine={{ stroke: "#dcd6ca" }} interval={0} height={40} tick={<WrappedTick />} />
        <YAxis domain={[0, 1]} tickLine={false} axisLine={false} tick={axisTick} tickCount={6} />
        <Tooltip cursor={{ fill: "#f6f4ef" }} contentStyle={tooltipStyle} formatter={(v) => Number(v).toFixed(3)} />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value) => <span style={{ color: "#33364a" }}>{value}</span>}
        />
        {METRICS.map((m) => (
          <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ImportanceChart({ importance }: { importance: Record<string, number> }) {
  const rows = Object.entries(importance).map(([feature, value]) => ({ label: FEATURE_LABELS[feature] ?? feature, value }));

  return (
    <ResponsiveContainer width="100%" height={importanceHeight(rows.length)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={5}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ ...axisTick, fill: "#33364a" }} />
        <Tooltip cursor={{ fill: "#f6f4ef" }} contentStyle={tooltipStyle} formatter={(v) => [Number(v).toFixed(3), "Mean |SHAP|"]} />
        <Bar dataKey="value" fill="#4338ca" radius={3} minPointSize={2}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: unknown) => (v === 0 ? "No effect" : Number(v).toFixed(2))}
            style={{ fontSize: 11, fill: "#5b5f73" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
