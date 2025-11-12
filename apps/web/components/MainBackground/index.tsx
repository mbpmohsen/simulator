"use client";

import React, { useRef } from "react";

export default function AnimatedBattleBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 w-full h-full overflow-hidden bg-black text-white z-0"
        >
            {/* Background gradient and glow */}
            <div className="absolute inset-0" style={{
                background: `
          linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,0.5)),
          radial-gradient(1000px 600px at 50% 50%, rgba(99,102,241,.08), transparent 70%),
          radial-gradient(1200px 600px at 30% 70%, rgba(239,68,68,.08), transparent 70%),
          repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 64px),
          repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 64px)
        `
            }}>
                <div className="w-full h-full animate-gridPan" />
            </div>

            {/* Subtle scanlines */}
            <div className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-[0.10] bg-[repeating-linear-gradient(180deg,rgba(255,255,255,.12)_0_2px,transparent_2px_6px)] animate-scanlines" />
            <style>{`
        .animate-gridPan { animation: gridPan 12s linear infinite; }
        @keyframes gridPan { from { transform: translate3d(0,0,0); } to { transform: translate3d(64px,64px,0); } }
        .animate-scanlines { animation: scanlines 10s linear infinite; }
        @keyframes scanlines { 0%{ background-position:0 0 } 100%{ background-position:0 100% } }
      `}</style>
        </div>
    );
}
