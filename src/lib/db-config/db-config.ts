// Single source of truth for database connection settings.
//
// Consumed by BOTH:
//   - lib/prisma.ts    (runtime — passes these straight to the MariaDB adapter)
//   - prisma.config.ts (CLI — needs them as a connection string)
//
// Discrete DB_* vars are preferred because their values are used verbatim:
// a password containing ? > ; @ / : # needs no percent-encoding. DATABASE_URL
// is still honoured as a fallback so existing deployments keep working.
//
// Intentionally dependency-free (no path aliases, no imports) — the Prisma CLI
// loads prisma.config.ts without tsconfig path-alias resolution.

export type DbConfig = {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
};

const DEFAULTS = {
    host: "localhost",
    port: 3306,
    user: "",
    password: "",
    connectionLimit: 5,
};

function fromDatabaseUrl(raw: string): Omit<DbConfig, "connectionLimit"> {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error(
            "DATABASE_URL could not be parsed. Special characters in the password " +
            "(? > ; @ / : #) must be percent-encoded — or better, use the discrete " +
            "DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME variables instead."
        );
    }
    return {
        host: url.hostname || DEFAULTS.host,
        port: url.port ? Number(url.port) : DEFAULTS.port,
        user: decodeURIComponent(url.username) || DEFAULTS.user,
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ""),
    };
}

/**
 * Reads an env var, undoing the mangling Hostinger's hPanel applies on its way
 * into the process. dotenv never gets a chance to normalise these: the app runs
 * from a directory with no .env file, so these values arrive raw.
 *
 * Two observed transformations, both verified against the live process:
 *
 *  1. Values are stored wrapped in single quotes. An unstripped DB_HOST arrives
 *     as "'127.0.0.1'" and fails DNS with ENOTFOUND.
 *  2. Shell metacharacters are backslash-escaped. A password of "#F3dDNqRyY"
 *     arrives as "\#F3dDNqRyY" — one character longer, and rejected by MySQL.
 *
 * Either one leaves the connection pool unable to open a single connection, so
 * every query fails with "pool timeout ... active=0 idle=0" rather than a
 * useful authentication error.
 */
function env(key: string): string | undefined {
    const raw = process.env[key];
    if (raw === undefined) return undefined;
    return raw
        .trim()
        .replace(/\r$/, "")
        .replace(/^(["'])([\s\S]*)\1$/, "$2")
        // Unescape shell metacharacters. Only these — a blanket \\(.) → $1
        // would corrupt legitimate backslashes in a password.
        .replace(/\\([#$`"'!&;|<>() ])/g, "$1");
}

export function getDbConfig(): DbConfig {
    const connectionLimit =
        Number(env("DB_CONNECTION_LIMIT")) || DEFAULTS.connectionLimit;

    // Discrete vars win. DB_NAME is the marker that they've been configured,
    // since it's the only field with no sensible default.
    const database = env("DB_NAME");
    if (database) {
        return {
            host: env("DB_HOST") || DEFAULTS.host,
            port: Number(env("DB_PORT")) || DEFAULTS.port,
            user: env("DB_USER") || DEFAULTS.user,
            // ?? not || — an empty password is valid (passwordless local root).
            password: env("DB_PASSWORD") ?? DEFAULTS.password,
            database,
            connectionLimit,
        };
    }

    const databaseUrl = env("DATABASE_URL");
    if (databaseUrl) {
        return { ...fromDatabaseUrl(databaseUrl), connectionLimit };
    }

    throw new Error(
        "No database configuration found. Set DB_NAME (plus DB_HOST / DB_PORT / " +
        "DB_USER / DB_PASSWORD) in your .env file, or provide DATABASE_URL."
    );
}

/** Connection string for the Prisma CLI, with every component safely encoded. */
export function buildDatabaseUrl(): string {
    const { host, port, user, password, database } = getDbConfig();
    const auth = password
        ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
        : encodeURIComponent(user);
    return `mysql://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}