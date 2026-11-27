import { createContext, useContext } from "react";
import type { ChatMessage, LoanApplication, Prediction } from "../lib/types";

export interface Assessment {
  applicant: LoanApplication;
  prediction: Prediction;
}

export interface AppState {
  form: LoanApplication;
  setForm: (form: LoanApplication) => void;
  assessment: Assessment | null;
  setAssessment: (assessment: Assessment | null) => void;
  messages: ChatMessage[];
  setMessages: (update: (messages: ChatMessage[]) => ChatMessage[]) => void;
}

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used inside AppStateProvider");
  return state;
}
