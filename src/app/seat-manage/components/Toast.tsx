import { cn } from "@/lib/utils";
import type { Notice } from "../types";

interface ToastProps {
  notice: Notice | null;
  onRetry: () => void;
}

export default function Toast({ notice, onRetry }: ToastProps) {
  if (!notice) return null;
  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 px-4 py-3 font-display text-sm font-bold tracking-wide border flex items-center gap-3",
        notice.type === "ok"
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-foreground border-foreground",
      )}
    >
      <span>{notice.msg}</span>
      {notice.retry && (
        <button
          onClick={onRetry}
          className="underline underline-offset-2 shrink-0 hover:no-underline"
        >
          재시도
        </button>
      )}
    </div>
  );
}
