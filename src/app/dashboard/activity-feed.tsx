"use client";

import { useState } from "react";

type Commit = {
  id: string;
  message: string;
  author: string;
  timestamp: string;
};

type WebhookEvent = {
  id: string;
  event_type: string;
  repository: string;
  branch: string;
  commit_count: number;
  payload: {
    sender?: string;
    head_commit?: string;
    commits?: Commit[];
  };
  created_at: string;
};

type ReviewState = {
  loading: boolean;
  result: null | { analysis: Record<string, unknown> };
  error: string | null;
  commit: { sha: string; message: string; repository: string; branch: string } | null;
};

export function ActivityFeed({ events }: { events: WebhookEvent[] }) {
  const [review, setReview] = useState<ReviewState>({
    loading: false,
    result: null,
    error: null,
    commit: null,
  });

  async function handleReview(
    repository: string,
    commitSha: string,
    commitMessage: string,
    branch: string,
  ) {
    setReview({
      loading: true,
      result: null,
      error: null,
      commit: { sha: commitSha, message: commitMessage, repository, branch },
    });

    try {
      const res = await fetch("/api/review-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository, commitSha }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail ? `\n${data.detail}` : "";
        throw new Error(
          (data.error || `Request failed (${res.status})`) + detail,
        );
      }

      const data = await res.json();
      setReview((prev) => ({ ...prev, loading: false, result: data }));
    } catch (err) {
      setReview((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }

  function closeModal() {
    setReview({ loading: false, result: null, error: null, commit: null });
  }

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Activity
        </h2>
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {events.slice(0, 15).map((event) => (
              <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1 shrink-0">
                  {event.event_type === "push" ? (
                    <svg
                      className="h-4 w-4 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {event.event_type === "push" ? "Push" : event.event_type}
                    </p>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {event.repository}
                    </span>
                    {event.branch && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {event.branch}
                      </span>
                    )}
                  </div>
                  {event.event_type === "push" && event.payload?.commits && (
                    <div className="mt-1.5 space-y-1">
                      {event.payload.commits.slice(0, 3).map((commit) => (
                        <div
                          key={commit.id}
                          className="group flex items-center gap-2"
                        >
                          <a
                            href={`https://github.com/${event.repository}/commit/${commit.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1 block rounded px-1 -mx-1 text-xs text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-mono text-zinc-400 dark:text-zinc-500">
                              {commit.id.slice(0, 7)}
                            </span>{" "}
                            {commit.message.slice(0, 100)}
                            {" — "}
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {commit.author}
                            </span>
                          </a>
                          <button
                            onClick={() =>
                              handleReview(
                                event.repository,
                                commit.id,
                                commit.message,
                                event.branch,
                              )
                            }
                            className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50 transition-all"
                            title="AI Review this commit"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                      {event.payload.commits.length > 3 && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          +{event.payload.commits.length - 3} more commit
                          {event.payload.commits.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {event.payload?.sender && `by ${event.payload.sender} · `}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
                {event.event_type === "push" && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {event.commit_count} commit
                    {event.commit_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {(review.loading || review.result || review.error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  AI Commit Review
                </h3>
                {review.commit && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono">
                      {review.commit.sha.slice(0, 7)}
                    </span>{" "}
                    in {review.commit.repository} —{" "}
                    {review.commit.message.slice(0, 80)}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="ml-4 shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {review.loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg
                    className="h-8 w-8 animate-spin text-violet-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    Analyzing commit diff with AI...
                  </p>
                </div>
              )}

              {review.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Review failed
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {review.error}
                  </p>
                </div>
              )}

              {review.result && (
                <AnalysisDisplay
                  analysis={review.result.analysis}
                  repository={review.commit?.repository ?? ""}
                  branch={review.commit?.branch ?? ""}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AnalysisDisplay({
  analysis,
  repository,
  branch,
}: {
  analysis: Record<string, unknown>;
  repository: string;
  branch: string;
}) {
  type Fix = { filename: string; issue: string };
  const [fixStates, setFixStates] = useState<
    Record<string, "idle" | "loading" | "done" | "error">
  >({});

  // Extract text from various n8n response shapes
  function extractText(data: unknown): string {
    if (typeof data === "string") return data;
    if (!data || typeof data !== "object") return JSON.stringify(data, null, 2);

    const obj = data as Record<string, unknown>;

    // Handle direct OpenAI shape: { content: [{ type: "text", text: "..." }] }
    if (Array.isArray(obj.content)) {
      const block = obj.content[0] as Record<string, unknown> | undefined;
      if (block && typeof block.text === "string") return block.text;
    }

    // Handle n8n "First Incoming Item" shape: { output: [{ content: [{ text: "..." }] }] }
    if (Array.isArray(obj.output)) {
      const msg = obj.output[0] as Record<string, unknown> | undefined;
      if (msg && Array.isArray(msg.content)) {
        const block = msg.content[0] as Record<string, unknown> | undefined;
        if (block && typeof block.text === "string") return block.text;
      }
    }

    // Handle direct fields
    for (const key of ["summary", "review", "text", "output", "message"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }

    return JSON.stringify(data, null, 2);
  }

  function renderLines(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("###"))
        return (
          <h4 key={i} className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {line.replace(/^###\s*/, "")}
          </h4>
        );
      if (line.startsWith("##"))
        return (
          <h3 key={i} className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {line.replace(/^##\s*/, "")}
          </h3>
        );
      if (line.startsWith("- ") || line.startsWith("* "))
        return (
          <p key={i} className="ml-4 text-sm text-zinc-700 dark:text-zinc-300">
            • {line.slice(2)}
          </p>
        );
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
          {line}
        </p>
      );
    });
  }

  async function applyFix(index: number, fix: Fix) {
    setFixStates((prev) => ({ ...prev, [index]: "loading" }));
    try {
      const res = await fetch("/api/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository,
          branch,
          filename: fix.filename,
          issue: fix.issue,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setFixStates((prev) => ({ ...prev, [index]: "done" }));
    } catch {
      setFixStates((prev) => ({ ...prev, [index]: "error" }));
    }
  }

  // Structured response path: AI returned { summary, fixes: [...] }
  if (Array.isArray(analysis.fixes) && analysis.fixes.length > 0) {
    const fixes = analysis.fixes as Fix[];
    const summary = typeof analysis.summary === "string" ? analysis.summary : extractText(analysis);

    return (
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderLines(summary)}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Suggested Fixes
          </p>
          {fixes.map((fix, index) => {
            const state = fixStates[index] ?? "idle";
            return (
              <div
                key={index}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
                      {fix.filename}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                      {fix.issue}
                    </p>
                  </div>
                  <button
                    onClick={() => applyFix(index, fix)}
                    disabled={state === "loading" || state === "done"}
                    className={`shrink-0 rounded px-3 py-1 text-xs font-medium transition-all ${
                      state === "done"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : state === "error"
                          ? "cursor-pointer bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : state === "loading"
                            ? "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                            : "cursor-pointer bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
                    }`}
                  >
                    {state === "loading"
                      ? "Fixing…"
                      : state === "done"
                        ? "Fixed ✓"
                        : state === "error"
                          ? "Retry"
                          : "Fix"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback: plain text response (existing behaviour unchanged)
  const text = extractText(analysis);
  return (
    <div className="space-y-3">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {renderLines(text)}
      </div>
    </div>
  );
}
