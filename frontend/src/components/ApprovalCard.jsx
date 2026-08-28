import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";

/* ─────────────────────────────────────────────────────────
 * APPROVAL CARD (human-in-the-loop)
 * One question at a time. The stack slides vertically as you
 * move between questions (the card's height animates to fit),
 * the step counter rolls like an odometer, and the footer uses
 * pill actions — a quiet Skip and a dark Continue with a ⏎.
 * Single-choice answers auto-advance; multi-select waits.
 * ───────────────────────────────────────────────────────── */

const DEFAULT_QUESTIONS = [
  {
    id: "accuracy",
    q: "How accurate was the AI threat assessment?",
    type: "radio",
    options: [
      "Spot on & accurate",
      "Somewhat accurate",
      "Incorrect / False Positive",
      "Missed a threat",
    ],
  },
  {
    id: "features",
    q: "Which analysis signals were most helpful?",
    type: "check",
    options: [
      "Visual logo match & Siamese ML",
      "HTML / DOM structural heuristics",
      "Domain age, WHOIS & SSL telemetry",
      "Executive PDF report export",
    ],
  },
  {
    id: "experience",
    q: "How is your overall experience with PhishLens?",
    type: "radio",
    options: [
      "Excellent & fast",
      "Good, but could improve",
      "Too slow or heavy",
      "Needs additional features",
    ],
  },
];

const ROLL_MS = 400;
const SLIDE = "360ms cubic-bezier(0.22, 1, 0.36, 1)";

/* odometer digits — each character that changes rolls up (or down) */
function RollingDigits({ value }) {
  const prevRef = useRef(value);
  const [oldVal, setOldVal] = useState(value);
  const [newVal, setNewVal] = useState(value);
  const [rolling, setRolling] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [dir, setDir] = useState("up");

  useEffect(() => {
    if (prevRef.current === value) return;
    const from = prevRef.current;
    prevRef.current = value;
    const fromN = parseInt(from, 10);
    const toN = parseInt(value, 10);
    setDir(Number.isFinite(fromN) && Number.isFinite(toN) && toN < fromN ? "down" : "up");
    setOldVal(from);
    setNewVal(value);
    setRolling(true);
    setShifted(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShifted(true));
    });
    const done = setTimeout(() => {
      setRolling(false);
      setOldVal(value);
      setShifted(false);
    }, ROLL_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(done);
    };
  }, [value]);

  const chars = rolling ? newVal : oldVal;

  return (
    <>
      {Array.from({ length: chars.length }, (_, i) => {
        const o = oldVal[i] ?? "";
        const n = chars[i] ?? "";
        if (!rolling || o === n) {
          return <span key={`${i}-${n}`}>{n}</span>;
        }
        const top = dir === "down" ? n : o;
        const bottom = dir === "down" ? o : n;
        const restY = dir === "down" ? "0" : "-1em";
        const startY = dir === "down" ? "-1em" : "0";
        return (
          <span
            key={`${i}-${o}-${n}-${dir}`}
            style={{
              display: "inline-block",
              position: "relative",
              overflow: "hidden",
              height: "1em",
              lineHeight: "1em",
              verticalAlign: "-0.05em",
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
                transform: `translateY(${shifted ? restY : startY})`,
              }}
            >
              <span style={{ height: "1em", lineHeight: "1em" }}>{top}</span>
              <span style={{ height: "1em", lineHeight: "1em" }}>{bottom}</span>
            </span>
          </span>
        );
      })}
    </>
  );
}

function Ico({ path, size = 14, sw = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path}
    </svg>
  );
}

export default function ApprovalCard({
  isOpen = true,
  onClose,
  onSubmitted,
  chatId,
  messageId,
  targetUrl,
  llmResponse,
  questions = DEFAULT_QUESTIONS,
  resettable = true,
}) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [custom, setCustom] = useState({});
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(isOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const advanceTimer = useRef(null);
  const questionRefs = useRef([]);
  const measured = useRef(false);
  const [viewportH, setViewportH] = useState(undefined);
  const [trackY, setTrackY] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [ready, setReady] = useState(false);

  // Synchronize open state and reset question index if questions change
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setQi(0);
    setAnswers({});
    setCustom({});
    setSent(false);
  }, [questions, chatId, messageId]);

  const activeQuestions = questions && questions.length > 0 ? questions : DEFAULT_QUESTIONS;
  const currentQ = activeQuestions[qi] || activeQuestions[0];
  const last = qi === activeQuestions.length - 1;
  const selected = answers[qi] ?? [];
  const hasAnswer = selected.length > 0 || Boolean(custom[qi]?.trim());

  const sync = (withAnim) => {
    const item = questionRefs.current[qi];
    if (!item) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setViewportH(item.offsetHeight);
    setTrackY(item.offsetTop);
    setAnimate(withAnim && !reduce);
  };

  useLayoutEffect(() => {
    const withAnim = measured.current;
    measured.current = true;
    sync(withAnim);
    setReady(true);
  }, [qi, answers, custom, open, sent, questions]);

  useEffect(() => {
    const id = requestAnimationFrame(() => sync(measured.current));
    return () => cancelAnimationFrame(id);
  }, [qi, questions]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const goTo = (next) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setQi(Math.min(Math.max(next, 0), activeQuestions.length - 1));
  };

  const send = async () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Compile payload
    const formattedResponses = {};
    activeQuestions.forEach((q, idx) => {
      const selectedIndices = answers[idx] ?? [];
      const selectedLabels = selectedIndices.map((i) => q.options[i]).filter(Boolean);
      const customText = custom[idx] ? custom[idx].trim() : "";
      formattedResponses[idx] = {
        id: q.id || `q_${idx}`,
        question: q.q,
        type: q.type,
        selected: selectedLabels,
        custom: customText,
      };
    });

    const payload = {
      chat_id: chatId || undefined,
      message_id: messageId || undefined,
      target_url: targetUrl || undefined,
      llm_response_summary: llmResponse || undefined,
      feedback_type: "hitl_approval",
      responses: formattedResponses,
    };

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:8000/api/feedback/", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok || data.status === "already_submitted") {
        setSent(true);
        if (addToast) {
          addToast({
            type: "success",
            title: data.status === "already_submitted" ? "Feedback Already Recorded" : "Feedback Recorded",
            message: data.message || "Thank you! Your feedback helps calibrate our multi-agent detection.",
            duration: 3500,
          });
        }
        onSubmitted?.(payload);
      } else {
        throw new Error(data.error || "Failed to submit feedback");
      }
    } catch (err) {
      console.error("Feedback submit error:", err);
      // Even if network error occurs, show confirmed in UI
      setSent(true);
      onSubmitted?.(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const advance = () => {
    if (last) send();
    else goTo(qi + 1);
  };

  const toggle = (index) => {
    const type = currentQ.type;
    setAnswers((current) => {
      const picked = current[qi] ?? [];
      const next = type === "radio"
        ? [index]
        : picked.includes(index)
          ? picked.filter((item) => item !== index)
          : [...picked, index];
      return { ...current, [qi]: next };
    });
    if (type === "radio") {
      setCustom((current) => ({ ...current, [qi]: "" }));
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        if (last) send();
        else setQi((current) => Math.min(activeQuestions.length - 1, current + 1));
      }, 480);
    }
  };

  const reset = () => {
    setQi(0);
    setAnswers({});
    setCustom({});
    setSent(false);
    setOpen(true);
    measured.current = false;
  };

  const handleDismiss = () => {
    setOpen(false);
    onClose?.();
  };

  if (!open) {
    return (
      <div className="flex justify-center pb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200/90 dark:border-zinc-700/80 bg-white/90 dark:bg-[#222]/90 backdrop-blur-md px-3.5 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 shadow-md transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C15B2B] opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-[#C15B2B]"></span>
          </span>
          Give Feedback
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div
        className="w-full max-w-sm mx-auto mb-2 flex items-center justify-between rounded-2xl border border-green-500/30 bg-green-50/95 dark:bg-green-950/50 backdrop-blur-xl px-4 py-2.5 shadow-lg"
        style={{ animation: "pop-in 260ms cubic-bezier(0.23,1,0.32,1) both" }}
      >
        <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 text-green-800 dark:text-green-300">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400"></span>
            <span className="relative inline-flex size-3 rounded-full bg-green-500"></span>
          </span>
          Answers recorded
        </span>
        <div className="flex items-center gap-2">
          {resettable && (
            <button
              type="button"
              onClick={reset}
              className="text-[12px] font-medium text-green-700 hover:text-green-950 dark:text-green-300 dark:hover:text-white transition-colors cursor-pointer"
            >
              Start over
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-green-700 hover:text-green-950 dark:text-green-300 dark:hover:text-white cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <Ico size={13} sw={2.5} path={<path d="M18 6L6 18M6 6l12 12" />} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto mb-2 pointer-events-auto select-none">
      <div
        className="relative overflow-hidden rounded-2xl border border-gray-200/90 dark:border-zinc-800 bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur-xl shadow-2xl transition-all"
        style={{ animation: "fade-up 380ms cubic-bezier(0.23,1,0.32,1) both" }}
      >
        {/* Dismiss Button (Top Right) */}
        <button
          type="button"
          aria-label="Dismiss feedback"
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <Ico size={13} sw={2.2} path={<path d="M18 6L6 18M6 6l12 12" />} />
        </button>

        {/* Header Badge with Pulsing Ping */}
        <div className="px-4 pt-3.5 pb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[#C15B2B] uppercase">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C15B2B] opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-[#C15B2B]"></span>
          </span>
          Quick Feedback
        </div>

        {/* Questions Carousel Body */}
        <div className="px-4 pt-1 pb-3">
          <div
            className="overflow-hidden"
            style={{ height: viewportH, transition: animate ? `height ${SLIDE}` : undefined }}
            aria-live="polite"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                transform: `translate3d(0, ${-trackY}px, 0)`,
                transition: animate ? `transform ${SLIDE}` : undefined,
                willChange: "transform",
              }}
            >
              {activeQuestions.map((question, qIdx) => {
                const active = qIdx === qi;
                if (!ready && !active) return null;
                const picked = answers[qIdx] ?? [];
                return (
                  <div
                    key={qIdx}
                    ref={(el) => { questionRefs.current[qIdx] = el; }}
                    aria-hidden={active ? undefined : true}
                    style={{
                      opacity: active ? 1 : 0,
                      transition: animate ? `opacity ${SLIDE}` : undefined,
                      pointerEvents: active ? undefined : "none",
                    }}
                  >
                    <div className="pr-6 text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                      {question.q}
                    </div>

                    {/* Options list */}
                    <div className="mt-2.5 flex flex-col gap-1">
                      {question.options.map((option, i) => {
                        const on = picked.includes(i);
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={on}
                            tabIndex={active ? 0 : -1}
                            onClick={() => { if (active) toggle(i); }}
                            className={`group relative z-10 flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer ${
                              on
                                ? "bg-[#C15B2B]/10 dark:bg-[#C15B2B]/20 text-[#C15B2B] dark:text-[#E07A4B] font-medium"
                                : "hover:bg-gray-100/80 dark:hover:bg-zinc-800/80 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center transition-all duration-200 ${
                                question.type === "radio" ? "rounded-full" : "rounded-md"
                              } ${
                                on
                                  ? "bg-[#C15B2B] text-white shadow-xs"
                                  : "border border-gray-300 dark:border-zinc-600 bg-transparent"
                              }`}
                            >
                              {question.type === "radio" ? (
                                <span
                                  className="size-1.5 rounded-full bg-white transition-transform duration-200"
                                  style={{ transform: on ? "scale(1)" : "scale(0)" }}
                                />
                              ) : (
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ opacity: on ? 1 : 0 }}
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            <span className="text-[12.5px] leading-tight select-none">
                              {option}
                            </span>
                          </button>
                        );
                      })}

                      {/* Custom "Something else..." text input */}
                      <div className="relative mt-1 flex items-center rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/60 px-2.5 py-1.5 focus-within:border-[#C15B2B]/60 focus-within:ring-1 focus-within:ring-[#C15B2B]/30 transition-all">
                        <input
                          value={custom[qIdx] ?? ""}
                          tabIndex={active ? 0 : -1}
                          onChange={(event) => {
                            if (!active) return;
                            setCustom((current) => ({ ...current, [qIdx]: event.target.value }));
                            if (question.type === "radio") setAnswers((current) => ({ ...current, [qIdx]: [] }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && hasAnswer) {
                              event.preventDefault();
                              advance();
                            }
                          }}
                          placeholder="Something else or comment…"
                          aria-label="Custom answer"
                          className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/30 px-3.5 py-2">
          {/* Step Nav (Rolling digits counter) */}
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <button
              type="button"
              aria-label="Previous question"
              disabled={qi <= 0}
              onClick={() => goTo(qi - 1)}
              className="flex size-5 items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
            >
              <Ico size={12} sw={2.5} path={<path d="M15 18l-6-6 6-6" />} />
            </button>
            <span className="inline-flex items-center text-[11.5px] font-semibold tabular-nums tracking-tight">
              <RollingDigits value={`${qi + 1} / ${activeQuestions.length}`} />
            </span>
            <button
              type="button"
              aria-label="Next question"
              disabled={last}
              onClick={() => goTo(qi + 1)}
              className="flex size-5 items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
            >
              <Ico size={12} sw={2.5} path={<path d="M9 18l6-6-6-6" />} />
            </button>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => (last ? handleDismiss() : goTo(qi + 1))}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={!hasAnswer || isSubmitting}
              onClick={advance}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                hasAnswer && !isSubmitting
                  ? "bg-[#C15B2B] hover:bg-[#A84A1F] text-white shadow-sm hover:scale-[1.02] active:scale-95"
                  : "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 opacity-60"
              }`}
            >
              {isSubmitting ? (
                <span className="flex size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : last ? (
                "Send"
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
