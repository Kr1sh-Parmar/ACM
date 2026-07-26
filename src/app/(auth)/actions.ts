"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  /** Set when the project has email confirmation switched on. */
  checkEmail?: boolean;
};

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately vague: saying which half was wrong tells an attacker which
  // emails have accounts.
  if (error) return { error: "That email and password don't match an account." };

  revalidatePath("/", "layout");
  redirect("/dashboard"); // The proxy re-routes to /onboarding or /pending as needed.
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user trigger to seed profiles.full_name.
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "An account already uses that email. Sign in instead."
          : error.message,
    };
  }

  // With email confirmation off, signUp returns a session and we go straight on.
  // With it on, there's no session until the link is clicked — handle both so
  // the flow doesn't silently dead-end if that project setting ever changes.
  if (!data.session) return { checkEmail: true };

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
