"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { firstError, signInSchema } from "@/lib/validations";

export type SignInState = { error?: string };

/** Credentials sign-in. Returns a message on failure; redirects on success. */
export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { email, password } = parsed.data;
  const from = String(formData.get("from") ?? "/dashboard");

  // Only allow same-site paths as a redirect target.
  const redirectTo = from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";

  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // A wrong password and an unreachable database both land here. Never say
      // which to the visitor, but log the cause so operators can tell them
      // apart — a database outage looks like "bad credentials" otherwise.
      if (error.type !== "CredentialsSignin") {
        console.error("[auth] sign-in failed:", error.type, error.cause ?? error.message);
      }
      return { error: "That email and password combination did not match an account." };
    }
    // `signIn` throws a redirect on success — let Next handle it.
    throw error;
  }
}
