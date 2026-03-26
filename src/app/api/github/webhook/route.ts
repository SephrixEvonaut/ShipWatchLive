import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const { createHmac } = require("crypto") as typeof import("crypto");
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(body);

  const supabase = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  switch (event) {
    case "push": {
      const repo = payload.repository?.full_name;
      const branch = payload.ref?.replace("refs/heads/", "");
      const commits = payload.commits ?? [];
      const installationId = String(payload.installation?.id);

      await supabase.from("webhook_events").insert({
        installation_id: installationId,
        event_type: "push",
        repository: repo,
        branch,
        commit_count: commits.length,
        payload: {
          sender: payload.sender?.login,
          head_commit: payload.head_commit?.id,
          commits: commits.map(
            (c: {
              id: string;
              message: string;
              author: { name: string };
              timestamp: string;
            }) => ({
              id: c.id,
              message: c.message,
              author: c.author?.name,
              timestamp: c.timestamp,
            }),
          ),
        },
      });
      break;
    }

    case "installation": {
      const action = payload.action; // created, deleted, suspend, unsuspend
      const installationId = String(payload.installation?.id);

      if (action === "deleted" || action === "suspend") {
        await supabase
          .from("github_installations")
          .delete()
          .eq("installation_id", installationId);
      }
      break;
    }

    case "installation_repositories": {
      // Repos added or removed from installation
      const installationId = String(payload.installation?.id);
      const { data: installation } = await supabase
        .from("github_installations")
        .select("repositories")
        .eq("installation_id", installationId)
        .single();

      if (installation) {
        const currentRepos: string[] = installation.repositories ?? [];
        const added = (payload.repositories_added ?? []).map(
          (r: { full_name: string }) => r.full_name,
        );
        const removed = (payload.repositories_removed ?? []).map(
          (r: { full_name: string }) => r.full_name,
        );

        const updatedRepos = [
          ...currentRepos.filter((r: string) => !removed.includes(r)),
          ...added,
        ];

        await supabase
          .from("github_installations")
          .update({ repositories: updatedRepos })
          .eq("installation_id", installationId);
      }
      break;
    }

    case "ping": {
      // GitHub sends this when webhook is first configured
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
