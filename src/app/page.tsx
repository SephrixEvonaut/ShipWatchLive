"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";

const COMMITS: { hash: string; msg: string; author: string; severity: "critical" | "warning" | "ok"; time: string; detail: string }[] = [
  {
    hash: "a3f91c2",
    msg: "feat: add OAuth2 refresh token rotation",
    author: "sarah.k",
    severity: "ok",
    time: "2m ago",
    detail: "Clean implementation, proper token invalidation",
  },
  {
    hash: "e7b04d1",
    msg: "fix: patch SQL injection in /api/users",
    author: "dev_marcus",
    severity: "critical",
    time: "8m ago",
    detail: "Unsanitized input in query builder — HIGH RISK",
  },
  {
    hash: "c22fa89",
    msg: "refactor: migrate auth middleware to Edge",
    author: "lina.tsx",
    severity: "warning",
    time: "14m ago",
    detail: "Missing error boundary in streaming response",
  },
  {
    hash: "9d1e3b7",
    msg: "chore: bump dependencies, remove lodash",
    author: "bot-deps",
    severity: "ok",
    time: "21m ago",
    detail: "All packages within semver range, no breaking changes",
  },
  {
    hash: "f08cc41",
    msg: "feat: implement WebSocket reconnect logic",
    author: "sarah.k",
    severity: "warning",
    time: "33m ago",
    detail: "Exponential backoff missing jitter — potential thundering herd",
  },
];

const STATS = [
  { label: "Commits Scanned", value: "1.2M+", sub: "Last 30 days" },
  { label: "Issues Caught", value: "38,400", sub: "Before production" },
  { label: "Avg Response", value: "<4s", sub: "Per commit analysis" },
  { label: "Repos Monitored", value: "12,000+", sub: "Across all users" },
];

const FEATURES = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Security Scanning",
    desc: "Detects SQL injection, XSS, dependency vulnerabilities, and secret exposure in every commit automatically.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Real-time Alerts",
    desc: "Instant notifications on Slack, Discord, or email the moment a critical issue hits your codebase.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "AI Code Review",
    desc: "Context-aware suggestions powered by LLMs that understand your codebase patterns and team conventions.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: "Dashboard Analytics",
    desc: "Track code quality trends, team velocity, and technical debt accumulation across all connected repos.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Syntax & Lint",
    desc: "Catches syntax errors, dead code, unused imports, and anti-patterns with zero-config detection rules.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-6 h-6"
      >
        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Team Permissions",
    desc: "Granular repo access controls. Each team member connects their GitHub and selects repos to monitor.",
  },
];

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "ok" }) {
  const styles = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    ok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  const labels = { critical: "Critical", warning: "Warning", ok: "Passed" };
  return (
    <span
      className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${styles[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}

function AnimatedCounter({ value, duration = 2000 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setStarted(true);
      },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
    const prefix = value.match(/^[^0-9]*/)?.[0] || "";
    const suffix = value.match(/[^0-9.]*$/)?.[0] || "";
    const hasDecimal = value.includes(".");
    const steps = 40;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numeric * eased;
      const formatted = hasDecimal
        ? current.toFixed(1)
        : Math.floor(current).toLocaleString();
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, value, duration]);

  return <span ref={ref}>{display}</span>;
}

function TerminalLine({ text, delay }: { text: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <span className="text-emerald-500 select-none">❯ </span>
      <span className="text-zinc-300">{text}</span>
    </div>
  );
}

function GlowOrb({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`}
      style={style}
    />
  );
}

export default function LandingPage() {
  const [activeCommit, setActiveCommit] = useState(1);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .font-display { font-family: 'Outfit', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes scan-line { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-in-right { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes typewriter { from { width: 0; } to { width: 100%; } }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-fade-up { animation: fade-up 0.8s ease-out both; }
        .animate-slide-in { animation: slide-in-right 0.6s ease-out both; }

        .grid-bg {
          background-image:
            linear-gradient(rgba(39,39,42,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(39,39,42,0.4) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .commit-row:hover .commit-hash { color: #34d399; }
        .glass { background: rgba(24,24,27,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(63,63,70,0.4); }
        .glass-hover:hover { background: rgba(39,39,42,0.5); border-color: rgba(52,211,153,0.3); }

        .cta-btn {
          background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
          box-shadow: 0 0 30px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
          transition: all 0.3s ease;
        }
        .cta-btn:hover {
          box-shadow: 0 0 50px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        .noise {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.03; pointer-events: none; z-index: 0;
        }
      `}</style>

      <div className="noise" />

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 glass border-t-0 border-x-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                className="w-4 h-4"
              >
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Ship<span className="text-emerald-400">Watch</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-display">
            <a
              href="#features"
              className="hover:text-zinc-100 transition-colors"
            >
              Features
            </a>
            <a href="#how" className="hover:text-zinc-100 transition-colors">
              How it Works
            </a>
            <a
              href="#pricing"
              className="hover:text-zinc-100 transition-colors"
            >
              Pricing
            </a>
            <a href="#" className="hover:text-zinc-100 transition-colors">
              Docs
            </a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/sign-in">
              <button className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors font-display px-4 py-2">
                Sign in
              </button>
            </Link>
            <Link href="/auth/sign-up">
              <button className="text-sm font-display font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg transition-all">
                Get Started Free
              </button>
            </Link>
          </div>
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden text-zinc-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-6 h-6"
            >
              {mobileMenu ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-zinc-800 px-6 py-4 flex flex-col gap-3 font-display text-sm">
            <a href="#features" className="text-zinc-400 py-2">
              Features
            </a>
            <a href="#how" className="text-zinc-400 py-2">
              How it Works
            </a>
            <a href="#pricing" className="text-zinc-400 py-2">
              Pricing
            </a>
            <button className="mt-2 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold">
              Get Started Free
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 grid-bg">
        <GlowOrb className="w-[600px] h-[600px] bg-emerald-600/20 -top-40 -left-40 animate-pulse-glow" />
        <GlowOrb
          className="w-[400px] h-[400px] bg-cyan-600/10 top-20 right-0 animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Monitoring 12,000+ repos in real-time
            </div>
            <h1 className="font-display font-800 text-4xl sm:text-5xl md:text-7xl leading-[0.95] tracking-tight mb-6">
              Every commit.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400">
                Analyzed.
              </span>
              <br />
              <span className="text-zinc-500">Before it ships.</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl font-display font-light max-w-xl leading-relaxed mb-10">
              Connect your GitHub repos and let AI surface security flaws,
              syntax errors, and code quality issues — automatically, on every
              push.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="cta-btn text-white font-display font-semibold px-8 py-3.5 rounded-xl text-base flex items-center justify-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Connect with GitHub
              </button>
              <button className="font-display font-medium text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 px-8 py-3.5 rounded-xl transition-all text-base">
                Watch Demo →
              </button>
            </div>
          </div>

          {/* LIVE FEED PREVIEW */}
          <div
            className="mt-16 md:mt-20 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    shipwatch — live feed
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </div>
              </div>
              {/* Commit rows */}
              <div className="divide-y divide-zinc-800/40">
                {COMMITS.map((c, i) => (
                  <div
                    key={c.hash}
                    className={`commit-row flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 cursor-pointer transition-all duration-200 ${
                      activeCommit === i
                        ? "bg-zinc-800/40"
                        : "hover:bg-zinc-900/50"
                    }`}
                    onClick={() => setActiveCommit(i)}
                  >
                    <code className="commit-hash text-xs font-mono text-zinc-600 transition-colors shrink-0">
                      {c.hash}
                    </code>
                    <span className="text-sm text-zinc-200 font-display truncate flex-1">
                      {c.msg}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-zinc-600 hidden lg:inline">
                        @{c.author}
                      </span>
                      <SeverityBadge severity={c.severity} />
                      <span className="text-[11px] font-mono text-zinc-600 w-14 text-right">
                        {c.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Detail panel */}
              <div className="border-t border-zinc-800/60 px-5 py-4 bg-zinc-900/30">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      COMMITS[activeCommit].severity === "critical"
                        ? "bg-red-400"
                        : COMMITS[activeCommit].severity === "warning"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-mono text-zinc-500 mb-1">
                      AI Analysis — {COMMITS[activeCommit].hash}
                    </p>
                    <p className="text-sm text-zinc-300 font-display">
                      {COMMITS[activeCommit].detail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative py-20 border-y border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((s, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="font-display font-800 text-3xl md:text-4xl text-zinc-100 mb-1">
                  <AnimatedCounter value={s.value} />
                </div>
                <div className="font-display text-sm text-zinc-400">
                  {s.label}
                </div>
                <div className="font-mono text-[10px] text-zinc-600 mt-1">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-24 md:py-32">
        <GlowOrb className="w-[500px] h-[500px] bg-emerald-700/10 bottom-0 right-20" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="font-mono text-xs text-emerald-500 tracking-widest uppercase">
              How It Works
            </span>
            <h2 className="font-display font-800 text-3xl md:text-5xl mt-4 tracking-tight">
              Three steps to
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                bulletproof code
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Connect GitHub",
                desc: "OAuth in one click. Select the repos you want monitored — private or public. Granular permissions, nothing more.",
                terminal: [
                  "$ shipwatch auth --provider github",
                  "✓ Authenticated as @evonaut",
                  "✓ 14 repositories accessible",
                ],
              },
              {
                step: "02",
                title: "Push Code",
                desc: "Every commit and PR triggers an instant AI analysis. We scan for vulnerabilities, errors, anti-patterns, and style issues.",
                terminal: [
                  "$ git push origin main",
                  "→ shipwatch scanning 3 files...",
                  "⚠ 1 warning, 0 critical found",
                ],
              },
              {
                step: "03",
                title: "Review & Fix",
                desc: "Get actionable insights in your dashboard with severity ratings, inline suggestions, and one-click fixes.",
                terminal: [
                  "$ shipwatch report --latest",
                  "✓ Report generated: /reports/a3f91c2",
                  "✓ 2 auto-fix suggestions ready",
                ],
              },
            ].map((item, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 md:p-8 glass-hover transition-all duration-300 group"
              >
                <span className="font-mono text-emerald-600 text-xs font-bold tracking-widest">
                  {item.step}
                </span>
                <h3 className="font-display font-bold text-xl mt-3 mb-3">
                  {item.title}
                </h3>
                <p className="text-zinc-400 text-sm font-display leading-relaxed mb-6">
                  {item.desc}
                </p>
                <div className="bg-zinc-950 rounded-xl p-4 font-mono text-xs space-y-1.5 border border-zinc-800/60">
                  {item.terminal.map((line, j) => (
                    <TerminalLine
                      key={j}
                      text={line}
                      delay={i * 400 + j * 300}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="relative py-24 md:py-32 border-t border-zinc-800/50"
      >
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="font-mono text-xs text-emerald-500 tracking-widest uppercase">
              Features
            </span>
            <h2 className="font-display font-800 text-3xl md:text-5xl mt-4 tracking-tight">
              Everything you need to
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                ship with confidence
              </span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 glass-hover transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:bg-emerald-600/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-base mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-zinc-400 font-display leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="relative py-24 md:py-32 border-t border-zinc-800/50 grid-bg"
      >
        <GlowOrb className="w-[500px] h-[500px] bg-emerald-700/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="font-mono text-xs text-emerald-500 tracking-widest uppercase">
              Pricing
            </span>
            <h2 className="font-display font-800 text-3xl md:text-5xl mt-4 tracking-tight">
              Start free.
              <br />
              <span className="text-zinc-500">Scale when ready.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Starter",
                price: "Free",
                period: "forever",
                desc: "Perfect for side projects and solo devs.",
                features: [
                  "3 repos",
                  "100 scans / month",
                  "Basic AI analysis",
                  "Email alerts",
                  "Community support",
                ],
                cta: "Start Free",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$19",
                period: "/ month",
                desc: "For teams shipping production code daily.",
                features: [
                  "Unlimited repos",
                  "Unlimited scans",
                  "Advanced AI models",
                  "Slack & Discord alerts",
                  "Priority support",
                  "Custom rules",
                ],
                cta: "Start 14-day Trial",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For organizations with compliance needs.",
                features: [
                  "Everything in Pro",
                  "SSO & SAML",
                  "Audit logs",
                  "Self-hosted option",
                  "Dedicated account manager",
                  "SLA guarantee",
                ],
                cta: "Contact Sales",
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-6 md:p-8 transition-all duration-300 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-emerald-950/60 to-zinc-900/80 border-2 border-emerald-600/40 shadow-xl shadow-emerald-900/20 scale-[1.02]"
                    : "glass glass-hover"
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block font-mono text-[10px] font-bold text-emerald-400 tracking-widest uppercase bg-emerald-500/10 px-3 py-1 rounded-full mb-4 border border-emerald-500/20">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                <div className="mt-3 mb-4">
                  <span className="font-display font-800 text-4xl">
                    {plan.price}
                  </span>
                  <span className="text-zinc-500 text-sm font-display ml-1">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 font-display mb-6">
                  {plan.desc}
                </p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2.5 text-sm font-display text-zinc-300"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-emerald-500 shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-display font-semibold text-sm transition-all ${
                    plan.highlight
                      ? "cta-btn text-white"
                      : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32 border-t border-zinc-800/50">
        <GlowOrb className="w-[600px] h-[600px] bg-emerald-600/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-glow" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-display font-800 text-3xl md:text-5xl tracking-tight mb-6">
            Stop shipping bugs.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Start shipping confidence.
            </span>
          </h2>
          <p className="text-zinc-400 text-lg font-display font-light mb-10 max-w-lg mx-auto">
            Connect your first repo in under 30 seconds. No credit card
            required.
          </p>
          <button className="cta-btn text-white font-display font-semibold px-10 py-4 rounded-xl text-lg flex items-center gap-3 mx-auto">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Get Started with GitHub
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <span className="font-display font-bold text-sm">
                  git<span className="text-emerald-400">watch</span>
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-display max-w-xs">
                AI-powered code monitoring for teams that ship fast and break
                nothing.
              </p>
            </div>
            <div className="flex gap-12 text-xs font-display">
              <div className="space-y-2.5">
                <p className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  Product
                </p>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Changelog
                </a>
              </div>
              <div className="space-y-2.5">
                <p className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  Resources
                </p>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Documentation
                </a>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  API Reference
                </a>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Status
                </a>
              </div>
              <div className="space-y-2.5">
                <p className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  Company
                </p>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  About
                </a>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Blog
                </a>
                <a
                  href="#"
                  className="block text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Careers
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-800/40 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-zinc-600 font-display">
            <span>© 2026 shipwatch. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-zinc-400 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-zinc-400 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-zinc-400 transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
