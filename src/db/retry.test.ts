import { describe, expect, it } from "vitest";
import { connectWithRetry, isTransientConnectError } from "./retry";

describe("isTransientConnectError", () => {
  it("reconoce los fallos al abrir la conexión", () => {
    expect(isTransientConnectError(new Error("Connection terminated due to connection timeout"))).toBe(true);
    expect(isTransientConnectError(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(isTransientConnectError(new Error("timeout exceeded when trying to connect"))).toBe(true);
    expect(isTransientConnectError(Object.assign(new Error("x"), { code: "ECONNRESET" }))).toBe(true);
  });

  it("no reintenta errores de verdad (contraseña, SQL)", () => {
    expect(isTransientConnectError(new Error('password authentication failed for user "postgres"'))).toBe(false);
    expect(isTransientConnectError(new Error('relation "x" does not exist'))).toBe(false);
    expect(isTransientConnectError(null)).toBe(false);
  });
});

describe("connectWithRetry", () => {
  it("reintenta una vez un fallo transitorio", async () => {
    let n = 0;
    const r = await connectWithRetry(
      async () => {
        if (++n === 1) throw new Error("Connection terminated unexpectedly");
        return "ok";
      },
      { delayMs: 1 },
    );
    expect([r, n]).toEqual(["ok", 2]);
  });

  it("no reintenta más de lo indicado ni los errores que no son transitorios", async () => {
    let n = 0;
    await expect(
      connectWithRetry(
        async () => {
          n++;
          throw new Error("Connection terminated unexpectedly");
        },
        { delayMs: 1 },
      ),
    ).rejects.toThrow();
    expect(n).toBe(2);

    let m = 0;
    await expect(
      connectWithRetry(async () => {
        m++;
        throw new Error("password authentication failed");
      }),
    ).rejects.toThrow("password");
    expect(m).toBe(1);
  });
});
