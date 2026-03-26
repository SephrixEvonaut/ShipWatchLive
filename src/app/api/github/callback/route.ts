import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const state = searchParams.get("state"); // user id we passed

  if (!installationId) {
    return NextResponse.redirect(
      `${origin}/dashboard/connections?error=missing_installation`,
    );
  }

  const supabase = await createClient();

  // Verify the user is authenticated and matches the state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (state && user.id !== state)) {
    return NextResponse.redirect(
      `${origin}/dashboard/connections?error=auth_mismatch`,
    );
  }

  const numInstallationId = parseInt(installationId, 10);

  // Fetch installation details from GitHub to get account info
  let accountLogin = "";
  let accountAvatarUrl = "";
  try {
    const res = await fetch(
      `https://api.github.com/app/installations/${numInstallationId}`,
      {
        headers: {
          Authorization: `Bearer ${await generateJWT()}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (res.ok) {
      const data = await res.json();
      accountLogin = data.account?.login ?? "";
      accountAvatarUrl = data.account?.avatar_url ?? "";
    }
  } catch {
    // Non-fatal — we still save the installation
  }

  // Fetch accessible repositories
  let repos: {
    github_id: number;
    full_name: string;
    private: boolean;
    html_url: string;
  }[] = [];
  try {
    const tokenRes = await getInstallationToken(numInstallationId);
    if (tokenRes.token) {
      const reposRes = await fetch(
        "https://api.github.com/installation/repositories?per_page=100",
        {
          headers: {
            Authorization: `Bearer ${tokenRes.token}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        repos = reposData.repositories.map(
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
      }
    }
  } catch {
    // Non-fatal
  }

  // Upsert the installation record (always update — handles install, update, and reconfigure)
  const { error } = await supabase.from("github_installations").upsert(
    {
      user_id: user.id,
      installation_id: numInstallationId,
      account_login: accountLogin,
      account_avatar_url: accountAvatarUrl,
      repositories: repos,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.redirect(
      `${origin}/dashboard/connections?error=save_failed`,
    );
  }

  return NextResponse.redirect(`${origin}/dashboard/connections`);
}

// --- helpers (duplicated from actions since route handlers can't import "use server" modules) ---

async function getInstallationToken(installationId: number) {
  const jwt = await generateJWT();
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

async function generateJWT(): Promise<string | null> {
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
