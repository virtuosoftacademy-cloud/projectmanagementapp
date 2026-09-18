import { APP_NAME, type Branding } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * The app's wordmark: an uploaded logo when there is one, otherwise the
 * built-in initial square.
 *
 * Both light and dark versions are rendered and one is hidden in CSS rather
 * than picking in JavaScript. The theme has three states — explicit dark,
 * explicit light, and "system", which sets no class at all — so the choice
 * cannot be made on the server without guessing what the browser will report,
 * and making it on the client would flash the wrong logo first.
 *
 * Uploading only one version is fine: it is then used for both.
 */
export function AppLogo({
  branding,
  className,
}: {
  branding: Branding;
  className?: string;
}) {
  const light = branding.logoLight ?? branding.logoDark;
  const dark = branding.logoDark ?? branding.logoLight;

  if (!light || !dark) {
    return (
      <span className={cn("flex items-center gap-2", className)}>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          {APP_NAME[0]}
        </span>
        <span className="font-semibold leading-tight">{APP_NAME}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* Plain <img> even though the R2 host is whitelisted in next.config:
          `next/image` needs either explicit dimensions or a fixed-size box, and
          a logo's aspect ratio is whatever was uploaded. Letting it size itself
          from `h-9 w-auto` is the point. It is already capped at 800px and
          re-encoded on upload, so there is little left to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={light} alt={APP_NAME} className="logo-light h-9 w-auto object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark} alt={APP_NAME} className="logo-dark h-9 w-auto object-contain" />
    </span>
  );
}
