/**
 * The published artifact is `dist/`, not `src/`. This test loads the built
 * ESM and CJS entry points — the exact files `package.json#exports` serves —
 * and asserts they carry the same exports, values and behaviour as the
 * sources the other tests exercise. Run after `npm run build` (`pretest`
 * does that); a missing `dist/` is a failure, not a skip.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import * as src from "../src/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const esmEntry = path.join(here, "..", "dist", "esm", "index.js");
const cjsEntry = path.join(here, "..", "dist", "cjs", "index.js");

type Exports = Record<string, unknown>;

async function loadDist(): Promise<{ esm: Exports; cjs: Exports }> {
  assert.ok(existsSync(esmEntry), `${esmEntry} missing — run \`npm run build\` first`);
  assert.ok(existsSync(cjsEntry), `${cjsEntry} missing — run \`npm run build\` first`);
  const esm = (await import(`${esmEntry}?t=${Date.now()}`)) as Exports;
  const cjs = createRequire(import.meta.url)(cjsEntry) as Exports;
  return { esm, cjs };
}

/** Deep-freeze check that also walks arrays. */
function assertDeepFrozen(value: unknown, label: string): void {
  if (value === null || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value), `${label} is not frozen`);
  for (const [k, v] of Object.entries(value)) assertDeepFrozen(v, `${label}.${k}`);
}

describe("dist/ matches src/", async () => {
  const { esm, cjs } = await loadDist();
  const srcExports = src as unknown as Exports;
  const valueKeys = Object.keys(srcExports).filter((k) => typeof srcExports[k] !== "function");
  const fnKeys = Object.keys(srcExports).filter((k) => typeof srcExports[k] === "function");

  for (const [flavour, dist] of [
    ["esm", esm],
    ["cjs", cjs],
  ] as const) {
    it(`${flavour}: same export names as src`, () => {
      const distKeys = Object.keys(dist).filter((k) => k !== "__esModule" && k !== "default");
      assert.deepEqual(distKeys.sort(), Object.keys(srcExports).sort());
    });

    it(`${flavour}: every value export deep-equals src (addresses, chain ids, params)`, () => {
      assert.ok(valueKeys.length >= 12, "sanity: value exports present");
      for (const k of valueKeys) {
        assert.deepEqual(dist[k], srcExports[k], `dist/${flavour} export "${k}" differs from src`);
      }
    });

    it(`${flavour}: value exports are deep-frozen`, () => {
      for (const k of valueKeys) assertDeepFrozen(dist[k], `dist/${flavour}.${k}`);
    });

    it(`${flavour}: functions behave like src`, () => {
      assert.deepEqual(fnKeys.sort(), ["getNetworkById", "toAddEthereumChainParameter", "toHexChainId"]);
      const d = dist as {
        toHexChainId: typeof src.toHexChainId;
        getNetworkById: typeof src.getNetworkById;
        toAddEthereumChainParameter: typeof src.toAddEthereumChainParameter;
        testnet: typeof src.testnet;
      };
      for (const id of [5667, 56671, 56670]) assert.equal(d.toHexChainId(id), src.toHexChainId(id));
      assert.throws(() => d.toHexChainId(0), RangeError);
      for (const id of [5667, "56671", "0xdd5e", "__proto__", 1]) {
        assert.deepEqual(d.getNetworkById(id), src.getNetworkById(id), String(id));
      }
      const overrides = { rpcUrls: ["https://rpc.example.invalid"] };
      assert.deepEqual(d.toAddEthereumChainParameter(d.testnet, overrides), src.toAddEthereumChainParameter(src.testnet, overrides));
      assert.throws(() => d.toAddEthereumChainParameter(d.testnet, { rpcUrls: ["http://remote.invalid"] }), TypeError);
    });
  }

  it("esm and cjs agree with each other", () => {
    for (const k of valueKeys) assert.deepEqual(esm[k], cjs[k], k);
  });
});
