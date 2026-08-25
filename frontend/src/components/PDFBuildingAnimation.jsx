import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function PdfFileIcon({ className = "w-6 h-6", glow = false }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} ${glow ? "drop-shadow-[0_0_8px_rgba(245,184,35,0.6)]" : ""}`}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.25 13V9.24994H13.5C11.9812 9.24994 10.75 8.01872 10.75 6.49994V2.74995H6.8C5.94755 2.74995 5.35331 2.75054 4.89068 2.78834C4.43681 2.82542 4.17604 2.89455 3.97852 2.99519C3.55516 3.2109 3.21095 3.55511 2.99524 3.97848C2.8946 4.17599 2.82547 4.43676 2.78838 4.89063C2.75058 5.35327 2.75 5.9475 2.75 6.79995V17.2C2.75 18.0524 2.75058 18.6466 2.78838 19.1093C2.82547 19.5632 2.8946 19.8239 2.99524 20.0214C3.21095 20.4448 3.55516 20.789 3.97852 21.0047C4.26316 21.1498 4.65693 21.221 5.51779 21.2414C5.93188 21.2512 6.25961 21.5949 6.24979 22.009C6.23997 22.4231 5.89631 22.7508 5.48222 22.741C4.6126 22.7204 3.91224 22.6544 3.29754 22.3412C2.59193 21.9817 2.01825 21.408 1.65873 20.7024C1.43239 20.2582 1.33803 19.7781 1.29336 19.2314C1.24999 18.7005 1.24999 18.0449 1.25 17.2321V6.76785C1.24999 5.95502 1.24999 5.29939 1.29336 4.76849C1.33803 4.22185 1.43239 3.74171 1.65873 3.29749C2.01825 2.59188 2.59193 2.0182 3.29754 1.65868C3.74176 1.43234 4.2219 1.33798 4.76853 1.29332C5.29944 1.24994 5.95506 1.24995 6.7679 1.24995L10.8184 1.24992C11.1235 1.24963 11.3926 1.24938 11.6539 1.31212C11.8835 1.36724 12.103 1.45815 12.3043 1.58151C12.5335 1.72194 12.7235 1.91237 12.9391 2.12835L17.8716 7.06082C18.0876 7.27642 18.278 7.4665 18.4184 7.69565C18.5418 7.89696 18.6327 8.11644 18.6878 8.34602C18.7506 8.60736 18.7503 8.87642 18.75 9.18159L18.75 13C18.75 13.4142 18.4142 13.75 18 13.75C17.5858 13.75 17.25 13.4142 17.25 13ZM12.25 6.49994V3.56061L16.4393 7.74994H13.5C12.8096 7.74994 12.25 7.19029 12.25 6.49994ZM12.4529 2.70289L12.25 2.90583V2.88582L12.4529 2.70289Z"
        fill="#f5b823"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.75 15.9999C7.75 15.5857 8.08579 15.2499 8.5 15.2499H10.25C11.6307 15.2499 12.75 16.3692 12.75 17.7499C12.75 19.1307 11.6307 20.2499 10.25 20.2499H9.25V21.9999C9.25 22.4142 8.91421 22.7499 8.5 22.7499C8.08579 22.7499 7.75 22.4142 7.75 21.9999V15.9999ZM9.25 18.7499H10.25C10.8023 18.7499 11.25 18.3022 11.25 17.7499C11.25 17.1977 10.8023 16.7499 10.25 16.7499H9.25V18.7499Z"
        fill="#f5b823"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.25 15.9999C13.25 15.5857 13.5858 15.2499 14 15.2499H15.5C16.7426 15.2499 17.75 16.2573 17.75 17.4999V20.4999C17.75 21.7426 16.7426 22.7499 15.5 22.7499H14C13.8011 22.7499 13.6103 22.6709 13.4697 22.5303C13.329 22.3896 13.25 22.1989 13.25 21.9999V15.9999ZM14.75 16.7499V21.2499H15.5C15.9142 21.2499 16.25 20.9142 16.25 20.4999V17.4999C16.25 17.0857 15.9142 16.7499 15.5 16.7499H14.75Z"
        fill="#f5b823"
      />
      <path
        d="M18.75 15.9999C18.75 15.5857 19.0858 15.2499 19.5 15.2499H22C22.4142 15.2499 22.75 15.5857 22.75 15.9999C22.75 16.4142 22.4142 16.7499 22 16.7499H20.25V18.4999H22C22.4142 18.4999 22.75 18.8357 22.75 19.2499C22.75 19.6642 22.4142 19.9999 22 19.9999H20.25V21.9999C20.25 22.4142 19.9142 22.7499 19.5 22.7499C19.0858 22.7499 18.75 22.4142 18.75 21.9999V15.9999Z"
        fill="#f5b823"
      />
    </svg>
  );
}

const STAGES = [700, 800, 900, 700];

const PDF_STEPS = [
  { primary: "Formatting threat analysis & executive verdict", secondary: "ReportLab" },
  { primary: "Decoding and embedding high-res visual screenshot", secondary: "Base64" },
  { primary: "Compiling WHOIS, SSL and technical telemetry grid", secondary: "Telemetry" },
  { primary: "Assembling vector security document", secondary: "Ready" },
];

export default function PDFBuildingAnimation({ onSettled, hasScreenshot = true }) {
  const [stage, setStage] = useState(0);
  const [manualExpanded, setManualExpanded] = useState(null);
  const traceRef = useRef(null);
  const [lineHeight, setLineHeight] = useState(0);

  // Sequence progression timer
  useEffect(() => {
    if (stage >= STAGES.length) return;
    const t = setTimeout(() => setStage((s) => s + 1), STAGES[stage]);
    return () => clearTimeout(t);
  }, [stage]);

  const working = stage < STAGES.length;
  const autoExpanded = stage >= 1 && stage < STAGES.length;
  const expanded = manualExpanded ?? autoExpanded;
  const visibleCount = Math.min(stage + 1, PDF_STEPS.length);

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visibleCount, expanded, stage]);

  // Trigger settled callback once the building sequence finishes
  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    const timer = setTimeout(() => {
      onSettled?.();
    }, 350);
    return () => clearTimeout(timer);
  }, [working, onSettled]);

  return (
    <div className="w-full flex flex-col my-3 transition-all duration-300">
      {/* Header Button */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))}
        className="-mx-1.5 flex w-fit items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer select-none"
      >
        <div className="shrink-0 flex items-center justify-center">
          <PdfFileIcon className="w-5 h-5" glow={working} />
        </div>

        <span role="status" className="contents">
          {working ? (
            <span
              className="text-[13px] font-semibold tracking-tight text-amber-600 dark:text-amber-400"
              style={{
                background: "linear-gradient(90deg, #f7aa1d 30%, #fef08a 50%, #f7aa1d 70%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s linear infinite",
              }}
            >
              Generating PDF Security Report...
            </span>
          ) : (
            <span className="text-[13px] font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
              PDF Security Report Generated
            </span>
          )}
        </span>

        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-300 ${
            expanded ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Expandable Step Trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out overflow-hidden"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1.5 ml-2.5 pl-3.5 border-l border-amber-500/30 dark:border-amber-400/20 py-1">
            <div ref={traceRef} className="flex flex-col gap-1.5">
              {PDF_STEPS.slice(0, visibleCount).map((step, idx) => {
                const isStepDone = idx < stage;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 text-[12px] font-medium text-gray-700 dark:text-gray-300 py-0.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isStepDone ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[9px] font-black shrink-0">
                          ✓
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                      )}
                      <span className="truncate">{step.primary}</span>
                    </div>
                    {step.secondary && (
                      <span className="text-[10.5px] font-mono text-gray-400 shrink-0 uppercase tracking-wider">
                        {step.secondary}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
