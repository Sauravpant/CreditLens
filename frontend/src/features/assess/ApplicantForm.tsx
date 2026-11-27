import type { FormEvent, ReactNode } from "react";
import { Button, Spinner } from "../../components/ui";
import type { FieldErrors } from "../../lib/api";
import { PROVINCES } from "../../lib/labels";
import type { LoanApplication } from "../../lib/types";

type Key = keyof LoanApplication;

interface NumberSpec {
  key: Key;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

const EMPLOYMENT = ["Government", "Private", "Self-employed", "Agriculture"];
const PURPOSES = ["Personal", "Business", "Housing", "Education", "Agriculture"];

const inputClass =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink-900 transition-colors placeholder:text-salt-500 focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-600/15";

function Field({ label, error, htmlFor, children }: { label: string; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-salt-200 pb-6 last:border-0">
      <legend className="mb-4 text-[11px] font-semibold tracking-wider text-salt-500 uppercase">{title}</legend>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </fieldset>
  );
}

export function ApplicantForm({ value, onChange, onSubmit, loading, errors }: {
  value: LoanApplication;
  onChange: (value: LoanApplication) => void;
  onSubmit: () => void;
  loading: boolean;
  errors: FieldErrors;
}) {
  const set = <K extends Key>(key: K, v: LoanApplication[K]) => onChange({ ...value, [key]: v });
  const border = (key: Key) => (errors[key] ? "border-rose-400" : "border-salt-300");

  const numberField = ({ key, label, min, max, step = 1, suffix }: NumberSpec) => {
    const current = value[key] as number;
    return (
      <Field key={key} label={label} error={errors[key]} htmlFor={key}>
        <div className="relative">
          <input
            id={key}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            required
            value={Number.isNaN(current) ? "" : current}
            onChange={(e) => set(key, e.target.valueAsNumber as never)}
            className={`${inputClass} ${border(key)} ${suffix ? "pr-14" : ""} tabular-nums`}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-salt-500">
              {suffix}
            </span>
          )}
        </div>
      </Field>
    );
  };

  const selectField = (
    key: Key,
    label: string,
    options: { value: string; label: string }[],
    parse: (raw: string) => string | number = String,
  ) => (
    <Field label={label} error={errors[key]} htmlFor={key}>
      <div className="relative">
        <select
          id={key}
          value={String(value[key])}
          onChange={(e) => set(key, parse(e.target.value) as never)}
          className={`${inputClass} ${border(key)} appearance-none pr-9`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-salt-500"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Group title="Applicant">
        {numberField({ key: "age", label: "Age", min: 18, max: 80, suffix: "years" })}
        {selectField("gender", "Gender", [
          { value: "M", label: "Male" },
          { value: "F", label: "Female" },
        ])}
        <div className="col-span-2">
          {selectField("province", "Province", PROVINCES.map((name, i) => ({ value: String(i + 1), label: `${i + 1} · ${name}` })), Number)}
        </div>
      </Group>

      <Group title="Employment & income">
        {selectField("employment_type", "Employment type", EMPLOYMENT.map((v) => ({ value: v, label: v })))}
        {numberField({ key: "employment_years", label: "Years employed", min: 0, max: 62, suffix: "years" })}
        <div className="col-span-2">
          {numberField({ key: "income_monthly", label: "Monthly income", min: 1, max: 10_000_000, step: 1000, suffix: "NPR" })}
        </div>
      </Group>

      <Group title="Loan">
        {numberField({ key: "loan_amount", label: "Loan amount", min: 1, max: 1_000_000_000, step: 10000, suffix: "NPR" })}
        {selectField("loan_purpose", "Purpose", PURPOSES.map((v) => ({ value: v, label: v })))}
        {numberField({ key: "interest_rate", label: "Interest rate", min: 0.1, max: 30, step: 0.1, suffix: "% p.a." })}
        {numberField({ key: "existing_loans", label: "Existing loans", min: 0, max: 20 })}
        {numberField({ key: "credit_history_months", label: "Credit history", min: 0, max: 744, suffix: "months" })}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-700">Collateral</span>
          <div className="grid h-10 grid-cols-2 rounded-lg border border-salt-300 bg-salt-100 p-0.5" role="radiogroup" aria-label="Collateral">
            {[true, false].map((option) => (
              <button
                key={String(option)}
                type="button"
                role="radio"
                aria-checked={value.has_collateral === option}
                onClick={() => set("has_collateral", option)}
                className={`rounded-md px-1 text-sm whitespace-nowrap transition-all ${
                  value.has_collateral === option ? "bg-white font-medium text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                {option ? "Provided" : "None"}
              </button>
            ))}
          </div>
        </div>
      </Group>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Spinner />}
        {loading ? "Assessing" : "Assess risk"}
      </Button>
    </form>
  );
}
