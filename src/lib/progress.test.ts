import { describe, expect, it } from "vitest";
import { checkBeat, isCompleted, mergeRange, watchedSeconds, type Range } from "./progress";

describe("mergeRange", () => {
  it("une tramos consecutivos", () => {
    let r: Range[] = [];
    r = mergeRange(r, [0, 10]);
    r = mergeRange(r, [10, 20]);
    expect(r).toEqual([[0, 20]]);
  });
  it("no cuenta dos veces lo que se vuelve a ver", () => {
    const r = mergeRange([[0, 60]], [20, 40]);
    expect(r).toEqual([[0, 60]]);
    expect(watchedSeconds(r)).toBe(60);
  });
  it("mantiene separados los saltos", () => {
    const r = mergeRange([[0, 30]], [120, 130]);
    expect(r).toEqual([[0, 30], [120, 130]]);
    expect(watchedSeconds(r)).toBe(40);
  });
  it("rellena un hueco y une los tres", () => {
    const r = mergeRange([[0, 30], [40, 60]], [28, 42]);
    expect(r).toEqual([[0, 60]]);
  });
  it("tolera 1 s de redondeo entre tramos", () => {
    expect(mergeRange([[0, 10]], [11, 20])).toEqual([[0, 20]]);
  });
});

describe("watchedSeconds", () => {
  it("no pasa de la duración", () => {
    expect(watchedSeconds([[0, 130]], 120)).toBe(120);
  });
});

describe("isCompleted", () => {
  it("se completa al 90 %", () => {
    expect(isCompleted(89, 100)).toBe(false);
    expect(isCompleted(90, 100)).toBe(true);
  });
  it("sin duración conocida no se completa", () => {
    expect(isCompleted(1000, null)).toBe(false);
  });
});

describe("checkBeat", () => {
  it("acepta un latido normal y redondea", () => {
    expect(checkBeat(10.4, 20.2, 600, 0)).toEqual({ ok: true, range: [10, 21] });
  });
  it("rechaza tramos al revés o negativos", () => {
    expect(checkBeat(20, 10, 600, 0).ok).toBe(false);
    expect(checkBeat(-5, 10, 600, 0).ok).toBe(false);
    expect(checkBeat(NaN, 10, 600, 0).ok).toBe(false);
  });
  it("rechaza tramos demasiado largos (p. ej. inventarse 10 min de golpe)", () => {
    expect(checkBeat(0, 600, 600, 0).ok).toBe(false);
  });
  it("rechaza tramos fuera del vídeo", () => {
    expect(checkBeat(700, 710, 600, 0).ok).toBe(false);
  });
  it("recorta al final del vídeo", () => {
    expect(checkBeat(590, 601.5, 600, 0)).toEqual({ ok: true, range: [590, 600] });
  });
  it("rechaza demasiados latidos en un minuto", () => {
    expect(checkBeat(0, 10, 600, 70).ok).toBe(false);
    expect(checkBeat(0, 10, 600, 60).ok).toBe(true);
  });
});
