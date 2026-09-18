import type { Metadata } from "next";
import { getBranding } from "@/lib/queries";
import { getViewerTheme } from "@/lib/session";
import "@/styles/globals.css";

/**
 * The tab icon follows the uploaded favicon when there is one.
 *
 * `generateMetadata` rather than a static export because the answer lives in
 * the database: returning no `icons` at all lets Next fall back to whatever
 * `app/favicon.ico` provides, so an unconfigured deployment is unchanged.
 */
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();

  return {
    title: {
      default: "Acme Corp Workspace",
      template: "%s · Acme Corp",
    },
    description: "Project management workspace: projects, tasks and time.",
    ...(branding.favicon ? { icons: { icon: branding.favicon } } : {}),
  };
}

/**
 * The theme class is applied here, on the server, from the account row.
 *
 * That is what makes the preference follow someone to another browser: nothing
 * is read from local storage, so there is no client value to disagree with the
 * database and no flash of the wrong theme before hydration.
 *
 * `"system"` renders no class at all, which hands the decision to the
 * `prefers-color-scheme` block in globals.css — the server never has to guess
 * what the browser will report.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getViewerTheme();

  return (
    <html
      lang="en"
      className={`h-full antialiased${theme === "system" ? "" : ` ${theme}`}`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
