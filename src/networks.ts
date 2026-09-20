import { precompiles, preinstalls } from "./contracts.ts";
import type { Address, ChainContract, KonstellationChain } from "./types.ts";

/** Native token, shared by every network (D2: KASH, base denom `esp`, 18 decimals). */
export const nativeCurrency = {
  name: "Konstellation",
  symbol: "KASH",
  decimals: 18,
} as const;

/** Bech32 human-readable part (D3). */
export const bech32Prefix = "kons";

/** Base denom (D2). 1 KASH = 10^18 esp. */
export const baseDenom = "esp";

type GenesisContract = ChainContract & { readonly blockCreated: 0 };

function asChainContracts<T extends { readonly [K in keyof T]: Address }>(
  addresses: T,
): { readonly [K in keyof T]: GenesisContract } {
  const out: Partial<Record<keyof T, GenesisContract>> = {};
  for (const name of Object.keys(addresses) as (keyof T)[]) {
    // Preinstalls are written by genesis and precompiles are active in the
    // genesis EVM params, so every address is usable from block 0.
    out[name] = { address: addresses[name], blockCreated: 0 };
  }
  return out as { readonly [K in keyof T]: GenesisContract };
}

/**
 * viem `Chain.contracts` for every network: each preinstall and precompile as a
 * `ChainContract`, `multicall3` among them at its canonical address. Frozen so
 * a dapp cannot mutate the shared object.
 */
export const chainContracts = Object.freeze({
  ...asChainContracts(preinstalls),
  ...asChainContracts(precompiles),
});

/**
 * Mainnet: `konstellation-1`, EIP-155 id 5667 (D1).
 *
 * `rpcUrls` and `blockExplorers` are empty until public endpoints exist
 * (ENGINEERING.md §6.5, §6.6; `networks/konstellation-1/`). Nothing is
 * deployed yet — do not fill these in with guessed hostnames.
 */
export const konstellation = {
  id: 5667,
  name: "Konstellation",
  cosmosChainId: "konstellation-1",
  bech32Prefix,
  baseDenom,
  nativeCurrency,
  rpcUrls: {
    default: { http: [], webSocket: [] },
  },
  contracts: chainContracts,
  testnet: false,
} as const satisfies KonstellationChain;

/**
 * Testnet: `testnet-1`, EIP-155 id 56671 (D1).
 *
 * `rpcUrls` and `blockExplorers` are empty until `networks/testnet-1/chain.json`
 * lists endpoints; the faucet URL is likewise not known yet.
 */
export const testnet = {
  id: 56671,
  name: "Konstellation Testnet",
  cosmosChainId: "testnet-1",
  bech32Prefix,
  baseDenom,
  nativeCurrency,
  rpcUrls: {
    default: { http: [], webSocket: [] },
  },
  contracts: chainContracts,
  testnet: true,
} as const satisfies KonstellationChain;

/**
 * Local dev chain as started by `konstellation/local_node.sh`: Cosmos chain-id
 * `konstellation-local-1`, EIP-155 id 56670 — the id `konstellationd init`
 * assigns to every Cosmos chain-id it does not recognise (D1 follow-up), so
 * any locally initialised chain gets 56670 whatever its Cosmos chain-id is.
 * JSON-RPC defaults to `http://127.0.0.1:8545` (HTTP) and `ws://127.0.0.1:8546`.
 */
export const localnet = {
  id: 56670,
  name: "Konstellation Localnet",
  cosmosChainId: "konstellation-local-1",
  bech32Prefix,
  baseDenom,
  nativeCurrency,
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
      webSocket: ["ws://127.0.0.1:8546"],
    },
  },
  contracts: chainContracts,
  testnet: true,
} as const satisfies KonstellationChain;

/** All networks, keyed by their export name. */
export const networks = { konstellation, testnet, localnet } as const;

/** All networks, keyed by EIP-155 chain id. */
export const networksById: Readonly<Record<number, KonstellationChain>> = {
  [konstellation.id]: konstellation,
  [testnet.id]: testnet,
  [localnet.id]: localnet,
};
