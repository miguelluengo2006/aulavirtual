// Cliente de Cloudflare R2 (API compatible con S3).
// Sin "server-only": lo usan también los scripts. NUNCA importar desde un Client Component.
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TtlCache } from "./ttl-cache";

let client: S3Client | null = null;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} en las variables de entorno`);
  return v;
}

export function r2Bucket() {
  return env("R2_BUCKET");
}

export function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      // R2_ENDPOINT solo hace falta para pruebas con un S3 local.
      endpoint:
        process.env.R2_ENDPOINT ??
        `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      forcePathStyle: Boolean(process.env.R2_ENDPOINT),
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export class R2NotFoundError extends Error {}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return await res.Body!.transformToByteArray();
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "NoSuchKey" || name === "NotFound") throw new R2NotFoundError(key);
    throw e;
  }
}

export async function getObjectText(key: string): Promise<string> {
  return new TextDecoder().decode(await getObjectBytes(key));
}

/**
 * Playlists y claves de cifrado ya leídas de R2 (10 min, por instancia del servidor).
 * No cambian una vez subidas, y así cada "play" se ahorra un viaje a R2.
 * El acceso del usuario se sigue comprobando en cada petición, antes de llegar aquí.
 */
const objectCache = new TtlCache<Uint8Array>(10 * 60 * 1000, 300);

export function getObjectBytesCached(key: string): Promise<Uint8Array> {
  return objectCache.getOrLoad(key, () => getObjectBytes(key));
}

export async function getObjectTextCached(key: string): Promise<string> {
  return new TextDecoder().decode(await getObjectBytesCached(key));
}

/** Origen del endpoint de R2 (para `preconnect`). null si R2 no está configurado. */
export function r2Origin(): string | null {
  if (process.env.R2_ENDPOINT) return new URL(process.env.R2_ENDPOINT).origin;
  const account = process.env.R2_ACCOUNT_ID;
  return account ? `https://${account}.r2.cloudflarestorage.com` : null;
}

/**
 * URL firmada de solo lectura.
 * Con `signingDate` fija y `cacheSeconds`, la misma URL se repite durante un rato y el
 * navegador puede guardar el objeto (R2 devuelve ese Cache-Control al descargarlo).
 */
export function presignGet(
  key: string,
  expiresInSeconds: number,
  opts: { signingDate?: Date; cacheSeconds?: number } = {},
): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      ...(opts.cacheSeconds
        ? { ResponseCacheControl: `private, max-age=${opts.cacheSeconds}, immutable` }
        : {}),
    }),
    { expiresIn: expiresInSeconds, ...(opts.signingDate ? { signingDate: opts.signingDate } : {}) },
  );
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(cacheControl ? { CacheControl: cacheControl } : {}),
    }),
  );
}
