import type { LoanApplication, ModelInfo, Prediction } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type FieldErrors = Partial<Record<keyof LoanApplication, string>>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

function parseError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {};
    for (const issue of detail as ValidationIssue[]) {
      const field = issue.loc.at(-1) as keyof LoanApplication;
      fieldErrors[field] = issue.msg;
    }
    return new ApiError(status, "Some fields are invalid.", fieldErrors);
  }
  return new ApiError(status, typeof detail === "string" ? detail : `Request failed (${status}).`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Cannot reach the CreditLens API. Is the backend running?");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw parseError(response.status, body);
  return body as T;
}

export const api = {
  health: () => request<{ status: string; model_loaded: boolean }>("/health"),
  modelInfo: () => request<ModelInfo>("/model/info"),
  predict: (application: LoanApplication) =>
    request<Prediction>("/predict", { method: "POST", body: JSON.stringify(application) }),
  chat: (message: string, applicant: LoanApplication | null, signal: AbortSignal) =>
    request<{ reply: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, applicant }),
      signal,
    }),
};
