'use client'

import { useState } from 'react'

interface Props {
  onScan: (decodedText: string) => void
}

export function MockScannerPanel({ onScan }: Props) {
  const [value, setValue] = useState('{"churchId": 1}')

  return (
    <div className="border border-dashed border-brand/60 p-4 bg-brand/5 w-full max-w-xs">
      <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-brand mb-3">
        DEV — 강제 스캔 트리거
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        className="w-full border border-brand/30 bg-white text-sm p-2 outline-none font-mono resize-none"
      />
      <button
        onClick={() => onScan(value)}
        className="mt-2 w-full bg-brand text-white py-2 font-display font-bold text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
      >
        강제 스캔 트리거
      </button>
    </div>
  )
}
