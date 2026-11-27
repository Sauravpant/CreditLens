import type { LoanApplication, RiskLevel } from "./types";

export const FEATURE_LABELS: Record<string, string> = {
  age: "Age",
  gender: "Gender",
  income_monthly: "Monthly income",
  employment_type: "Employment type",
  employment_years: "Years employed",
  loan_amount: "Loan amount",
  loan_purpose: "Loan purpose",
  interest_rate: "Interest rate",
  existing_loans: "Existing loans",
  debt_to_income: "Debt-to-income",
  has_collateral: "Collateral",
  credit_history_months: "Credit history",
  province: "Province",
};

export const PROVINCES = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];

export const RISK_THRESHOLDS = { medium: 0.3, high: 0.6 };

export const RISK_STYLES: Record<RiskLevel, { label: string; text: string; bg: string; bar: string }> = {
  LOW: { label: "Low risk", text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-600" },
  MEDIUM: { label: "Medium risk", text: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500" },
  HIGH: { label: "High risk", text: "text-rose-700", bg: "bg-rose-50", bar: "bg-rose-600" },
};

const npr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const formatNpr = (value: number) => `NPR ${npr.format(value)}`;
export const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export function featureValue(feature: string, applicant: LoanApplication, debtToIncome: number): string {
  switch (feature) {
    case "income_monthly":
      return `${formatNpr(applicant.income_monthly)} / month`;
    case "loan_amount":
      return formatNpr(applicant.loan_amount);
    case "interest_rate":
      return `${applicant.interest_rate}%`;
    case "has_collateral":
      return applicant.has_collateral ? "Provided" : "None";
    case "credit_history_months":
      return `${applicant.credit_history_months} months`;
    case "employment_years":
      return `${applicant.employment_years} years`;
    case "province":
      return PROVINCES[applicant.province - 1];
    case "gender":
      return applicant.gender === "M" ? "Male" : "Female";
    case "debt_to_income":
      return formatPercent(debtToIncome);
    default:
      return String(applicant[feature as keyof LoanApplication]);
  }
}
