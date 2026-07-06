"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash } from "lucide-react";
import { encodeAccommodationLookupParam } from "@/lib/encode";

export default function SearchAccommodationPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const number = parseInt(value, 10);
    if (isNaN(number)) {
      setError("숫자로 된 번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/accommodations/lookup?number=${number}`);
      if (!res.ok) {
        setError("등록되지 않은 번호입니다.");
        return;
      }
      const { churchId, churchName } = (await res.json()) as {
        churchId: number;
        churchName: string;
      };
      router.push(
        `/accommodation/${encodeAccommodationLookupParam(churchName, churchId, number)}`,
      );
    } catch {
      setError("조회 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-background border border-foreground p-8"
        >
          <div className="flex items-center gap-2 text-brand mb-2">
            <Hash size={16} />
            <span className="font-display text-xs font-bold tracking-[0.25em] uppercase">
              2026 영동 선교
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            숙소 배정 조회
          </h1>
          <p className="text-base text-muted-foreground mt-3 mb-8">
            본인 명찰 번호를 입력하세요.
          </p>
          <label className="block">
            <span className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground">
              번호
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="예: 0024"
              autoFocus
              className="mt-2 w-full border-2 border-foreground px-3 py-3 outline-none bg-background text-lg tracking-widest"
            />
          </label>
          {error && (
            <p className="mt-3 text-sm text-brand font-display font-bold uppercase tracking-widest">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!value.trim() || loading}
            className="mt-6 w-full py-3.5 bg-foreground text-background font-display font-bold uppercase tracking-widest text-sm hover:bg-brand transition-colors disabled:opacity-40"
          >
            {loading ? "조회 중..." : "조회"}
          </button>
        </form>
      </div>
    </div>
  );
}
