import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../../lib/types";

const prose =
  "text-[15px] leading-7 text-ink-900 [&_a]:text-indigo-700 [&_a]:underline [&_code]:rounded [&_code]:bg-salt-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border-t [&_td]:border-salt-200 [&_td]:px-3 [&_td]:py-1.5 [&_th]:bg-salt-50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex animate-rise justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-700 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="animate-rise rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
        {message.content}
      </div>
    );
  }

  return (
    <div className="flex animate-rise gap-3">
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-md bg-indigo-700 text-[10px] font-bold text-white">
        CL
      </span>
      <div className={`min-w-0 flex-1 overflow-x-auto ${prose}`}>
        <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
      </div>
    </div>
  );
}

export function ThinkingBubble({ seconds }: { seconds: number }) {
  return (
    <div className="flex animate-rise gap-3" aria-live="polite">
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-md bg-indigo-700 text-[10px] font-bold text-white">
        CL
      </span>
      <div className="flex items-center gap-3 py-2 text-sm text-ink-500">
        <span className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span key={delay} className="size-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </span>
        {seconds < 10 ? "Thinking" : `Still working · ${seconds}s`}
      </div>
    </div>
  );
}
