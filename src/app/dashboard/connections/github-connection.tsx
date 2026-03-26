"use client";

import { useState } from "react";
import Image from "next/image";
import {
  connectGitHub,
  disconnectGitHub,
  refreshRepositories,
  configureGitHub,
} from "./actions";

type GitHubRepo = {
  github_id: number;
  full_name: string;
  private: boolean;
  html_url: string;
};

export function GitHubConnection({
  connected,
  accountLogin,
  accountAvatarUrl,
  repositories,
}: {
  connected: boolean;
  accountLogin: string | null;
  accountAvatarUrl: string | null;
  repositories: GitHubRepo[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleDisconnect() {
    setError(null);
    setDisconnecting(true);
    const result = await disconnectGitHub();
    if (result?.error) {
      setError(result.error);
    }
    setDisconnecting(false);
  }

  async function handleRefresh() {
    setError(null);
    setRefreshing(true);
    const result = await refreshRepositories();
    if (result?.error) {
      setError(result.error);
    }
    setRefreshing(false);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-zinc-900 dark:text-zinc-100"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            GitHub
          </h2>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Not connected
          </span>
        )}
      </div>

      <div className="px-6 py-5">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {connected ? (
          <div className="space-y-5">
            {/* Account info + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {accountAvatarUrl && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={accountAvatarUrl}
                      alt={accountLogin ?? "GitHub"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  {accountLogin && (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      @{accountLogin}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {repositories.length} repositor
                    {repositories.length === 1 ? "y" : "ies"} accessible
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
                <form
                  action={async () => {
                    await configureGitHub();
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Configure
                  </button>
                </form>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </div>

            {/* Repository list */}
            {repositories.length > 0 && (
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Repositories
                  </h3>
                </div>
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {repositories.map((repo) => (
                    <li
                      key={repo.github_id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <svg
                          className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          {repo.private ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                            />
                          )}
                        </svg>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          {repo.full_name}
                        </a>
                      </div>
                      <span
                        className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                          repo.private
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Install the ShipWatch GitHub App to grant access to selected
              repositories. You choose exactly which repos to share — we never
              get access to anything you don&apos;t approve.
            </p>
            <form
              action={async () => {
                await connectGitHub();
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Connect GitHub
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
