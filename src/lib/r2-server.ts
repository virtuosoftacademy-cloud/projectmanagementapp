import "server-only";

import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import sharp, { type Metadata } from "sharp";
import { objectKeyFor, type ImageKind, type R2UploadResult } from "@/lib/r2";

/**
 * Cloudflare R2 — the half that needs credentials.
 *
 * Bytes are pushed through this server rather than straight from the browser,
 * which is what lets every upload be re-encoded by sharp before it is stored:
 * a 9MB phone photo becomes a few hundred KB, and a favicon is not kept at
 * 1024px. The cost is that the browser cannot watch the R2 leg of the journey,
 * so the UI reports "saving" rather than a percentage.
 *
 * Everything is optional at runtime. With no credentials the app runs exactly
 * as before minus image uploads — `validateR2Config` is what the UI checks, so
 * a missing bucket produces an explanation rather than a crashed page.
 */

// ── Config ─────────────────────────────────────────────────────────

function getR2Config() {
    return {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET,
        publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    };
}

function createR2Client() {
    const config = getR2Config();
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
        throw new Error("R2 configuration missing");
    }

    return new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

// ── Types ──────────────────────────────────────────────────────────

export interface UploadOptions {
    /** Cap the longest edge; original ratio kept, never enlarged. */
    maxWidth?: number;
    /** Re-encode quality 1-100. */
    quality?: number;
}

/**
 * How hard each kind is squeezed.
 *
 * A task attachment is usually a screenshot that only needs to be readable, so
 * it is capped hard. A favicon is tiny already and is kept crisp — re-encoding
 * a 512px icon at quality 80 makes it visibly mushy at 16px.
 */
const DEFAULTS: Record<ImageKind, Required<UploadOptions>> = {
    "task-attachment": { maxWidth: 2000, quality: 80 },
    avatar: { maxWidth: 512, quality: 85 },
    "logo-light": { maxWidth: 800, quality: 90 },
    "logo-dark": { maxWidth: 800, quality: 90 },
    favicon: { maxWidth: 512, quality: 95 },
};

// ── Image processing (sharp) ───────────────────────────────────────

async function processImage(
    buffer: Buffer,
    options: Required<UploadOptions>
): Promise<{ buffer: Buffer; metadata: Metadata }> {
    const { maxWidth, quality } = options;

    let image = sharp(buffer).resize({
        width: maxWidth,
        withoutEnlargement: true, // small images pass through untouched
    });

    const inputMeta = await sharp(buffer).metadata();
    if (inputMeta.format === "jpeg") {
        image = image.jpeg({ quality, mozjpeg: true });
    } else if (inputMeta.format === "png") {
        image = image.png({ quality });
    } else if (inputMeta.format === "webp") {
        image = image.webp({ quality });
    } else if (inputMeta.format === "heif") {
        // sharp reports AVIF as "heif" — it is HEIF-derived — so this is the
        // branch an .avif upload actually lands in. Matching on "avif" instead
        // silently skipped re-encoding and stored the original.
        image = image.avif({ quality });
    }

    const processedBuffer = await image.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();
    return { buffer: processedBuffer, metadata };
}

/**
 * The MIME type for what sharp produced.
 *
 * `metadata.format` is sharp's own vocabulary, not a MIME subtype: AVIF comes
 * back as "heif", which would otherwise be stored — and later served — as
 * `image/heif`, a type browsers do not display.
 */
function mimeTypeFor(format: Metadata["format"]) {
    if (format === "heif") return "image/avif";
    return format ? `image/${format}` : "image/jpeg";
}

// ── Upload ─────────────────────────────────────────────────────────

/**
 * Upload one image and return the public URL to save in the database.
 *
 * Processes with sharp (width cap + re-encode), stores it under the folder its
 * kind belongs to, and reports the resulting dimensions so callers do not have
 * to measure the file a second time.
 */
export async function uploadImageToR2(
    file: File,
    kind: ImageKind,
    options: UploadOptions = {}
): Promise<R2UploadResult> {
    try {
        const config = getR2Config();
        if (!config.bucketName || !config.publicUrl) {
            return {
                success: false,
                error: "R2 configuration missing. Please check environment variables.",
            };
        }

        if (!file.type.startsWith("image/")) {
            return { success: false, error: "Only image files can be uploaded." };
        }

        const client = createR2Client();
        const buffer = Buffer.from(await file.arrayBuffer());
        const { buffer: finalBuffer, metadata } = await processImage(buffer, {
            ...DEFAULTS[kind],
            ...options,
        });

        const objectKey = objectKeyFor(kind, file.name);
        const contentType = mimeTypeFor(metadata.format);

        await client.send(
            new PutObjectCommand({
                Bucket: config.bucketName,
                Key: objectKey,
                Body: finalBuffer,
                ContentType: contentType,
                CacheControl: "public, max-age=31536000, immutable",
                Metadata: {
                    originalName: file.name,
                    kind,
                    uploadedAt: new Date().toISOString(),
                },
            })
        );

        return {
            success: true,
            url: `${config.publicUrl}/${objectKey}`,
            objectKey,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            bytes: finalBuffer.length,
        };
    } catch (error) {
        console.error("R2 upload failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload failed",
        };
    }
}

// ── Delete ─────────────────────────────────────────────────────────

/** Delete an object (e.g. when an image is replaced). Missing object = ok. */
export async function deleteFromR2(objectKey: string): Promise<boolean> {
    try {
        const config = getR2Config();
        if (!config.bucketName) return false;

        const client = createR2Client();
        await client.send(
            new DeleteObjectCommand({ Bucket: config.bucketName, Key: objectKey })
        );
        return true;
    } catch {
        return false; // object may not exist — not an error for our flow
    }
}

// ── Config validation & diagnostics ────────────────────────────────

/**
 * The S3 credentials R2 accepts are *derived* from an API token, not the token
 * itself: the Access Key ID is the token's `id` (32 hex characters) and the
 * Secret is the SHA-256 of its value (64 hex characters).
 *
 * Pasting the token value into either field is the easy mistake, and R2's own
 * answer to it — a 400 saying "Credential access key has length 53, should be
 * 32" — only arrives mid-upload, after a file has already been read and
 * processed. Checking the shape up front turns that into something the settings
 * screen can say before anyone tries.
 */
const HEX = /^[0-9a-fA-F]+$/;

function checkHex(value: string, name: string, expected: number, what: string) {
    if (value.length === expected && HEX.test(value)) return null;
    return (
        `${name} does not look right: expected ${expected} hex characters (${what}), ` +
        `got ${value.length}${HEX.test(value) ? "" : " non-hex"}.`
    );
}

export function validateR2Config(): {
    isValid: boolean;
    errors: string[];
} {
    const config = getR2Config();
    const errors: string[] = [];

    if (!config.accountId) errors.push("Missing R2_ACCOUNT_ID environment variable");
    if (!config.accessKeyId) errors.push("Missing R2_ACCESS_KEY_ID environment variable");
    if (!config.secretAccessKey) errors.push("Missing R2_SECRET_ACCESS_KEY environment variable");
    if (!config.bucketName) errors.push("Missing R2_BUCKET environment variable");
    if (!config.publicUrl) errors.push("Missing NEXT_PUBLIC_R2_PUBLIC_URL environment variable");

    if (config.accountId) {
        const problem = checkHex(config.accountId, "R2_ACCOUNT_ID", 32, "your Cloudflare account id");
        if (problem) errors.push(problem);
    }
    if (config.accessKeyId) {
        const problem = checkHex(
            config.accessKeyId,
            "R2_ACCESS_KEY_ID",
            32,
            "the R2 API token's id, not its value",
        );
        if (problem) errors.push(problem);
    }
    if (config.secretAccessKey) {
        const problem = checkHex(
            config.secretAccessKey,
            "R2_SECRET_ACCESS_KEY",
            64,
            "the SHA-256 of the token value, not the value itself",
        );
        if (problem) errors.push(problem);
    }

    return { isValid: errors.length === 0, errors };
}

/** Whether uploads can work at all — what the UI checks before offering one. */
export function isR2Configured(): boolean {
    return validateR2Config().isValid;
}

/** Presence-only status — never leaks secret values. */
export function getR2ConfigStatus() {
    const config = getR2Config();
    return {
        hasAccountId: !!config.accountId,
        hasAccessKeyId: !!config.accessKeyId,
        hasSecretAccessKey: !!config.secretAccessKey,
        hasBucketName: !!config.bucketName,
        hasPublicUrl: !!config.publicUrl,
        bucketName: config.bucketName || "missing",
        publicUrl: config.publicUrl || "missing",
    };
}

/** Connection test: a 404 HeadObject proves credentials + bucket work. */
export async function testR2Connection() {
    try {
        const config = getR2Config();
        const validation = validateR2Config();
        if (!validation.isValid) {
            return {
                success: false,
                error: `R2 configuration missing: ${validation.errors.join(", ")}`,
                configStatus: getR2ConfigStatus(),
            };
        }

        const client = createR2Client();
        await client.send(
            new HeadObjectCommand({ Bucket: config.bucketName!, Key: "connection-test" })
        );
        return { success: true, configStatus: getR2ConfigStatus() };
    } catch (error) {
        const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
            return { success: true, configStatus: getR2ConfigStatus() };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : "Connection test failed",
            configStatus: getR2ConfigStatus(),
        };
    }
}

/** Object info (size, type, upload metadata) for debugging. */
export async function getAssetInfo(objectKey: string) {
    try {
        const config = getR2Config();
        if (!config.bucketName) {
            return { success: false, error: "R2 bucket name missing" };
        }

        const client = createR2Client();
        const result = await client.send(
            new HeadObjectCommand({ Bucket: config.bucketName, Key: objectKey })
        );

        return {
            success: true,
            data: {
                objectKey,
                url: `${config.publicUrl}/${objectKey}`,
                contentType: result.ContentType,
                contentLength: result.ContentLength,
                lastModified: result.LastModified,
                metadata: result.Metadata,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get asset info",
        };
    }
}
