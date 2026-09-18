/**
 * Cloudflare R2 — the parts that are safe in the browser.
 *
 * Object keys, public URLs and pre-flight validation live here; anything that
 * needs a credential lives in `r2-server.ts`. This module ships to the client,
 * so it must stay free of node imports.
 *
 * Uploads are deferred: a file chosen in the UI is previewed locally and only
 * crosses the wire when the form is saved. The server action then does the real
 * work — see `uploadImageToR2` — so nothing here ever touches the bucket.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface R2UploadResult {
    success: boolean;
    url?: string;
    objectKey?: string;
    error?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
}

/**
 * What an image is for. The kind decides where it is stored, how large it may
 * be, and how hard it is re-encoded — a favicon and a task screenshot have
 * nothing in common but the file dialog.
 */
export type ImageKind =
    | "task-attachment"
    | "avatar"
    | "logo-light"
    | "logo-dark"
    | "favicon";

/** Every valid ImageKind, so an action can validate without repeating the union. */
export const IMAGE_KINDS = [
    "task-attachment",
    "avatar",
    "logo-light",
    "logo-dark",
    "favicon",
] as const;

export function isImageKind(value: string): value is ImageKind {
    return (IMAGE_KINDS as readonly string[]).includes(value);
}

export interface ImageValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// ── URL helpers ────────────────────────────────────────────────────

/** Check if a URL points at our R2 bucket (or R2 generally). */
export function isR2Url(url: string): boolean {
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
    return (
        (r2PublicUrl.length > 0 && url.includes(r2PublicUrl)) ||
        url.includes("r2.cloudflarestorage.com")
    );
}

/**
 * Whether next/image can run its remote optimizer on this src without
 * throwing. next.config.ts only whitelists the R2 host (via
 * `remotePatterns`) — there's no blanket `images.unoptimized`, so any other
 * absolute URL (someone pasting an arbitrary external image link, say)
 * needs `unoptimized` set explicitly or the page errors at render time.
 * Root-relative paths (public/ assets) are same-origin and always safe.
 */
export function isOptimizableImageSrc(src: string): boolean {
    return src.startsWith("/") || isR2Url(src);
}

/** Extract the object key from one of our R2 URLs (null if not ours). */
export function extractObjectKey(url: string): string | null {
    try {
        const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
        if (!r2PublicUrl || !url.includes(r2PublicUrl)) return null;

        const pathname = new URL(url).pathname;
        return pathname.startsWith("/") ? pathname.substring(1) : pathname;
    } catch (error) {
        console.error("Error extracting object key:", error);
        return null;
    }
}

/** Build the public URL for an object key. */
export function buildR2Url(objectKey: string): string {
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
    return `${r2PublicUrl}/${objectKey}`;
}

/**
 * Whether uploads can work at all, as far as the browser can tell.
 *
 * Only the public URL is visible here — the credentials are server-side — so
 * this is what the UI uses to decide between offering an upload and explaining
 * that the bucket is not configured. `validateR2Config` in `r2-server.ts` is
 * the complete check.
 */
export function isR2ConfiguredForClient(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
}

/**
 * Everything this app stores lives under one prefix, so the bucket stays
 * shareable with whatever else uses it.
 *
 * Exported because `next.config.ts` imports it to narrow the `next/image`
 * remote pattern to this subtree. The two have to agree, and a second copy in
 * the config would drift silently the first time this changed.
 */
export const R2_PREFIX = "projectmanagement";

const FOLDERS: Record<ImageKind, string> = {
    "task-attachment": `${R2_PREFIX}/tasks`,
    avatar: `${R2_PREFIX}/avatars`,
    "logo-light": `${R2_PREFIX}/branding`,
    "logo-dark": `${R2_PREFIX}/branding`,
    favicon: `${R2_PREFIX}/branding`,
};

/**
 * Generate a collision-safe object key for an upload:
 *   projectmanagement/tasks/2026-09-05-1757068800123-screenshot.png
 * Folder comes from what the image is for; filename is slugified.
 */
export function objectKeyFor(kind: ImageKind, fileName: string): string {
    const folder = FOLDERS[kind];
    const ext = fileName.includes(".")
        ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
        : "";
    const base = fileName
        .slice(0, fileName.length - ext.length)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "image";
    const stamp = new Date().toISOString().slice(0, 10);
    return `${folder}/${stamp}-${Date.now()}-${base}${ext}`;
}

// ── Basic file validation (shared) ─────────────────────────────────

// This module ships to the browser, so it can't read server-only env vars —
// keep this in sync with the cap the upload action enforces. Only a pre-flight
// UX check anyway; the action is the actual enforcement point.
export const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Deliberately no GIF or SVG: every upload is re-encoded by sharp server-side,
// which flattens an animated GIF to one frame and rasterises an SVG — silently
// producing something other than what was uploaded.
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

/** Human list for the "PNG, JPEG…" hint under a file picker. */
export const ALLOWED_LABEL = "JPEG, PNG, WebP or AVIF";

/** The `accept` attribute for a file input. */
export const ACCEPT_ATTRIBUTE = ALLOWED_TYPES.join(",");

/** Quick type/size check before any upload starts. */
export function validateImageFile(file: File): {
    isValid: boolean;
    error?: string;
} {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
        fileName.endsWith(ext)
    );
    const hasValidMimeType = ALLOWED_TYPES.includes(file.type);
    const isGenericMimeType =
        file.type === "" || file.type === "application/octet-stream" || !file.type;

    if (!hasValidMimeType && !hasValidExtension) {
        return {
            isValid: false,
            error: `Invalid file type. Please upload ${ALLOWED_LABEL} images.`,
        };
    }
    if (isGenericMimeType && !hasValidExtension) {
        return {
            isValid: false,
            error: `Invalid file type. Please upload ${ALLOWED_LABEL} images.`,
        };
    }
    if (file.size > MAX_SIZE) {
        return {
            isValid: false,
            error: `File size too large. Please upload images smaller than ${Math.round(MAX_SIZE / 1024 / 1024)}MB.`,
        };
    }

    return { isValid: true };
}

export const IMAGE_VALIDATION: Record<
    ImageKind,
    {
        minDimensions: { width: number; height: number };
        maxDimensions: { width: number; height: number };
        recommended: { width: number; height: number };
        /**
         * Whether a shape unlike `recommended` is worth warning about. False
         * for anything whose shape is genuinely arbitrary — warning about the
         * aspect ratio of a screenshot is noise, not help.
         */
        ratioMatters: boolean;
        note: string;
    }
> = {
    "task-attachment": {
        // A screenshot, a photo of a whiteboard, a crop of a design — the floor
        // is "big enough to read", and there is no right shape.
        minDimensions: { width: 64, height: 64 },
        maxDimensions: { width: 8000, height: 8000 },
        recommended: { width: 1600, height: 900 },
        ratioMatters: false,
        note: "Attachments are shown as square thumbnails and open full size.",
    },
    avatar: {
        // Rendered as a small circle everywhere it appears.
        minDimensions: { width: 200, height: 200 },
        maxDimensions: { width: 4000, height: 4000 },
        recommended: { width: 400, height: 400 },
        ratioMatters: true,
        note: "Profile photos are cropped to a circle wherever they're shown.",
    },
    "logo-light": {
        minDimensions: { width: 120, height: 40 },
        maxDimensions: { width: 4000, height: 4000 },
        recommended: { width: 400, height: 120 },
        ratioMatters: false,
        note: "Shown on the sign-in screen and in the sidebar, on a light background.",
    },
    "logo-dark": {
        minDimensions: { width: 120, height: 40 },
        maxDimensions: { width: 4000, height: 4000 },
        recommended: { width: 400, height: 120 },
        ratioMatters: false,
        note: "The same logo for dark mode — usually the light one with inverted text.",
    },
    favicon: {
        // Browsers scale this down hard; a square source keeps it crisp.
        minDimensions: { width: 64, height: 64 },
        maxDimensions: { width: 1024, height: 1024 },
        recommended: { width: 512, height: 512 },
        ratioMatters: true,
        note: "Shown in the browser tab. A square image with generous padding reads best at 16px.",
    },
};

/** Validate an image's dimensions for its intended slot. */
export function validateImageDimensions(
    width: number,
    height: number,
    kind: ImageKind
): ImageValidationResult {
    const result: ImageValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
    };
    const v = IMAGE_VALIDATION[kind];

    if (width < v.minDimensions.width || height < v.minDimensions.height) {
        result.errors.push(
            `Image dimensions (${width}x${height}) are below the minimum (${v.minDimensions.width}x${v.minDimensions.height}) — it will look blurry.`
        );
        result.isValid = false;
    }
    if (width > v.maxDimensions.width || height > v.maxDimensions.height) {
        result.errors.push(
            `Image dimensions (${width}x${height}) exceed the maximum (${v.maxDimensions.width}x${v.maxDimensions.height}) — resize before uploading.`
        );
        result.isValid = false;
    }

    if (v.ratioMatters) {
        const targetRatio = v.recommended.width / v.recommended.height;
        const actualRatio = width / height;
        if (Math.abs(actualRatio - targetRatio) > 0.15) {
            result.warnings.push(
                `Aspect ratio ${actualRatio.toFixed(2)} differs from the recommended ${v.recommended.width}x${v.recommended.height} — edges may be cropped. ${v.note}`
            );
        }
    }

    return result;
}

/** Read dimensions from a File in the browser. */
export function getImageDimensions(
    file: File
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };

        img.src = url;
    });
}

/** Full pre-upload check: type + size + dimensions for the slot. */
export async function validateImageForSlot(
    file: File,
    kind: ImageKind
): Promise<ImageValidationResult> {
    const basic = validateImageFile(file);
    if (!basic.isValid) {
        return { isValid: false, errors: [basic.error!], warnings: [] };
    }

    try {
        const { width, height } = await getImageDimensions(file);
        return validateImageDimensions(width, height, kind);
    } catch {
        return {
            isValid: false,
            errors: ["Failed to read image dimensions."],
            warnings: [],
        };
    }
}

/** `1.4 MB` — for file sizes shown next to an attachment. */
export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}
