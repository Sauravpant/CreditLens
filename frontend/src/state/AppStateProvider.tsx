import { useState, type ReactNode } from "react";
import type { ChatMessage, LoanApplication } from "../lib/types";
import { AppStateContext, type Assessment } from "./AppStateContext";

const DEFAULT_APPLICANT: LoanApplication = {
  age: 28,
  gender: "M",
  income_monthly: 45000,
  employment_type: "Government",
  employment_years: 5,
  loan_amount: 500000,
  loan_purpose: "Personal",
  interest_rate: 12,
  existing_loans: 1,
  has_collateral: false,
  credit_history_months: 72,
  province: 3,
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState(DEFAULT_APPLICANT);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  return (
    <AppStateContext value={{ form, setForm, assessment, setAssessment, messages, setMessages }}>
      {children}
    </AppStateContext>
  );
}
