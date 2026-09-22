/**
 * ENGINEERING.md §5.2: "`chain-config` addresses match `contracts` deployments
 * — enforced by a test in `chain-config`."
 *
 * Reads the sibling checkouts in the org directory at test time:
 *   ../contracts/preinstalls/*.json            address per pinned preinstall
 *   ../contracts/test/DeployWKASH.t.sol        pinned WKASH CREATE2 address
 *   ../konstellation/x/compliance/precompile   ICompliance precompile address
 *   ../konstellation/app/config/chain.go       chain ids, denom, werc20 precompile
 *   ../konstellation/app/preinstalls/*.json    the embedded copies
 * Override the locations with KONSTELLATION_CONTRACTS_DIR / KONSTELLATION_CHAIN_DIR.
 *
 * A sibling absent from its default location skips its tests with a message
 * (counted as skipped in the summary). It is a failure, never a skip, when
 * (a) its env var was set explicitly and points nowhere — CI sets the var
 * only after a successful checkout, so a wrong path can never turn into a
 * green run; (b) KONSTELLATION_REQUIRE_SIBLINGS=1 is set; or (c) the sibling
 * is present but lacks the expected files.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { contracts, konstellation, localnet, testnet } from "../src/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const orgRoot = path.resolve(here, "..", "..");
const contractsDirEnv = process.env["KONSTELLATION_CONTRACTS_DIR"];
const chainDirEnv = process.env["KONSTELLATION_CHAIN_DIR"];
const contractsDir = contractsDirEnv || path.join(orgRoot, "contracts");
const chainDir = chainDirEnv || path.join(orgRoot, "konstellation");
const requireSiblings = process.env["KONSTELLATION_REQUIRE_SIBLINGS"] === "1";
const preinstallsDir = path.join(contractsDir, "preinstalls");
const wkashPinFile = path.join(contractsDir, "test", "DeployWKASH.t.sol");

/** JSON `name` in contracts/preinstalls/<name>.json -> key in `contracts.preinstalls`. */
const preinstallKeyByName: Record<string, keyof typeof contracts.preinstalls> = {
  Multicall3: "multicall3",
  Permit2: "permit2",
  EntryPointV07: "entryPointV07",
  SenderCreatorV07: "senderCreatorV07",
  EntryPointV08: "entryPointV08",
  SenderCreatorV08: "senderCreatorV08",
  Create2Deployer: "create2Deployer",
};

/**
 * Skip reason for a missing sibling, or `false` when it is there. Throws
 * instead of skipping when the location was given explicitly or
 * KONSTELLATION_REQUIRE_SIBLINGS=1.
 */
function siblingSkip(dir: string, explicit: boolean, repo: string, envVar: string, purpose: string): string | false {
  if (existsSync(dir)) return false;
  const msg =
    `sibling repo not found at ${dir} — clone konstellation-network/${repo} next to this repo, ` +
    `or set ${envVar}, to ${purpose}`;
  if (explicit) throw new Error(`${envVar} is set but ${msg}`);
  if (requireSiblings) throw new Error(`KONSTELLATION_REQUIRE_SIBLINGS=1 but ${msg}`);
  return msg;
}

const skipContracts = siblingSkip(
  contractsDir,
  Boolean(contractsDirEnv),
  "contracts",
  "KONSTELLATION_CONTRACTS_DIR",
  "run the §5.2 invariant",
);
const skipChain = siblingSkip(
  chainDir,
  Boolean(chainDirEnv),
  "konstellation",
  "KONSTELLATION_CHAIN_DIR",
  "check precompile addresses and chain ids against the chain",
);

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/**
 * Remove `/* … *\/` and `// …` comments from Go or Solidity source without
 * touching string literals, so a commented-out `EXPECTED_WKASH = …` or a
 * `// Address = "0x…"` can never satisfy (or fool) a match below.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const next = src[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      // string literal: copy verbatim, honouring backslash escapes (not in raw ` strings)
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && c !== "`") j++;
        j++;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      out += " ";
    } else if (c === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      i = end === -1 ? src.length : end;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** The single capture of `re` (which must carry the `g` flag) in `src`; fails on 0 or >1 matches. */
function exactlyOne(src: string, re: RegExp, what: string): string {
  const matches = [...src.matchAll(re)].map((m) => m[1]).filter((v): v is string => v !== undefined);
  assert.equal(matches.length, 1, `${what}: expected exactly one definition, found ${matches.length}${matches.length ? ` (${matches.join(", ")})` : ""}`);
  return matches[0]!;
}

describe("§5.2 invariant: chain-config addresses match contracts", () => {
  // Collected up front so that a present sibling with a missing/renamed
  // preinstalls directory is a failure below, never a silent skip.
  const files = !skipContracts && existsSync(preinstallsDir)
    ? readdirSync(preinstallsDir).filter((f) => f.endsWith(".json"))
    : [];

  it("contracts/preinstalls exists and pins at least one preinstall", { skip: skipContracts }, () => {
    assert.ok(existsSync(preinstallsDir), `${contractsDir} exists but ${preinstallsDir} does not — was it moved?`);
    assert.ok(files.length > 0, `no *.json in ${preinstallsDir}`);
  });

  for (const file of files) {
    it(`${file} address is in the package`, () => {
      const json = readJson<{ name?: string; address?: string }>(path.join(preinstallsDir, file));
      assert.ok(json.name, `${file}: missing "name"`);
      assert.ok(json.address, `${file}: missing "address"`);
      const key = preinstallKeyByName[json.name];
      assert.ok(
        key,
        `${file}: preinstall "${json.name}" has no entry in src/contracts.ts — ` +
          `contracts pinned a new preinstall; add it to the package and to preinstallKeyByName`,
      );
      assert.equal(
        contracts.preinstalls[key].toLowerCase(),
        json.address.toLowerCase(),
        `${file}: package has ${contracts.preinstalls[key]}, contracts has ${json.address}`,
      );
    });
  }

  it("every package preinstall that contracts pins is present in contracts", { skip: skipContracts }, () => {
    const names = new Set(files.map((f) => readJson<{ name: string }>(path.join(preinstallsDir, f)).name));
    for (const name of Object.keys(preinstallKeyByName)) {
      assert.ok(names.has(name), `contracts/preinstalls no longer pins ${name}; remove it from the package too`);
    }
  });

  it("WKASH address matches the pin in contracts/test/DeployWKASH.t.sol", { skip: skipContracts }, () => {
    assert.ok(existsSync(wkashPinFile), `${wkashPinFile} not found — was the WKASH pin moved?`);
    const src = stripComments(readFileSync(wkashPinFile, "utf8"));
    // Anchor to the pinning contract: only its own EXPECTED_WKASH counts, so a
    // second contract in the file (or a commented-out old value) cannot match.
    // `[ \t]*`, not `\s*`: `\s*` would swallow preceding blank lines and make
    // the "next contract" search below find this same contract again.
    const contractMatches = [...src.matchAll(/^[ \t]*contract[ \t]+DeployWKASHTest\b[^{]*\{/gm)];
    assert.equal(contractMatches.length, 1, `expected exactly one \`contract DeployWKASHTest\` in ${wkashPinFile}`);
    const start = contractMatches[0]!.index + contractMatches[0]![0].length;
    const nextContract = src.slice(start).search(/^[ \t]*(?:abstract[ \t]+)?(?:contract|library|interface)[ \t]+\w+/m);
    const body = nextContract === -1 ? src.slice(start) : src.slice(start, start + nextContract);
    const pinned = exactlyOne(
      body,
      /^\s*address\s+(?:\w+\s+)*constant\s+EXPECTED_WKASH\s*=\s*(0x[0-9a-fA-F]{40})\s*;/gm,
      "DeployWKASHTest.EXPECTED_WKASH",
    );
    assert.equal(contracts.wkash.toLowerCase(), pinned.toLowerCase(), `package has ${contracts.wkash}, contracts pins ${pinned}`);
  });
});

describe("precompile addresses, chain ids and denom match konstellation", () => {
  /**
   * Value of a Go constant in a file under the chain repo: `NAME [type] = "..."`
   * inside a `const (...)` block, or a single-line `const NAME = "..."`.
   * Comments are stripped first, the match is line-anchored (so
   * `EVMChainIDMainnet` cannot match inside another name), and there must be
   * exactly one definition.
   */
  const goConst = (file: string, name: string): string => {
    const full = path.join(chainDir, file);
    assert.ok(existsSync(full), `${full} not found — was it moved?`);
    const src = stripComments(readFileSync(full, "utf8"));
    return exactlyOne(src, new RegExp(`^\\s*(?:const\\s+)?${name}\\s+(?:\\w+\\s+)?=\\s*"?([-\\w.]+)"?`, "gm"), `${file}: const ${name}`);
  };

  it("ICompliance precompile address", { skip: skipChain }, () => {
    assert.equal(
      contracts.precompiles.compliance.toLowerCase(),
      goConst("x/compliance/precompile/precompile.go", "Address").toLowerCase(),
    );
    assert.equal(
      contracts.precompiles.compliance.toLowerCase(),
      goConst("app/config/chain.go", "CompliancePrecompileAddress").toLowerCase(),
    );
  });

  it("werc20 native precompile address", { skip: skipChain }, () => {
    assert.equal(contracts.precompiles.werc20.toLowerCase(), goConst("app/config/chain.go", "WKASHPrecompile").toLowerCase());
  });

  it("EIP-155 chain ids", { skip: skipChain }, () => {
    assert.equal(konstellation.id, Number(goConst("app/config/chain.go", "EVMChainIDMainnet")));
    assert.equal(testnet.id, Number(goConst("app/config/chain.go", "EVMChainIDTestnet")));
    assert.equal(localnet.id, Number(goConst("app/config/chain.go", "EVMChainIDLocal")));
  });

  it("Cosmos chain ids", { skip: skipChain }, () => {
    assert.equal(konstellation.cosmosChainId, goConst("app/config/chain.go", "ChainIDMainnet"));
    assert.equal(testnet.cosmosChainId, goConst("app/config/chain.go", "ChainIDTestnet"));
    assert.equal(localnet.cosmosChainId, goConst("app/config/chain.go", "ChainIDLocal"));
  });

  it("base denom and symbol", { skip: skipChain }, () => {
    assert.equal(konstellation.baseDenom, goConst("app/config/chain.go", "BaseDenom"));
    assert.equal(konstellation.nativeCurrency.symbol, goConst("app/config/chain.go", "Symbol"));
  });

  it("preinstalls embedded in konstellation/app/preinstalls are the same set as the package", { skip: skipChain }, () => {
    const embedded = path.join(chainDir, "app", "preinstalls");
    assert.ok(existsSync(embedded), `${embedded} not found — was the embed directory moved?`);
    const files = readdirSync(embedded).filter((f) => f.endsWith(".json"));
    assert.ok(files.length > 0, `no *.json in ${embedded}`);
    for (const f of files) {
      const json = readJson<{ name: string; address: string }>(path.join(embedded, f));
      const key = preinstallKeyByName[json.name];
      assert.ok(key, `${f}: embedded preinstall "${json.name}" is not in the package`);
      assert.equal(contracts.preinstalls[key].toLowerCase(), json.address.toLowerCase(), f);
    }
  });
});
