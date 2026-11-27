import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { api, ApiError } from "../../lib/api";
import { formatNpr, formatPercent, RISK_STYLES } from "../../lib/labels";
import type { ChatMessage } from "../../lib/types";
import { useAppState } from "../../state/AppStateContext";
import { Composer } from "./Composer";
import { MessageBubble, ThinkingBubble } from "./MessageBubble";

const GENERAL_PROMPTS = [
  "Which features matter most to the model?",
  "How was the model chosen, and how accurate is it?",
  "Assess a 35-year-old government employee earning NPR 60,000 a month, borrowing NPR 800,000 for housing at 11% with collateral.",
];

const APPLICANT_PROMPTS = [
  "Why did this applicant get this risk level?",
  "What changes would lower this applicant's risk?",
  "What if the applicant provided collateral?",
];

function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [running]);
  return seconds;
}

export function ChatPage() {
  const { messages, setMessages, assessment } = useAppState();
  const [busy, setBusy] = useState(false);
  const [useApplicant, setUseApplicant] = useState(assessment !== null);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const seconds = useElapsedSeconds(busy);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const append = (role: ChatMessage["role"], content: string) =>
    setMessages((current) => [...current, { id: crypto.randomUUID(), role, content }]);

  const send = async (text: string) => {
    append("user", text);
    setBusy(true);
    controller.current = new AbortController();
    try {
      const applicant = useApplicant && assessment ? assessment.applicant : null;
      const { reply } = await api.chat(text, applicant, controller.current.signal);
      append("assistant", reply);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") append("error", "Stopped. The advisor did not answer.");
      else append("error", e instanceof ApiError ? e.message : "The advisor failed to answer.");
    } finally {
      setBusy(false);
      controller.current = null;
    }
  };

  const prompts = useApplicant && assessment ? APPLICANT_PROMPTS : GENERAL_PROMPTS;
  const level = assessment && RISK_STYLES[assessment.prediction.risk_level];

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] w-full max-w-3xl flex-col">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Advisor</h1>
          <p className="mt-1 text-sm text-ink-500">
            Ask questions in plain language. The advisor runs the model and explains its results.
          </p>
        </div>
        {messages.length > 0 && !busy && (
          <button onClick={() => setMessages(() => [])} className="h-10 px-2 text-sm text-ink-500 transition-colors hover:text-ink-900">
            Clear
          </button>
        )}
      </div>

      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 [scrollbar-gutter:stable]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end pb-6">
            <p className="mb-3 text-xs font-medium text-ink-500">Try asking</p>
            <div className="grid gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="rounded-xl border border-salt-200 bg-white px-4 py-3 text-left text-sm text-ink-700 transition-colors hover:border-indigo-300 hover:text-ink-900"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {busy && <ThinkingBubble seconds={seconds} />}
          </div>
        )}
        <div ref={bottom} className="h-2" />
      </div>

      <div className="-mx-2 overflow-hidden px-2 pt-3 pb-1 [scrollbar-gutter:stable]">
        {assessment && level ? (
          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-xs text-ink-500">
            <input
              type="checkbox"
              checked={useApplicant}
              onChange={(e) => setUseApplicant(e.target.checked)}
              className="size-3.5 accent-indigo-700"
            />
            Include assessed applicant
            <span className="text-ink-700">
              ({assessment.applicant.age} y, {formatNpr(assessment.applicant.loan_amount)},{" "}
              <span className={level.text}>{formatPercent(assessment.prediction.risk_score)}</span>)
            </span>
          </label>
        ) : (
          <p className="mb-2 text-xs text-ink-500">
            <Link to="/" className="text-indigo-700 hover:underline">
              Assess an applicant
            </Link>{" "}
            to discuss their result here.
          </p>
        )}
        <Composer onSend={send} onStop={() => controller.current?.abort()} busy={busy} />
        <p className="mt-2 text-center text-[11px] text-salt-500">
          Each message is answered on its own. Include full details in every question.
        </p>
      </div>
    </div>
  );
}
