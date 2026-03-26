"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function connectGitHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Redirect to GitHub App installation page — user selects repos there
  const appSlug = process.env.GITHUB_APP_SLUG;
  if (!appSlug) {
    return { error: "GitHub App is not configured." };
  }

  const installUrl = `https://github.com/apps/${appSlug}/installations/new?state=${user.id}`;
  redirect(installUrl);
}

export async function disconnectGitHub() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: installation } = await supabase
    .from("github_installations")
    .select("id, installation_id")
    .eq("user_id", user.id)
    .single();

  if (!installation) {
    return { error: "No GitHub connection found." };
  }

  // Uninstall the GitHub App on GitHub's side
  const tokenRes = await getInstallationToken(installation.installation_id);
  const jwt = await generateGitHubJWT();
  if (jwt) {
    const res = await fetch(
      `https://api.github.com/app/installations/${installation.installation_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (!res.ok && res.status !== 404) {
      return { error: "Failed to uninstall the GitHub App. Please try again." };
    }
  }

  // Remove from our database
  const { error } = await supabase
    .from("github_installations")
    .delete()
    .eq("id", installation.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/connections");
  return { success: "GitHub disconnected and app uninstalled." };
}

export async function refreshRepositories() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: installation } = await supabase
    .from("github_installations")
    .select("installation_id")
    .eq("user_id", user.id)
    .single();

  if (!installation) {
    return { error: "No GitHub connection found." };
  }

  // Get an installation access token
  const tokenRes = await getInstallationToken(installation.installation_id);
  if (!tokenRes.token) {
    return { error: "Failed to get GitHub access token." };
  }

  // Fetch repos accessible via this installation
  const reposRes = await fetch(
    "https://api.github.com/installation/repositories?per_page=100",
    {
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!reposRes.ok) {
    return { error: "Failed to fetch repositories from GitHub." };
  }

  const reposData = await reposRes.json();
  const repos = reposData.repositories.map(
    (r: {
      id: number;
      full_name: string;
      private: boolean;
      html_url: string;
    }) => ({
      github_id: r.id,
      full_name: r.full_name,
      private: r.private,
      html_url: r.html_url,
    }),
  );

  // Update stored repos
  const { error } = await supabase
    .from("github_installations")
    .update({ repositories: repos, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/connections");
  return { success: "Repositories refreshed." };
}

export async function configureGitHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: installation } = await supabase
    .from("github_installations")
    .select("installation_id")
    .eq("user_id", user.id)
    .single();

  if (!installation) {
    return { error: "No GitHub connection found." };
  }

  // Redirect to GitHub App installation page to reconfigure repo access
  // Using the /installations/new URL ensures GitHub redirects back to our callback after saving
  const appSlug = process.env.GITHUB_APP_SLUG;
  const configUrl = `https://github.com/apps/${appSlug}/installations/new?state=${user.id}`;
  redirect(configUrl);
}

// --- internal helper ---

async function getInstallationToken(installationId: number) {
  const jwt = await generateGitHubJWT();
  if (!jwt) return { token: null };

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) return { token: null };

  const data = await res.json();
  return { token: data.token as string };
}

async function generateGitHubJWT(): Promise<string | null> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKeyRaw) return null;

  // Support both raw PEM and base64-encoded PEM
  const privateKeyPem = privateKeyRaw.startsWith("-----BEGIN")
    ? privateKeyRaw
    : Buffer.from(privateKeyRaw, "base64").toString("utf-8");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 600, iss: appId };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsigned = `${encode(header)}.${encode(payload)}`;

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(privateKeyPem, "base64url");

  return `${unsigned}.${signature}`;
}
