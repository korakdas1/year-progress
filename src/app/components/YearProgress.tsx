"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { getQuoteForDay } from "../data/quotes";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getMonthBoundaries(year: number): { label: string; startDay: number }[] {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return months.map((label, i) => {
    const start = new Date(year, 0, 0);
    const monthStart = new Date(year, i, 1);
    const diff = monthStart.getTime() - start.getTime();
    return { label, startDay: Math.floor(diff / (1000 * 60 * 60 * 24)) };
  });
}

export default function YearProgress() {
  const [now, setNow] = useState<Date | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Register service worker & listen for install prompt
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const year = now?.getFullYear() ?? new Date().getFullYear();
  const totalDays = useMemo(() => getDaysInYear(year), [year]);
  const currentDay = now ? getDayOfYear(now) : 0;
  const months = useMemo(() => getMonthBoundaries(year), [year]);
  const quote = useMemo(() => getQuoteForDay(currentDay), [currentDay]);

  const cols = 19;
  const percentage = now ? ((currentDay / totalDays) * 100).toFixed(1) : "0.0";

  if (!now) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center w-full min-h-screen px-4 py-10 select-none">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-light tracking-widest text-zinc-200 font-mono">
          {year}
        </h1>
        <p className="mt-2 text-sm tracking-wider text-zinc-500 font-mono uppercase">
          Year Progress
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono mb-1.5">
          <span>Day {currentDay} of {totalDays}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Dot grid */}
      <div className="w-full max-w-xl">
        {/* Month markers */}
        <div className="relative mb-1 h-5">
          {months.map((m) => {
            const col = (m.startDay - 1) % cols;
            const leftPercent = ((col + 0.5) / cols) * 100;
            const row = Math.floor((m.startDay - 1) / cols);
            const show = row === 0 || m.startDay <= cols;
            return show ? (
              <span
                key={m.label}
                className="absolute text-[10px] text-zinc-600 font-mono -translate-x-1/2"
                style={{ left: `${leftPercent}%` }}
              >
                {m.label}
              </span>
            ) : null;
          })}
        </div>

        <div
          className="grid gap-[5px] sm:gap-[6px] justify-center"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const isPast = day < currentDay;
            const isCurrent = day === currentDay;
            const isFuture = day > currentDay;

            // Month label row markers
            const monthStart = months.find((m) => m.startDay === day);
            const isMonthStart = !!monthStart;

            return (
              <div
                key={day}
                title={`Day ${day}${isMonthStart ? ` — ${monthStart!.label} 1` : ""}`}
                className={`
                  aspect-square rounded-full transition-all duration-300
                  ${isPast ? "bg-zinc-600/70 scale-100" : ""}
                  ${isCurrent ? "bg-cyan-400 scale-110" : ""}
                  ${isFuture ? "border border-zinc-700/60 bg-transparent" : ""}
                  ${isMonthStart && !isCurrent ? "ring-1 ring-zinc-600/40" : ""}
                `}
                style={
                  isCurrent
                    ? { animation: "pulse-glow 2.4s ease-in-out infinite" }
                    : undefined
                }
              />
            );
          })}
        </div>

        {/* Month legend below grid */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-6">
          {months.map((m) => {
            const isPastMonth = m.startDay < currentDay;
            return (
              <span
                key={m.label}
                className={`text-[10px] font-mono tracking-wider ${
                  isPastMonth ? "text-zinc-500" : "text-zinc-700"
                }`}
              >
                {m.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Daily quote */}
      <div className="mt-10 text-center max-w-md">
        <p className="text-xs text-zinc-500 font-mono italic tracking-wide leading-relaxed">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="mt-1.5 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
          — {quote.author}
        </p>
      </div>

      {/* Install button */}
      {!isInstalled && deferredPrompt && (
        <button
          onClick={handleInstall}
          className="mt-8 px-6 py-2.5 rounded-full border border-zinc-700 text-xs font-mono tracking-wider text-zinc-400 hover:text-zinc-200 hover:border-cyan-800 hover:bg-cyan-950/30 transition-all duration-300 active:scale-95"
        >
          Install App
        </button>
      )}

      {/* iOS install hint */}
      {!isInstalled && !deferredPrompt && (
        <p className="mt-8 text-[10px] text-zinc-700 font-mono tracking-wide text-center">
          Tip: Add to Home Screen from your browser menu to use as an app
        </p>
      )}
    </div>
  );
}
