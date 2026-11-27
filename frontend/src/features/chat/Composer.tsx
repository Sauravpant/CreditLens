import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

const MAX_LENGTH = 4000;

export function Composer({ onSend, onStop, busy }: { onSend: (text: string) => void; onStop: () => void; busy: boolean }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setText("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="rounded-2xl border border-salt-300 bg-white p-2 shadow-sm transition-colors focus-within:border-indigo-500">
      <textarea
        ref={ref}
        rows={1}
        autoFocus
        value={text}
        maxLength={MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask about an applicant, a risk factor, or the model"
        aria-label="Message"
        className="block w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-6 text-ink-900 placeholder:text-salt-500 focus:outline-none"
      />
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-[11px] text-salt-500">Enter to send · Shift + Enter for a new line</span>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="grid size-10 place-items-center rounded-lg bg-ink-900 text-white transition-colors hover:bg-ink-700"
            aria-label="Stop"
          >
            <span className="size-2.5 rounded-[2px] bg-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!text.trim()}
            className="grid size-10 place-items-center rounded-lg bg-indigo-700 text-white transition-colors hover:bg-indigo-800 disabled:bg-salt-200 disabled:text-salt-400"
            aria-label="Send"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5m0 0-6 6m6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
