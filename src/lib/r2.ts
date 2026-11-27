// Cliente de Cloudflare R2 (API compatible con S3).
// Sin "server-only": lo usan también los scripts. NUNCA importar desde un Client Component.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
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

/**
 * Origen desde el que el navegador descarga los segmentos (para `preconnect`).
 * Las URLs firmadas usan el estilo "virtual host": <bucket>.<cuenta>.r2.cloudflarestorage.com.
 * null si R2 no está configurado.
 */
export function r2Origin(): string | null {
  if (process.env.R2_ENDPOINT) return new URL(process.env.R2_ENDPOINT).origin;
  const account = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  return account && bucket ? `https://${bucket}.${account}.r2.cloudflarestorage.com` : null;
}

/**
 * URL firmada de solo lectura.
 * Con `signingDate` fija y `cacheSeconds`, la misma URL se repite durante un rato y el
 * navegador puede guardar el objeto (R2 devuelve ese Cache-Control al descargarlo).
 */
export function presignGet(
  key: string,
  expiresInSeconds: number,
  opts: { signingDate?: Date; cacheSeconds?: number; downloadName?: string; contentType?: string } = {},
): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      ...(opts.cacheSeconds
        ? { ResponseCacheControl: `private, max-age=${opts.cacheSeconds}, immutable` }
        : {}),
      // Recursos: se descargan con su nombre (nunca se abren como página de la web).
      ...(opts.downloadName
        ? { ResponseContentDisposition: `attachment; filename="${opts.downloadName.replace(/["\\]/g, "")}"` }
        : {}),
      ...(opts.contentType ? { ResponseContentType: opts.contentType } : {}),
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

/**
 * URL firmada para que el navegador del admin suba un archivo directamente a R2
 * (así no pasa por el servidor, que en Vercel no acepta archivos grandes).
 * Requiere que el CORS del bucket permita PUT desde la web.
 */
export function presignPut(key: string, contentType: string, expiresInSeconds = 15 * 60): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: r2Bucket(), Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}

/** Tamaño de un objeto en R2, o null si no existe. */
export async function objectSize(key: string): Promise<number | null> {
  try {
    const r = await r2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return r.ContentLength ?? 0;
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") return null;
    throw e;
  }
}
