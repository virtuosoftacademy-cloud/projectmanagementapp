import { SessionProvider } from "next-auth/react";

/**
 * Onboarding sits outside the `(app)` group — there is no workspace yet, so
 * there is no sidebar to render — but the form still calls `useSession()` to
 * refresh the JWT after creating one, and that needs a provider.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
