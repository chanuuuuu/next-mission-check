"use client";

import { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";

const SESSION_KEY = "seat_manage_unlocked";

interface Props {
  children: React.ReactNode;
}

export default function PinGate({ children }: Props) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setIsUnlocked(true);
    } else {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seat-manage/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setIsUnlocked(true);
      } else {
        setError("PIN이 올바르지 않습니다");
        setPin("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setError("연결 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  if (isUnlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-foreground text-background flex items-center justify-center">
      <div className="w-full max-w-xs mx-auto px-6">
        <div className="flex flex-col items-center mb-10">
          <Lock className="h-8 w-8 mb-4 text-background/50" />
          <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-background/40">
            ADMIN · SEAT MANAGEMENT
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-2">
            관리자 인증
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="font-display text-[10px] font-bold tracking-[0.2em] uppercase block mb-3 text-background/50">
              PIN 번호
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              required
              className="w-full border-b-2 border-background/30 bg-transparent px-0 py-3 font-display text-2xl font-bold tracking-[0.5em] focus:outline-none focus:border-background placeholder:text-background/20 text-center"
            />
          </div>

          {error && (
            <div className="mb-6 border-l-2 border-brand px-4 py-2.5">
              <p className="font-display text-xs font-bold tracking-wide text-brand">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !pin}
            className="w-full bg-background text-foreground py-4 font-display font-bold tracking-wider uppercase text-sm hover:bg-brand hover:text-white transition-colors disabled:opacity-30 flex items-center justify-between px-6"
          >
            <span>{isLoading ? "확인 중..." : "입장"}</span>
            <span>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
