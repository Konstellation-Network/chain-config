import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAddress, isAddress } from "viem";

import {
  addEthereumChainParameters,
  baseDenom,
  bech32Prefix,
  chainContracts,
  contracts,
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
    assert.equal(testnet.id, 56671);
    assert.equal(localnet.id, 56670);
  });

  it("cosmos chain ids", () => {
    assert.equal(konstellation.cosmosChainId, "konstellation-1");
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
    assert.equal(testnet.testnet, true);
    assert.equal(localnet.testnet, true);
  });

  it("networksById covers every network exactly once", () => {
    assert.deepEqual(
      Object.keys(networksById).map(Number).sort((a, b) => a - b),
      [5667, 56670, 56671],
    );
    assert.equal(networksById[5667], konstellation);
    assert.equal(getNetworkById(56671), testnet);
    assert.equal(getNetworkById(1), undefined);
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

  it("no invented endpoints: mainnet and testnet have no RPC or explorer yet", () => {
    for (const chain of [konstellation, testnet]) {
      assert.deepEqual(chain.rpcUrls.default.http, []);
      assert.deepEqual(chain.rpcUrls.default.webSocket, []);
      assert.ok(!("blockExplorers" in chain), "blockExplorers must stay absent until an explorer exists");
    }
    assert.deepEqual(localnet.rpcUrls.default.http, ["http://127.0.0.1:8545"]);
  });
});

describe("contract addresses", () => {
  const all = { ...contracts.preinstalls, ...contracts.precompiles, wkash: contracts.wkash };

  it("ten preinstalls, twelve precompiles and WKASH", () => {
    assert.equal(Object.keys(contracts.preinstalls).length, 10);
    assert.equal(Object.keys(contracts.precompiles).length, 12);
    assert.equal(contracts.wkash, wkash);
    assert.equal(wkash, "0x34Ab8285C63b876717C2c56151700D02623559bE");
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
