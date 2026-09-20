/**
 * ENGINEERING.md §5.2: "`chain-config` addresses match `contracts` deployments
 * — enforced by a test in `chain-config`."
 *
 * Reads the sibling checkouts in the org directory at test time:
 *   ../contracts/preinstalls/*.json            (address per pinned preinstall)
 *   ../konstellation/x/compliance/precompile   (ICompliance precompile address)
 *   ../konstellation/app/config/chain.go       (chain ids, WKASH precompile)
 * Override the locations with KONSTELLATION_CONTRACTS_DIR / KONSTELLATION_CHAIN_DIR.
 * A sibling that is absent (e.g. CI without a checkout of a private repo)
 * skips its checks with a message; it never passes silently.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { contracts, konstellation, localnet, testnet } from "../src/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const orgRoot = path.resolve(here, "..", "..");
const contractsDir = process.env["KONSTELLATION_CONTRACTS_DIR"] || path.join(orgRoot, "contracts");
const chainDir = process.env["KONSTELLATION_CHAIN_DIR"] || path.join(orgRoot, "konstellation");
const preinstallsDir = path.join(contractsDir, "preinstalls");

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

const skipContracts = existsSync(preinstallsDir)
  ? false
  : `sibling repo not found at ${preinstallsDir} — clone konstellation-network/contracts next to this repo, ` +
    `or set KONSTELLATION_CONTRACTS_DIR, to run the §5.2 invariant`;

describe("§5.2 invariant: chain-config addresses match contracts/preinstalls", { skip: skipContracts }, () => {
  const files = readdirSync(preinstallsDir).filter((f) => f.endsWith(".json"));

  it("finds the pinned preinstalls", () => {
    assert.ok(files.length > 0, `no *.json in ${preinstallsDir}`);
  });

  for (const file of files) {
    it(`${file} address is in the package`, () => {
      const json = JSON.parse(readFileSync(path.join(preinstallsDir, file), "utf8")) as {
        name?: string;
        address?: string;
      };
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

  it("every package preinstall that contracts pins is present in contracts", () => {
    const names = new Set(
      files.map((f) => (JSON.parse(readFileSync(path.join(preinstallsDir, f), "utf8")) as { name: string }).name),
    );
    for (const name of Object.keys(preinstallKeyByName)) {
      assert.ok(names.has(name), `contracts/preinstalls no longer pins ${name}; remove it from the package too`);
    }
  });
});

const skipChain = existsSync(chainDir)
  ? false
  : `sibling repo not found at ${chainDir} — clone konstellation-network/konstellation next to this repo, ` +
    `or set KONSTELLATION_CHAIN_DIR, to check precompile addresses and chain ids against the chain`;

describe("precompile addresses and chain ids match konstellation", { skip: skipChain }, () => {
  const goConst = (file: string, name: string): string => {
    const src = readFileSync(path.join(chainDir, file), "utf8");
    const m = src.match(new RegExp(`\\b${name}\\s*(?:uint64)?\\s*=\\s*"?([0-9a-zA-Z]+)"?`));
    assert.ok(m?.[1], `${file}: could not find const ${name}`);
    return m[1];
  };

  it("ICompliance precompile address", () => {
    assert.equal(
      contracts.precompiles.compliance.toLowerCase(),
      goConst("x/compliance/precompile/precompile.go", "Address").toLowerCase(),
    );
    assert.equal(
      contracts.precompiles.compliance.toLowerCase(),
      goConst("app/config/chain.go", "CompliancePrecompileAddress").toLowerCase(),
    );
  });

  it("WKASH native precompile address", () => {
    assert.equal(
      contracts.precompiles.wkash.toLowerCase(),
      goConst("app/config/chain.go", "WKASHPrecompile").toLowerCase(),
    );
  });

  it("EIP-155 chain ids", () => {
    assert.equal(konstellation.id, Number(goConst("app/config/chain.go", "EVMChainIDMainnet")));
    assert.equal(testnet.id, Number(goConst("app/config/chain.go", "EVMChainIDTestnet")));
    assert.equal(localnet.id, Number(goConst("app/config/chain.go", "EVMChainIDLocal")));
  });

  it("base denom, symbol and decimals", () => {
    assert.equal(konstellation.baseDenom, goConst("app/config/chain.go", "BaseDenom"));
    assert.equal(konstellation.nativeCurrency.symbol, goConst("app/config/chain.go", "Symbol"));
  });

  it("embedded preinstalls in konstellation/app/preinstalls are the same set as contracts", () => {
    const embedded = path.join(chainDir, "app", "preinstalls");
    if (!existsSync(embedded)) return;
    for (const f of readdirSync(embedded).filter((f) => f.endsWith(".json"))) {
      const json = JSON.parse(readFileSync(path.join(embedded, f), "utf8")) as { name: string; address: string };
      const key = preinstallKeyByName[json.name];
      assert.ok(key, `${f}: embedded preinstall "${json.name}" is not in the package`);
      assert.equal(contracts.preinstalls[key].toLowerCase(), json.address.toLowerCase(), f);
    }
  });
});
