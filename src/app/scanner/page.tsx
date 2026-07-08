"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeQRPayload, encodeCheckinParam } from "@/lib/encode";
import { CHURCH_NAMES } from "@/lib/churches";

type ScanStatus = "idle" | "scanning" | "error";

// 카메라 캡처 해상도. 높을수록 QR이 더 선명하게 잡혀 먼 거리에서도 인식됨.
// 기본값(640x480)은 광각 렌즈에서 QR 픽셀이 부족해 가까이 대야 인식됨.
// 인식 거리 조정 시 이 값을 수정 (카메라 지원 최대치까지만 적용됨).
const CAPTURE_RESOLUTION = { width: 1920, height: 1080 };

export default function ScannerPage() {
  const router = useRouter();
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [duplicateToast, setDuplicateToast] = useState<string | null>(null);
  const duplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const reportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReportProblem = async () => {
    if (reportState !== "idle") return;
    setReportState("sending");
    await fetch("/api/report-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        status,
        detail: status === "error" ? errorMsg : "",
      }),
    }).catch(() => {});
    setReportState("sent");
    if (reportTimer.current) clearTimeout(reportTimer.current);
    reportTimer.current = setTimeout(() => setReportState("idle"), 3000);
  };

  const showDuplicateToast = (name: string) => {
    setDuplicateToast(name);
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current);
    duplicateTimer.current = setTimeout(() => setDuplicateToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (duplicateTimer.current) clearTimeout(duplicateTimer.current);
      if (reportTimer.current) clearTimeout(reportTimer.current);
    };
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatus("scanning");

    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;

    const decoded = decodeQRPayload(decodedText);
    const churchName = decoded ? CHURCH_NAMES[decoded.churchId] : undefined;

    if (!decoded || !churchName) {
      setStatus("error");
      setErrorMsg("유효하지 않은 QR 코드입니다.");
      await restartCamera();
      return;
    }

    const res = await fetch(`/api/checkins/check?churchId=${decoded.churchId}`)
    const { alreadyCheckedIn } = await res.json()

    if (alreadyCheckedIn) {
      showDuplicateToast(churchName)
      await restartCamera()
      return
    }

    router.push(`/checkin/${encodeCheckinParam(churchName, decoded.churchId)}`);
  };

  const restartCamera = async () => {
    setIsProcessing(false);
    setIsCameraReady(false);
    setStatus("idle");
    startCamera();
  };

  const startCamera = () => {
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 420, height: 420 },
            // config.videoConstraints가 있으면 첫 인자 대신 이게 적용됨 (해상도 상향 목적)
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: CAPTURE_RESOLUTION.width },
              height: { ideal: CAPTURE_RESOLUTION.height },
            },
          },
          handleScanSuccess,
          () => {},
        )
        .then(() => setIsCameraReady(true))
        .catch(() => {
          setStatus("error");
          setErrorMsg("카메라 접근 권한이 필요합니다.");
        });
    });
  };

  useEffect(() => {
    startCamera();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* html5-qrcode 주입 UI 숨김 */}
      <style>{`
        #qr-shaded-region { display: none !important; }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader__status_span { display: none !important; }
        #qr-reader img { display: none !important; }
      `}</style>

      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* 헤더 */}
        <header className="px-6 md:px-12 py-5 border-b border-white/15 flex justify-between items-center">
          <p className="font-display text-sm font-bold tracking-[0.25em] uppercase text-white/50">
            체크인 · STEP 2
          </p>
          <div className="flex items-center gap-3">
            <span className="size-2.5 rounded-full bg-brand animate-pulse" />
            <span className="font-display text-sm font-bold tracking-widest uppercase">
              {isProcessing ? "PROCESSING" : "LIVE"}
            </span>
          </div>
        </header>

        {/* 메인 뷰포트 */}
        <main className="flex-1 relative grid place-items-center overflow-hidden p-4 md:p-8">
          <div className="w-full max-w-5xl">
            {/* 카메라 영역 */}
            <div className="relative flex-1 aspect-video bg-neutral-900 overflow-hidden border border-white/10">
              <div id="qr-reader" className="w-full h-full" />

              {/* 스캔 프레임 오버레이 — 카메라 준비 후에만 표시 */}
              {isCameraReady && !isProcessing && (
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="relative size-[420px]">
                    <span
                      className="absolute inset-0 pointer-events-none overflow-hidden"
                      style={{ background: "var(--brand)", opacity: 0.15 }}
                    />
                    <span className="absolute inset-0 pointer-events-none overflow-hidden">
                      <span
                        className="absolute left-0 right-0 h-16 animate-[var(--animate-shimmer-scan)]"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
                        }}
                      />
                    </span>
                    <span className="absolute -top-1 -left-1 size-6 border-t-[3px] border-l-[3px] border-brand" />
                    <span className="absolute -top-1 -right-1 size-6 border-t-[3px] border-r-[3px] border-brand" />
                    <span className="absolute -bottom-1 -left-1 size-6 border-b-[3px] border-l-[3px] border-brand" />
                    <span className="absolute -bottom-1 -right-1 size-6 border-b-[3px] border-r-[3px] border-brand" />
                  </div>
                </div>
              )}

              {/* 처리 중 오버레이 */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/80 grid place-items-center">
                  <div className="text-center">
                    <span className="size-3 rounded-full bg-brand animate-pulse inline-block mb-3" />
                    <p className="font-display font-bold text-2xl uppercase tracking-tight">
                      인식 중...
                    </p>
                    <p className="text-sm text-white/50 mt-1.5">
                      잠시만 기다려주세요
                    </p>
                  </div>
                </div>
              )}

              {/* 상태 배지 */}
              <div className="absolute top-4 left-4">
                <span className="bg-black/70 backdrop-blur-sm border border-white/20 px-4 py-1.5 font-display text-sm font-bold tracking-widest uppercase">
                  {status === "error" ? "ERROR" : "SCANNING"}
                </span>
              </div>
            </div>
            <p className="mt-6 text-center text-xl font-display font-bold tracking-wide text-white/70">
              생성된 QR 코드를 카메라에 가져다 대주세요
            </p>
          </div>

          {/* 에러 툴팁 */}
          {status === "error" && errorMsg && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive text-white px-6 py-3 text-base font-bold font-display">
              ⚠ {errorMsg}
            </div>
          )}

          {/* 중복 체크인 알럿 */}
          {duplicateToast && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-8 py-4 text-xl font-bold font-display whitespace-nowrap">
              이미 체크인된 교회입니다 — {duplicateToast}
            </div>
          )}
        </main>

        {/* 푸터 */}
        <footer className="px-6 md:px-12 py-6 border-t border-white/15 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="size-3 rounded-full bg-brand animate-pulse" />
            <div>
              <p className="font-display font-bold text-2xl leading-none uppercase tracking-tight">
                QR 코드를 화면에 비춰주세요
              </p>
              <p className="text-sm text-white/50 mt-2">
                스캔 완료 시 이 화면에서 체크인 페이지로 이동합니다
              </p>
            </div>
          </div>
          <button
            onClick={handleReportProblem}
            disabled={reportState !== "idle"}
            className="bg-brand text-white px-8 py-4 font-display font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {reportState === "sending"
              ? "전송 중..."
              : reportState === "sent"
                ? "신고 접수됨 ✓"
                : "문제가 있어요"}
          </button>
        </footer>
      </div>
    </>
  );
}
