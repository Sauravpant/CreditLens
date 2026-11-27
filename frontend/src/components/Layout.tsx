import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { api } from "../lib/api";

type Status = "checking" | "ready" | "no-model" | "offline";

const STATUS_LABELS: Record<Status, { text: string; dot: string }> = {
  checking: { text: "Connecting", dot: "bg-salt-400" },
  ready: { text: "API online", dot: "bg-emerald-500" },
  "no-model": { text: "Model not loaded", dot: "bg-amber-500" },
  offline: { text: "API offline", dot: "bg-rose-500" },
};

const NAV = [
  { to: "/", label: "Assess" },
  { to: "/chat", label: "Advisor" },
  { to: "/model", label: "Model" },
];

function useApiStatus(): Status {
  const [status, setStatus] = useState<Status>("checking");
  useEffect(() => {
    let active = true;
    const check = () =>
      api
        .health()
        .then((h) => active && setStatus(h.model_loaded ? "ready" : "no-model"))
        .catch(() => active && setStatus("offline"));
    check();
    const timer = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return status;
}

export function Layout() {
  const status = STATUS_LABELS[useApiStatus()];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-salt-200 bg-salt-50/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-indigo-700 text-xs font-bold text-white">CL</span>
            <span className="text-[15px] font-semibold tracking-tight">CreditLens</span>
          </NavLink>
          <nav className="flex h-full gap-1" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `relative flex items-center px-3 text-sm transition-colors ${
                    isActive
                      ? "font-medium text-indigo-800 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-indigo-700"
                      : "text-ink-500 hover:text-ink-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs text-ink-500" role="status">
            <span className={`size-2 rounded-full ${status.dot}`} />
            {status.text}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
