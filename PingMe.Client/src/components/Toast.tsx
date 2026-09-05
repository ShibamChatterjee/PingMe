import { useEffect } from "react";

interface Props {
  msg: string;
  onDone: () => void;
  durationMs?: number;
}

export function Toast({ msg, onDone, durationMs = 3500 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [onDone, durationMs]);

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast">
        <div className="toast-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div className="toast-msg">{msg}</div>
        <button
          className="toast-close"
          onClick={onDone}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
