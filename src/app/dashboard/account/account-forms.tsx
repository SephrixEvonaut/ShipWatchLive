"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import {
  updateUsername,
  updateAvatar,
  changePassword,
  type ProfileState,
} from "./actions";

function StatusMessage({ state }: { state: ProfileState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
    );
  }
  if (state.success) {
    return (
      <p className="text-sm text-green-600 dark:text-green-400">
        {state.success}
      </p>
    );
  }
  return null;
}

export function AccountForms({
  email,
  username,
  avatarUrl,
  lastSignIn,
}: {
  email: string;
  username: string;
  avatarUrl: string;
  lastSignIn: string | null;
}) {
  const [usernameState, usernameAction, usernamePending] = useActionState<
    ProfileState,
    FormData
  >(updateUsername, null);

  const [avatarState, avatarAction, avatarPending] = useActionState<
    ProfileState,
    FormData
  >(updateAvatar, null);

  const [passwordState, passwordAction, passwordPending] = useActionState<
    ProfileState,
    FormData
  >(changePassword, null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Profile Picture
          </h2>
        </div>
        <div className="px-6 py-5">
          <form action={avatarAction} className="flex items-center gap-5">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile picture"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-500 dark:text-zinc-400">
                  {username?.[0]?.toUpperCase() ??
                    email?.[0]?.toUpperCase() ??
                    "?"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                name="avatar"
                accept="image/*"
                className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 file:transition-colors hover:file:bg-zinc-50 dark:text-zinc-400 dark:file:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={avatarPending}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {avatarPending ? "Uploading…" : "Upload"}
                </button>
                <StatusMessage state={avatarState} />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Max 2 MB. JPG, PNG, GIF, or WebP.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Username */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Username
          </h2>
        </div>
        <div className="px-6 py-5">
          <form action={usernameAction} className="space-y-3">
            <input
              name="username"
              type="text"
              defaultValue={username}
              maxLength={30}
              required
              className="block w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              placeholder="Enter a username"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={usernamePending}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {usernamePending ? "Saving…" : "Save"}
              </button>
              <StatusMessage state={usernameState} />
            </div>
          </form>
        </div>
      </div>

      {/* Email & Last Sign In (read-only) */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Account Info
          </h2>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Email
            </label>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {email || "—"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Last Sign In
            </label>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {lastSignIn ? new Date(lastSignIn).toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Change Password
          </h2>
        </div>
        <div className="px-6 py-5">
          <form action={passwordAction} className="space-y-3">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={passwordPending}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {passwordPending ? "Updating…" : "Update Password"}
              </button>
              <StatusMessage state={passwordState} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
