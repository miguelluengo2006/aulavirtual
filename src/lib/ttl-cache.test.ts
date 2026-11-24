import { describe, expect, it } from "vitest";
import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  it("caduca pasado el tiempo", () => {
    let t = 0;
    const c = new TtlCache<string>(1000, 10, () => t);
    c.set("a", "x");
    t = 999;
    expect(c.get("a")).toBe("x");
    t = 1000;
    expect(c.get("a")).toBeUndefined();
  });

  it("descarta lo menos usado al pasarse de tamaño", () => {
    const c = new TtlCache<number>(60_000, 2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // "a" pasa a ser la más reciente
    c.set("c", 3);
    expect(c.get("a")).toBe(1);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("c")).toBe(3);
  });

  it("comparte una misma carga entre peticiones simultáneas y no guarda los errores", async () => {
    const c = new TtlCache<number>(60_000, 10);
    let calls = 0;
    const load = async () => ++calls;
    const [x, y] = await Promise.all([c.getOrLoad("k", load), c.getOrLoad("k", load)]);
    expect([x, y, calls]).toEqual([1, 1, 1]);

    await expect(c.getOrLoad("e", () => Promise.reject(new Error("fallo")))).rejects.toThrow("fallo");
    expect(await c.getOrLoad("e", async () => 7)).toBe(7);
  });
});
