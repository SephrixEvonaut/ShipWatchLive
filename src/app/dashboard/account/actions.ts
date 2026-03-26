"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  error?: string;
  success?: string;
} | null;

export async function updateUsername(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const username = (formData.get("username") as string)?.trim();

  if (!username) {
    return { error: "Username is required." };
  }

  if (username.length < 2) {
    return { error: "Username must be at least 2 characters." };
  }

  if (username.length > 30) {
    return { error: "Username must be 30 characters or fewer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { username },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Username updated." };
}

export async function updateAvatar(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const file = formData.get("avatar") as File;

  if (!file || file.size === 0) {
    return { error: "Please select an image." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Image must be under 2 MB." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const ext = file.name.split(".").pop();
  const filePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: `${publicUrl}?t=${Date.now()}` },
  });

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: "Profile picture updated." };
}

export async function changePassword(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || !confirmPassword) {
    return { error: "Both password fields are required." };
  }

  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return { success: "Password updated successfully." };
}
