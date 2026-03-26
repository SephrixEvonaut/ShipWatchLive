import { createClient } from "@/lib/supabase/server";
import { AccountForms } from "./account-forms";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          My Account
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          View and manage your account details
        </p>
      </div>

      <AccountForms
        email={user?.email ?? ""}
        username={user?.user_metadata?.username ?? ""}
        avatarUrl={user?.user_metadata?.avatar_url ?? ""}
        lastSignIn={user?.last_sign_in_at ?? null}
      />
    </div>
  );
}
