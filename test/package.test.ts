import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAddress, isAddress } from "viem";

import {
  addEthereumChainParameters,
  baseDenom,
  bech32Prefix,
  chainContracts,
  contracts,
  devnet,
  konstellation,
  localnet,
  networks,
  networksById,
  getNetworkById,
  testnet,
  toAddEthereumChainParameter,
  toHexChainId,
  wkash,
} from "../src/index.ts";

describe("network identity (ENGINEERING.md §1)", () => {
  it("chain ids", () => {
    assert.equal(konstellation.id, 5667);
    assert.equal(devnet.id, 56672);
    assert.equal(testnet.id, 56671);
    assert.equal(localnet.id, 56670);
  });

  it("cosmos chain ids", () => {
    assert.equal(konstellation.cosmosChainId, "konstellation-1");
    assert.equal(devnet.cosmosChainId, "devnet-1");
    assert.equal(testnet.cosmosChainId, "testnet-1");
    assert.equal(localnet.cosmosChainId, "konstellation-local-1");
  });

  it("token", () => {
    for (const chain of Object.values(networks)) {
      assert.deepEqual(chain.nativeCurrency, { name: "Konstellation", symbol: "KASH", decimals: 18 });
      assert.equal(chain.baseDenom, "esp");
      assert.equal(chain.bech32Prefix, "kons");
    }
    assert.equal(baseDenom, "esp");
    assert.equal(bech32Prefix, "kons");
  });

  it("only mainnet is not a testnet", () => {
    assert.equal(konstellation.testnet, false);
    assert.equal(devnet.testnet, true);
    assert.equal(testnet.testnet, true);
    assert.equal(localnet.testnet, true);
  });

  it("networksById covers every network exactly once and each key is its chain's id", () => {
    assert.deepEqual(
      Object.keys(networksById).map(Number).sort((a, b) => a - b),
      [5667, 56670, 56671, 56672],
    );
    for (const [k, c] of Object.entries(networksById)) {
      assert.equal(c.id, Number(k), `networksById[${k}] points at chain id ${c.id}`);
    }
    assert.equal(networksById[5667], konstellation);
    assert.equal(networksById[56672], devnet);
    assert.equal(networksById[56671], testnet);
    assert.equal(networksById[56670], localnet);
  });

  it("getNetworkById accepts numbers, decimal and 0x-hex strings, and nothing else", () => {
    assert.equal(getNetworkById(5667), konstellation);
    assert.equal(getNetworkById(56672), devnet);
    assert.equal(getNetworkById(56671), testnet);
    assert.equal(getNetworkById("5667"), konstellation);
    assert.equal(getNetworkById("0x1623"), konstellation);
    assert.equal(getNetworkById("0xdd60"), devnet);
    assert.equal(getNetworkById("0xdd5f"), testnet);
    assert.equal(getNetworkById("0xDD5E"), localnet);
    for (const bad of ["__proto__", "constructor", "toString", "hasOwnProperty", "", " 5667", "5667 ", "0x", "0x1623x", "1e4", "-5667", "0x1623".repeat(3)]) {
      assert.equal(getNetworkById(bad), undefined, JSON.stringify(bad));
    }
    for (const bad of [1, 0, -5667, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      assert.equal(getNetworkById(bad), undefined, String(bad));
    }
    assert.notEqual(getNetworkById("__proto__"), Object.prototype);
  });

  it("display names are distinct so a wallet never shows two networks under one label", () => {
    const names = Object.values(networks).map((c) => c.name);
    assert.equal(new Set(names).size, names.length, names.join(", "));
  });

  it("every export is deep-frozen", () => {
    const walk = (value: unknown, label: string): void => {
      if (value === null || typeof value !== "object") return;
      assert.ok(Object.isFrozen(value), `${label} is not frozen`);
      for (const [k, v] of Object.entries(value)) walk(v, `${label}.${k}`);
    };
    walk(networks, "networks");
    walk(networksById, "networksById");
    walk(contracts, "contracts");
    walk(chainContracts, "chainContracts");
    walk(addEthereumChainParameters, "addEthereumChainParameters");
    assert.throws(() => {
      (konstellation.rpcUrls.default.http as unknown as string[]).push("https://example.invalid");
    }, TypeError);
  });

  it("no invented endpoints: mainnet, devnet and testnet have no RPC or explorer yet", () => {
    for (const chain of [konstellation, devnet, testnet]) {
      assert.deepEqual(chain.rpcUrls.default.http, []);
      assert.deepEqual(chain.rpcUrls.default.webSocket, []);
      assert.ok(!("blockExplorers" in chain), "blockExplorers must stay absent until an explorer exists");
    }
    assert.deepEqual(localnet.rpcUrls.default.http, ["http://127.0.0.1:8545"]);
  });
});

/**
 * The expected value of EVERY address, written out a second time so that a
 * swap or typo in src/contracts.ts is a diff in two files, not one. Sources:
 * cosmos/evm v0.7.3 `x/vm/types/preinstall.go` + `precompiles.go`,
 * `contracts/preinstalls/*.json`, `contracts/test/DeployWKASH.t.sol`,
 * `konstellation/x/compliance/precompile/precompile.go`,
 * `konstellation/app/config/chain.go`.
 */
const expectedPreinstalls = {
  create2: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  safeSingletonFactory: "0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7",
  historyStorage: "0x0000F90827F1C53a10cb7A02335B175320002935",
  entryPointV07: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  senderCreatorV07: "0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C",
  entryPointV08: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
  senderCreatorV08: "0x449ED7C3e6Fee6a97311d4b55475DF59C44AdD33",
  create2Deployer: "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2",
} as const;

const expectedPrecompiles = {
  p256: "0x0000000000000000000000000000000000000100",
  bech32: "0x0000000000000000000000000000000000000400",
  staking: "0x0000000000000000000000000000000000000800",
  distribution: "0x0000000000000000000000000000000000000801",
  ics20: "0x0000000000000000000000000000000000000802",
  bank: "0x0000000000000000000000000000000000000804",
  gov: "0x0000000000000000000000000000000000000805",
  slashing: "0x0000000000000000000000000000000000000806",
  ics02: "0x0000000000000000000000000000000000000807",
  compliance: "0x0000000000000000000000000000000000000900",
  werc20: "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517",
} as const;

/**
 * cosmos/evm v0.7.3 `x/vm/types.AvailableStaticPrecompiles`, in order, minus
 * `0x…0803` (`vesting`: listed upstream, no implementation, STATUS §5a P24),
 * followed by Konstellation's own range. `werc20` is a dynamic precompile and
 * not part of this list.
 * TODO: once `konstellation` exports its active precompile list as JSON
 * (e.g. from `app/genesis.go`), have test/invariant.test.ts compare against
 * that instead of this literal.
 */
const expectedStaticPrecompileOrder = [
  "0x0000000000000000000000000000000000000100", // p256
  "0x0000000000000000000000000000000000000400", // bech32
  "0x0000000000000000000000000000000000000800", // staking
  "0x0000000000000000000000000000000000000801", // distribution
  "0x0000000000000000000000000000000000000802", // ics20
  "0x0000000000000000000000000000000000000804", // bank
  "0x0000000000000000000000000000000000000805", // gov
  "0x0000000000000000000000000000000000000806", // slashing
  "0x0000000000000000000000000000000000000807", // ics02
  "0x0000000000000000000000000000000000000900", // compliance (Konstellation)
] as const;

const expectedWkash = "0x34Ab8285C63b876717C2c56151700D02623559bE";

describe("contract addresses", () => {
  const all = { ...contracts.preinstalls, ...contracts.precompiles, wkash: contracts.wkash };

  it("ten preinstalls, eleven precompiles and WKASH", () => {
    assert.equal(Object.keys(contracts.preinstalls).length, 10);
    assert.equal(Object.keys(contracts.precompiles).length, 11);
    assert.equal(contracts.wkash, wkash);
    assert.equal(wkash, expectedWkash);
  });

  it("every address equals the expected table, key by key", () => {
    assert.deepEqual({ ...contracts.preinstalls }, expectedPreinstalls);
    assert.deepEqual({ ...contracts.precompiles }, expectedPrecompiles);
    assert.deepEqual(Object.keys(contracts.preinstalls), Object.keys(expectedPreinstalls));
    assert.deepEqual(Object.keys(contracts.precompiles), Object.keys(expectedPrecompiles));
  });

  it("static precompiles are in cosmos/evm v0.7.3 AvailableStaticPrecompiles order, without vesting", () => {
    const { werc20: _werc20, ...statics } = contracts.precompiles;
    assert.deepEqual(Object.values(statics), expectedStaticPrecompileOrder);
    assert.ok(!Object.values(all).includes("0x0000000000000000000000000000000000000803"), "vesting must stay out");
    assert.ok(!("vesting" in contracts.precompiles));
  });

  it("werc20 precompile and WKASH contract are different things at different addresses", () => {
    assert.equal(contracts.precompiles.werc20, "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517");
    assert.notEqual(contracts.precompiles.werc20.toLowerCase(), contracts.wkash.toLowerCase());
    assert.ok(!("wkash" in contracts.precompiles), "wkash must not be a precompile key");
  });

  it("every address is EIP-55 checksummed", () => {
    for (const [name, address] of Object.entries(all)) {
      assert.ok(isAddress(address, { strict: true }), `${name}: ${address} is not a checksummed address`);
      assert.equal(address, getAddress(address), name);
    }
  });

  it("no two entries share an address", () => {
    const seen = new Map<string, string>();
    for (const [name, address] of Object.entries(all)) {
      const prev = seen.get(address.toLowerCase());
      assert.equal(prev, undefined, `${name} and ${prev} both at ${address}`);
      seen.set(address.toLowerCase(), name);
    }
  });

  it("multicall3 is wired the way viem expects and is the canonical address", () => {
    for (const chain of Object.values(networks)) {
      assert.equal(chain.contracts.multicall3.address, "0xcA11bde05977b3631167028862bE2a173976CA11");
      assert.equal(chain.contracts.multicall3.blockCreated, 0);
    }
  });

  it("per-network contracts carry every address in viem's ChainContract shape", () => {
    assert.ok(Object.isFrozen(chainContracts));
    for (const chain of Object.values(networks)) {
      assert.equal(chain.contracts, chainContracts);
      assert.deepEqual(Object.keys(chain.contracts).sort(), Object.keys(all).sort());
      for (const [name, address] of Object.entries(all)) {
        const expected = name === "wkash" ? { address } : { address, blockCreated: 0 };
        assert.deepEqual(chain.contracts[name as keyof typeof all], expected, name);
      }
    }
  });

  it("preinstall, precompile and wkash names do not collide", () => {
    const a = Object.keys(contracts.preinstalls);
    const b = new Set(Object.keys(contracts.precompiles));
    assert.deepEqual(a.filter((k) => b.has(k)), []);
    assert.ok(!("wkash" in contracts.preinstalls) && !b.has("wkash"));
  });

  it("compliance precompile opens the Konstellation range above cosmos/evm's", () => {
    assert.equal(contracts.precompiles.compliance, "0x0000000000000000000000000000000000000900");
  });
});

describe("EIP-3085 wallet_addEthereumChain", () => {
  it("hex chain ids", () => {
    assert.equal(toHexChainId(5667), "0x1623");
    assert.equal(toHexChainId(56672), "0xdd60");
    assert.equal(toHexChainId(56671), "0xdd5f");
    assert.equal(toHexChainId(56670), "0xdd5e");
    assert.throws(() => toHexChainId(0), RangeError);
    assert.throws(() => toHexChainId(1.5), RangeError);
  });

  it("per-network params", () => {
    assert.deepEqual(addEthereumChainParameters.konstellation, {
      chainId: "0x1623",
      chainName: "Konstellation",
      nativeCurrency: { name: "Konstellation", symbol: "KASH", decimals: 18 },
      rpcUrls: [],
    });
    assert.equal(addEthereumChainParameters.devnet.chainId, "0xdd60");
    assert.equal(addEthereumChainParameters.devnet.chainName, "Konstellation Devnet");
    assert.equal(addEthereumChainParameters.testnet.chainId, "0xdd5f");
    assert.deepEqual(addEthereumChainParameters.localnet.rpcUrls, ["http://127.0.0.1:8545"]);
  });

  // MetaMask Mobile's validateBlockExplorerUrls and the extension's (<= v12)
  // validator: `blockExplorerUrls` must be absent or a non-empty array with a
  // valid https URL. An empty array is rejected.
  const acceptedByMetaMask = (p: { blockExplorerUrls?: readonly string[]; iconUrls?: readonly string[] }): boolean =>
    !("blockExplorerUrls" in p && p.blockExplorerUrls !== undefined && p.blockExplorerUrls.length === 0) &&
    !("iconUrls" in p && p.iconUrls !== undefined && p.iconUrls.length === 0);

  it("omits blockExplorerUrls and iconUrls when there is nothing to put in them", () => {
    for (const [name, p] of Object.entries(addEthereumChainParameters)) {
      assert.ok(!("blockExplorerUrls" in p), `${name}: blockExplorerUrls must be absent, not []`);
      assert.ok(!("iconUrls" in p), `${name}: iconUrls must be absent, not []`);
      assert.ok(acceptedByMetaMask(p), name);
    }
    const withRpc = toAddEthereumChainParameter(testnet, { rpcUrls: ["https://example.invalid/rpc"] });
    assert.ok(!("blockExplorerUrls" in withRpc));
    const explicitEmpty = toAddEthereumChainParameter(testnet, { blockExplorerUrls: [], iconUrls: [] });
    assert.ok(!("blockExplorerUrls" in explicitEmpty) && !("iconUrls" in explicitEmpty));
    assert.ok(acceptedByMetaMask(explicitEmpty));
  });

  it("rejects override URLs a wallet would refuse, before the request is made", () => {
    const ok = ["https://rpc.example.invalid", "wss://rpc.example.invalid/ws", "http://localhost:8545", "http://127.0.0.1:8545", "ws://[::1]:8546"];
    for (const u of ok) assert.doesNotThrow(() => toAddEthereumChainParameter(testnet, { rpcUrls: [u] }), u);
    const bad = ["rpc.example.invalid", "http://rpc.example.invalid", "ws://rpc.example.invalid", "ftp://x.invalid", "not a url", "javascript:alert(1)"];
    for (const u of bad) {
      assert.throws(() => toAddEthereumChainParameter(testnet, { rpcUrls: [u] }), TypeError, u);
      assert.throws(() => toAddEthereumChainParameter(testnet, { blockExplorerUrls: [u] }), TypeError, u);
      assert.throws(() => toAddEthereumChainParameter(testnet, { iconUrls: [u] }), TypeError, u);
    }
  });

  it("overrides fill in the endpoints a dapp knows about", () => {
    const p = toAddEthereumChainParameter(testnet, {
      rpcUrls: ["https://example.invalid/rpc"],
      blockExplorerUrls: ["https://example.invalid/explorer"],
      iconUrls: ["https://example.invalid/icon.svg"],
    });
    assert.deepEqual(p.rpcUrls, ["https://example.invalid/rpc"]);
    assert.deepEqual(p.blockExplorerUrls, ["https://example.invalid/explorer"]);
    assert.deepEqual(p.iconUrls, ["https://example.invalid/icon.svg"]);
    assert.equal(p.chainId, "0xdd5f");
  });
});
