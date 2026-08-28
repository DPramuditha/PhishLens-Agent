import { useState, useEffect } from "react";
import {
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  MinusIcon,
  ListBulletIcon,
  CommandLineIcon,
  ArrowsPointingOutIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

/* ─────────────────────────────────────────────────────────
 * COMPACT REALTIME AGENT TODO LIST (Right-Side Bottom)
 *
 * Streamlined, compact micro-animated task progress indicator.
 * Uses Heroicons (outline) and clean expandable sub-steps.
 * ───────────────────────────────────────────────────────── */

export const DEFAULT_AGENT_TASKS = [
  {
    key: "url",
    label: "URL Lexical & Registry",
    amount: "14 checks",
    details: [
      { label: "Resolving DNS & WHOIS registry", meta: "verified" },
      { label: "Validating SSL certificate & SANs", meta: "TLS 1.3" },
      { label: "Calculating URL token entropy", meta: "0.82" },
    ],
  },
  {
    key: "screenshot",
    label: "Capture Headless Viewport",
    amount: "1920x1080",
    details: [
      { label: "Chromium headless browser", meta: "active" },
      { label: "Rendering page layout", meta: "rendered" },
      { label: "Capturing viewport screenshot", meta: "PNG" },
    ],
  },
  {
    key: "dom",
    label: "Parse HTML DOM Structure",
    amount: "DOM tree",
    details: [
      { label: "Credential & password inputs", meta: "2 forms" },
      { label: "External scripts & iframes", meta: "8 assets" },
      { label: "Form action targets", meta: "cross-origin" },
    ],
  },
  {
    key: "visual",
    label: "Visual ML Brand Classifier",
    amount: "EfficientNet",
    details: [
      { label: "Evaluating logo placement", meta: "cached" },
      { label: "Siamese visual embedding", meta: "98.4%" },
      { label: "Brand dataset match", meta: "24 brands" },
    ],
  },
  {
    key: "web_search",
    label: "Tavily Web Search & OSINT",
    amount: "Tavily API",
    details: [
      { label: "Querying threat databases", meta: "scam/phish" },
      { label: "Checking official brand presence", meta: "verified" },
      { label: "Gathering community advisories", meta: "citations" },
    ],
  },
  {
    key: "orchestrator",
    label: "ReAct Synthesis & Verdict",
    amount: "JSON spec",
    details: [
      { label: "Cross-agent threat signals", meta: "ReAct loop" },
      { label: "Multi-tier risk calculation", meta: "5 tiers" },
      { label: "Generating final report", meta: "ready" },
    ],
  },
];

function SpinnerRing({
  active = false,
  children,
  size = 18,
}) {
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={active ? { animation: "spin 1.1s linear infinite" } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-zinc-700"
        />
        {active && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#6366f1"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.35} ${c * 0.65}`}
          />
        )}
      </svg>
      <span className="relative text-[9.5px] font-bold tabular-nums text-gray-600 dark:text-zinc-300">
        {children}
      </span>
    </span>
  );
}

function Badge({
  tone,
  children,
}) {
  const bgClass =
    tone === "red"
      ? "bg-rose-500 shadow-rose-500/20"
      : tone === "indigo"
      ? "bg-indigo-600 shadow-indigo-500/20"
      : "bg-emerald-500 shadow-emerald-500/20";

  return (
    <span
      className={`flex size-4.5 shrink-0 items-center justify-center rounded-full text-white shadow-xs ${bgClass}`}
      style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {children}
    </span>
  );
}

export default function RealtimeTodoList({
  isScanning = false,
  status = "loading", // "loading" | "completed" | "failed"
  tasks = DEFAULT_AGENT_TASKS,
  activeStepIndex = 0,
  onClose,
  variant = "Capsules", // "Capsules" | "List"
}) {
  const [currentStep, setCurrentStep] = useState(activeStepIndex);
  const [manualOpen, setManualOpen] = useState({});
  const [isMinimized, setIsMinimized] = useState(false);

  // Progressive simulation when scanning is active
  useEffect(() => {
    if (isScanning || status === "loading") {
      setCurrentStep(0);
      setIsMinimized(false);
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < tasks.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2500);
      return () => clearInterval(interval);
    } else if (status === "completed") {
      setCurrentStep(tasks.length);
    }
  }, [isScanning, status, tasks.length]);

  // Sync active step when prop updates
  useEffect(() => {
    if (status === "completed") {
      setCurrentStep(tasks.length);
    } else if (activeStepIndex !== undefined) {
      setCurrentStep(activeStepIndex);
    }
  }, [activeStepIndex, status, tasks.length]);

  const totalCount = tasks.length;
  const isFailed = status === "failed";
  const isDone = status === "completed" || currentStep >= totalCount;
  const completedCount = isDone
    ? totalCount
    : isFailed
    ? Math.max(0, currentStep - 1)
    : currentStep;

  // Render minimized compact floating pill in bottom right
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-22 right-5 z-40 flex items-center select-none"
        style={{ animation: "fade-up 250ms cubic-bezier(0.23,1,0.32,1) both" }}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-2 rounded-full border border-gray-200/90 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:shadow-xl dark:border-zinc-800 dark:bg-[#18181b]/95 dark:hover:bg-[#202024] cursor-pointer"
          title="Expand agent tasks"
        >
          <CommandLineIcon className="size-3.5 text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110" />
          <span className="text-[11.5px] font-semibold text-gray-800 dark:text-zinc-200">
            Tasks
          </span>
          <span className="flex items-center justify-center rounded-md bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 tabular-nums">
            {completedCount}/{totalCount}
          </span>
          {status === "loading" && (
            <ArrowPathIcon className="size-3 animate-spin stroke-[2.5] text-indigo-600 dark:text-indigo-400" />
          )}
          {status === "completed" && (
            <CheckIcon className="size-3 stroke-[3] text-emerald-500" />
          )}
          {status === "failed" && (
            <XMarkIcon className="size-3 stroke-[3] text-rose-500" />
          )}
          <ArrowsPointingOutIcon className="size-3 text-gray-400 dark:text-zinc-500" />
        </button>
      </div>
    );
  }

  const isList = variant === "List";

  return (
    <aside
      aria-label="Real-time agent execution tasks"
      className="fixed bottom-22 right-5 z-40 w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200/90 bg-white/95 p-2.5 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-zinc-800/90 dark:bg-[#18181b]/95 font-sans select-none"
      style={{ animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200/70 dark:border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ListBulletIcon className="size-3.5 stroke-[2.2]" />
          </div>
          <h3 className="text-[12px] font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
            Agent Tasks
          </h3>
          <span className="flex items-center justify-center rounded-md bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300 tabular-nums">
            {completedCount}/{totalCount}
          </span>
          {status === "loading" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <ArrowPathIcon className="size-2.5 animate-spin stroke-[2.5]" />
              Running
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Minimize button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex size-5.5 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            title="Minimize"
            aria-label="Minimize tasks"
          >
            <MinusIcon className="size-3 stroke-[2.5]" />
          </button>

          {/* Close button if handler provided */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-5.5 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-zinc-500 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 cursor-pointer"
              title="Close"
              aria-label="Close tasks"
            >
              <XMarkIcon className="size-3 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tasks Container ── */}
      <div
        className={`mt-2 flex flex-col max-h-[380px] overflow-y-auto no-scrollbar pr-0.5 ${
          isList
            ? "gap-0 rounded-lg overflow-hidden border border-gray-200/80 dark:border-zinc-800"
            : "gap-1.5"
        }`}
      >
        {tasks.map((task, i) => {
          const isTaskDone = isDone || i < currentStep;
          const isTaskActive = !isDone && !isFailed && i === currentStep;
          const isTaskFailed = isFailed && i === currentStep;
          const isTaskPending = !isDone && !isTaskActive && !isTaskFailed && i > currentStep;

          // Auto open the active step or user clicked
          const open = manualOpen[task.key] ?? isTaskActive;

          return (
            <div
              key={task.key}
              className={`shrink-0 self-stretch overflow-hidden transition-[border-radius,background-color,border-color] duration-200 ${
                isList
                  ? "border-b border-gray-200/70 dark:border-zinc-800 last:border-0 hover:bg-gray-50/80 dark:hover:bg-zinc-800/40"
                  : open
                  ? "rounded-lg bg-gray-50/90 border border-gray-200/80 dark:bg-[#202024]/90 dark:border-zinc-700/60 shadow-xs"
                  : "rounded-lg bg-gray-50/50 border border-gray-200/50 dark:bg-[#1c1c20]/60 dark:border-zinc-800/60 hover:bg-gray-100/70 dark:hover:bg-zinc-800/50"
              }`}
              style={{
                animation: `fade-up 300ms cubic-bezier(0.23,1,0.32,1) ${i * 40}ms both`,
              }}
            >
              {/* Main Row Button */}
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setManualOpen((curr) => ({ ...curr, [task.key]: !open }))
                }
                className="flex min-h-8.5 w-full items-center gap-2 px-2 py-1 text-left cursor-pointer"
              >
                {/* Status Badge / Spinner */}
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {isTaskDone ? (
                    <Badge tone="green">
                      <CheckIcon className="size-2.5 stroke-[3]" />
                    </Badge>
                  ) : isTaskFailed ? (
                    <Badge tone="red">
                      <XMarkIcon className="size-2.5 stroke-[3]" />
                    </Badge>
                  ) : isTaskActive ? (
                    <SpinnerRing active={true}>{i + 1}</SpinnerRing>
                  ) : (
                    <SpinnerRing active={false}>{i + 1}</SpinnerRing>
                  )}
                </span>

                {/* Task Label */}
                <span
                  className={`min-w-0 flex-1 truncate text-[11.5px] transition-colors duration-200 ${
                    isTaskDone
                      ? "font-medium text-gray-700 dark:text-zinc-200"
                      : isTaskActive
                      ? "font-bold text-gray-900 dark:text-zinc-100"
                      : isTaskFailed
                      ? "font-bold text-rose-600 dark:text-rose-400"
                      : "font-normal text-gray-500 dark:text-zinc-400"
                  }`}
                  title={task.label}
                >
                  {task.label}
                </span>

                {/* Pill Status Badge */}
                {isTaskDone ? (
                  <span
                    className="inline-flex h-4 items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 text-[9.5px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 shrink-0"
                    style={{ animation: "fade-in 200ms ease-out both" }}
                  >
                    Done
                  </span>
                ) : isTaskFailed ? (
                  <span
                    className="inline-flex h-4 items-center gap-1 rounded-full bg-rose-500/10 px-1.5 text-[9.5px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 shrink-0"
                    style={{ animation: "fade-in 200ms ease-out both" }}
                  >
                    Failed{" "}
                    <ArrowPathIcon className="size-2 stroke-[2.5] animate-spin" />
                  </span>
                ) : isTaskActive ? (
                  <span className="inline-flex h-4 items-center gap-1 rounded-full bg-indigo-500/10 px-1.5 text-[9.5px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0">
                    <ArrowPathIcon className="size-2 animate-spin stroke-[2.5]" />
                    Run
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 tabular-nums shrink-0">
                    {task.amount}
                  </span>
                )}

                {/* Expand Chevron Icon */}
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center text-gray-400 dark:text-zinc-500"
                >
                  <ChevronDownIcon
                    className="size-3 transition-transform duration-200"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
                  />
                </span>
              </button>

              {/* Dropdown Detail Steps */}
              <div
                className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
                style={{
                  gridTemplateRows: open ? "1fr" : "0fr",
                  opacity: open ? 1 : 0,
                }}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="mb-2 mt-0.5 grid grid-cols-[20px_1fr] gap-1.5 px-2">
                    <span
                      aria-hidden="true"
                      className="mx-auto h-full w-px bg-gray-200 dark:bg-zinc-700/80"
                    />
                    <div className="flex flex-col gap-1 py-0.5">
                      {task.details.map((d, j) => (
                        <div
                          key={d.label}
                          className="flex items-center justify-between gap-1.5"
                          style={
                            open
                              ? {
                                  animation: `fade-up 200ms cubic-bezier(0.23,1,0.32,1) ${
                                    50 + j * 40
                                  }ms both`,
                                }
                              : undefined
                          }
                        >
                          <span className="text-[10.5px] text-gray-600 dark:text-zinc-400 truncate">
                            {d.label}
                          </span>
                          <span className="font-mono text-[9.5px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded tabular-nums shrink-0">
                            {d.meta}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Progress Bar & Summary ── */}
      <div className="mt-2 pt-2 border-t border-gray-200/70 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400">
        <span className="font-medium">
          {completedCount} of {totalCount} completed
        </span>
        <div className="h-1 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isFailed ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{
              width: `${(completedCount / totalCount) * 100}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
}

