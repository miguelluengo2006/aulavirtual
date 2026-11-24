import { describe, expect, it } from "vitest";
import {
  lessonVideoPrefix,
  PlaylistError,
  resolveInside,
  rewritePlaylist,
  segmentUrlTtl,
  stableSigning,
} from "./hls";

const rw = {
  segment: async (k: string) => `https://firmado/${k}?sig=x`,
  key: (k: string) => `/api/video/L1/key?p=${encodeURIComponent(k)}`,
  playlist: (k: string) => `/api/video/L1/playlist?p=${encodeURIComponent(k)}`,
};

const media = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-KEY:METHOD=AES-128,URI="enc.key",IV=0x00000000000000000000000000000001
#EXTINF:6.0,
seg_0000.ts
#EXTINF:4.2,
seg_0001.ts
#EXT-X-ENDLIST`;

describe("lessonVideoPrefix", () => {
  it("devuelve la carpeta del vídeo", () => {
    expect(lessonVideoPrefix("cursos/a/l1/index.m3u8")).toBe("cursos/a/l1/");
  });
});

describe("resolveInside", () => {
  const pk = "cursos/a/l1/index.m3u8";
  it("resuelve rutas relativas", () => {
    expect(resolveInside(pk, "seg_0.ts", "cursos/a/l1/")).toBe("cursos/a/l1/seg_0.ts");
    expect(resolveInside(pk, "720p/i.m3u8", "cursos/a/l1/")).toBe("cursos/a/l1/720p/i.m3u8");
  });
  it("rechaza salir de la carpeta", () => {
    expect(resolveInside(pk, "../l2/enc.key", "cursos/a/l1/")).toBeNull();
    expect(resolveInside(pk, "../../../secreto", "cursos/a/l1/")).toBeNull();
  });
  it("rechaza URLs absolutas", () => {
    expect(resolveInside(pk, "https://otro.com/x.ts", "cursos/a/l1/")).toBeNull();
    expect(resolveInside(pk, "/x.ts", "cursos/a/l1/")).toBeNull();
  });
});

describe("rewritePlaylist", () => {
  it("firma segmentos y manda la clave al endpoint propio", async () => {
    const out = await rewritePlaylist(media, "cursos/a/l1/index.m3u8", "cursos/a/l1/", rw);
    expect(out).toContain("https://firmado/cursos/a/l1/seg_0000.ts?sig=x");
    expect(out).toContain('URI="/api/video/L1/key?p=cursos%2Fa%2Fl1%2Fenc.key"');
    expect(out).toContain("IV=0x00000000000000000000000000000001");
    expect(out).not.toMatch(/firmado\/[^\n]*enc\.key/);
    expect(out).toContain("#EXT-X-ENDLIST");
  });

  it("manda las sub-playlists al endpoint propio", async () => {
    const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8`;
    const out = await rewritePlaylist(master, "cursos/a/l1/index.m3u8", "cursos/a/l1/", rw);
    expect(out).toContain("/api/video/L1/playlist?p=cursos%2Fa%2Fl1%2F720p%2Findex.m3u8");
    expect(out).not.toContain("firmado");
  });

  it("firma el init de fMP4", async () => {
    const fmp4 = `#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:6,\nseg1.m4s`;
    const out = await rewritePlaylist(fmp4, "c/l/index.m3u8", "c/l/", rw);
    expect(out).toContain('#EXT-X-MAP:URI="https://firmado/c/l/init.mp4?sig=x"');
  });

  it("rechaza playlists que apuntan fuera de la carpeta", async () => {
    const bad = `#EXTM3U\n#EXTINF:6,\n../otra-leccion/seg.ts`;
    await expect(rewritePlaylist(bad, "c/l/index.m3u8", "c/l/", rw)).rejects.toThrow(PlaylistError);
  });

  it("rechaza lo que no es una playlist", async () => {
    await expect(rewritePlaylist("hola", "c/l/i.m3u8", "c/l/", rw)).rejects.toThrow(PlaylistError);
  });
});

describe("segmentUrlTtl", () => {
  it("dura el vídeo más un margen, con límites", () => {
    expect(segmentUrlTtl(600)).toBe(600 + 1800);
    expect(segmentUrlTtl(60)).toBe(60 + 1800);
    expect(segmentUrlTtl(10 * 3600)).toBe(4 * 3600);
    expect(segmentUrlTtl(null)).toBe(3600 + 1800);
  });
});

describe("stableSigning", () => {
  const W = 600;
  it("firma igual dentro de la misma ventana y cambia en la siguiente", () => {
    const a = stableSigning(1_200_000_000, 2400, W);
    const b = stableSigning(1_200_000_000 + 500_000, 2400, W);
    const c = stableSigning(1_200_000_000 + 700_000, 2400, W);
    expect(a).toEqual(b);
    expect(c.signingDate.getTime()).not.toBe(a.signingDate.getTime());
  });

  it("cada URL sigue valiendo al menos el tiempo pedido y la caché nunca lo supera", () => {
    for (const offset of [0, 1, 299_000, 599_999]) {
      const now = 1_800_000_000_000 + offset;
      const s = stableSigning(now, 2400, W);
      const remaining = s.signingDate.getTime() / 1000 + s.expiresIn - now / 1000;
      expect(remaining).toBeGreaterThanOrEqual(2400);
      expect(s.cacheSeconds).toBeLessThanOrEqual(remaining);
    }
  });

  it("respeta el máximo de 7 días de S3/R2", () => {
    expect(stableSigning(0, 30 * 24 * 3600).expiresIn).toBe(7 * 24 * 3600);
  });
});
