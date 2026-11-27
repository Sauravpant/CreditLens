export type EmploymentType = "Government" | "Private" | "Self-employed" | "Agriculture";
export type LoanPurpose = "Agriculture" | "Business" | "Personal" | "Education" | "Housing";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface LoanApplication {
  age: number;
  gender: "M" | "F";
  income_monthly: number;
  employment_type: EmploymentType;
  employment_years: number;
  loan_amount: number;
  loan_purpose: LoanPurpose;
  interest_rate: number;
  existing_loans: number;
  has_collateral: boolean;
  credit_history_months: number;
  province: number;
}

export interface Factor {
  feature: string;
  impact: number;
  direction: "increases risk" | "decreases risk";
}

export interface Prediction {
  risk_score: number;
  risk_level: RiskLevel;
  top_factors: Factor[];
  contributions: Factor[];
  debt_to_income: number;
  explanation: string;
  model_used: string;
}

export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
}

export interface ModelInfo {
  best_model: string;
  best_params: Record<string, string | number>;
  cv_auc: number;
  train_metrics: Metrics;
  test_metrics: Metrics;
  confusion_matrix: number[][];
  comparison: (Metrics & { model: string })[];
  global_importance: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
}
