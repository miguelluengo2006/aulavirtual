// Cliente de Cloudflare R2 (API compatible con S3).
// Sin "server-only": lo usan también los scripts. NUNCA importar desde un Client Component.
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

/** URL firmada de solo lectura. */
export function presignGet(key: string, expiresInSeconds: number): Promise<string> {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: r2Bucket(), Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<void> {
  await r2().send(
    new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}
