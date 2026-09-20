// The package root is "type": "module", so files under dist/cjs must be
// re-declared as CommonJS or Node would parse tsc's require() output as ESM.
import { writeFileSync } from "node:fs";

writeFileSync("dist/cjs/package.json", JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
writeFileSync("dist/esm/package.json", JSON.stringify({ type: "module" }, null, 2) + "\n");
