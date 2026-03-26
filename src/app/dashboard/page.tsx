import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type GitHubRepo = {
  github_id: number;
  full_name: string;
  private: boolean;
  html_url: string;
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
    commits?: {
      id: string;
      message: string;
      author: string;
      timestamp: string;
    }[];
  };
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = user?.user_metadata?.username;
  const displayName = username || user?.email || "";

  // Fetch connected GitHub installation
  const { data: installation } = await supabase
    .from("github_installations")
    .select("installation_id, account_login, repositories")
    .eq("user_id", user?.id ?? "")
    .single();

  const repos = (installation?.repositories as GitHubRepo[]) ?? [];
  const isConnected = !!installation;

  // Fetch recent webhook events (last 20)
  const { data: recentEvents } = await supabase
    .from("webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const events = (recentEvents as WebhookEvent[]) ?? [];

  // Compute stats
  const totalRepos = repos.length;
  const totalCommitsToday = events.filter((e) => {
    const created = new Date(e.created_at);
    const now = new Date();
    return (
      e.event_type === "push" && created.toDateString() === now.toDateString()
    );
  }).length;

  // Derive alerts: large pushes (10+ commits), pushes to main/master
  const alerts: {
    type: "warning" | "info" | "error";
    message: string;
    time: string;
  }[] = [];
  for (const e of events.slice(0, 50)) {
    if (e.event_type === "push" && e.commit_count >= 10) {
      alerts.push({
        type: "warning",
        message: `Large push: ${e.commit_count} commits to ${e.repository}/${e.branch}`,
        time: e.created_at,
      });
    }
    if (
      e.event_type === "push" &&
      (e.branch === "main" || e.branch === "master")
    ) {
      // Check for keywords suggesting bug fixes or errors
      const commits = e.payload?.commits ?? [];
      for (const c of commits) {
        const msg = c.message.toLowerCase();
        if (
          msg.includes("fix") ||
          msg.includes("bug") ||
          msg.includes("hotfix") ||
          msg.includes("patch")
        ) {
          alerts.push({
            type: "error",
            message: `Bug fix detected: "${c.message.slice(0, 80)}" in ${e.repository}`,
            time: c.timestamp || e.created_at,
          });
        }
        if (
          msg.includes("error") ||
          msg.includes("crash") ||
          msg.includes("broken")
        ) {
          alerts.push({
            type: "error",
            message: `Suspected error: "${c.message.slice(0, 80)}" in ${e.repository}`,
            time: c.timestamp || e.created_at,
          });
        }
      }
    }
  }

  // Deduplicate alerts and limit
  const uniqueAlerts = alerts
    .filter((a, i, arr) => arr.findIndex((b) => b.message === a.message) === i)
    .slice(0, 10);

  const hasActivity = events.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back{displayName ? `, ${displayName}` : ""}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Connections
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {isConnected ? 1 : 0}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {isConnected
              ? `GitHub (${installation.account_login})`
              : "No connections"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Repositories
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {totalRepos}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {repos.filter((r) => r.private).length} private,{" "}
            {repos.filter((r) => !r.private).length} public
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Pushes Today
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {totalCommitsToday}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {events.length} total events tracked
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Alerts
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${uniqueAlerts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-50"}`}
          >
            {uniqueAlerts.length}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {uniqueAlerts.filter((a) => a.type === "error").length} errors,{" "}
            {uniqueAlerts.filter((a) => a.type === "warning").length} warnings
          </p>
        </div>
      </div>

      {/* Alerts section */}
      {uniqueAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Alerts &amp; Notifications
          </h2>
          <div className="space-y-2">
            {uniqueAlerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  alert.type === "error"
                    ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20"
                    : alert.type === "warning"
                      ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20"
                      : "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {alert.type === "error" ? (
                    <svg
                      className="h-4 w-4 text-red-600 dark:text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                  ) : alert.type === "warning" ? (
                    <svg
                      className="h-4 w-4 text-amber-600 dark:text-amber-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                      />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      alert.type === "error"
                        ? "text-red-800 dark:text-red-300"
                        : alert.type === "warning"
                          ? "text-amber-800 dark:text-amber-300"
                          : "text-blue-800 dark:text-blue-300"
                    }`}
                  >
                    {alert.message}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(alert.time).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {hasActivity ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Activity
          </h2>
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {events.slice(0, 15).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
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
                        {event.event_type === "push"
                          ? "Push"
                          : event.event_type}
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
                          <p
                            key={commit.id}
                            className="text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            <span className="font-mono text-zinc-400 dark:text-zinc-500">
                              {commit.id.slice(0, 7)}
                            </span>{" "}
                            {commit.message.slice(0, 100)}
                            {" — "}
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {commit.author}
                            </span>
                          </p>
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
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <svg
            className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No activity yet
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isConnected
              ? "Waiting for push events from your connected repositories."
              : "Get started by adding a connection."}
          </p>
          {!isConnected && (
            <Link
              href="/dashboard/connections"
              className="mt-4 inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Connect GitHub
            </Link>
          )}
        </div>
      )}

      {/* Connected Repos quick view */}
      {repos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Connected Repositories
            </h2>
            <Link
              href="/dashboard/connections"
              className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Manage →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {repos.map((repo) => (
              <a
                key={repo.github_id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {repo.full_name}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                    repo.private
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}
                >
                  {repo.private ? "Private" : "Public"}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
