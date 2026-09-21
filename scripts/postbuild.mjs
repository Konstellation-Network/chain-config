// The package root is "type": "module", so files under dist/cjs must be
// re-declared as CommonJS or Node would parse tsc's require() output as ESM.
// Bundlers read `sideEffects` from the *nearest* package.json, so each nested
// one must repeat it or the root's `"sideEffects": false` is ignored.
import { writeFileSync } from "node:fs";

writeFileSync("dist/cjs/package.json", JSON.stringify({ type: "commonjs", sideEffects: false }, null, 2) + "\n");
writeFileSync("dist/esm/package.json", JSON.stringify({ type: "module", sideEffects: false }, null, 2) + "\n");
