import { createClient } from "@/lib/supabase/server";
import { GitHubConnection } from "./github-connection";

type GitHubRepo = {
  github_id: number;
  full_name: string;
  private: boolean;
  html_url: string;
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: installation } = await supabase
    .from("github_installations")
    .select("installation_id, account_login, account_avatar_url, repositories")
    .eq("user_id", user?.id ?? "")
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Connections
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your external service connections
        </p>
      </div>

      <GitHubConnection
        connected={!!installation}
        accountLogin={installation?.account_login ?? null}
        accountAvatarUrl={installation?.account_avatar_url ?? null}
        repositories={(installation?.repositories as GitHubRepo[]) ?? []}
      />
    </div>
  );
}
