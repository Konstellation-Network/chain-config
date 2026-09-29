import { precompiles, preinstalls, wkash } from "./contracts.ts";
import { deepFreeze } from "./freeze.ts";
import type { Address, ChainContract, KonstellationChain } from "./types.ts";

/** Native token, shared by every network (D2: KASH, base denom `esp`, 18 decimals). */
export const nativeCurrency = /* @__PURE__ */ deepFreeze({
  name: "Konstellation",
  symbol: "KASH",
  decimals: 18,
} as const);

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
 * `ChainContract` with `blockCreated: 0`, `multicall3` among them at its
 * canonical address, plus `wkash` (post-genesis deploy, so no `blockCreated`).
 * Deep-frozen so a dapp cannot mutate the shared object.
 */
export const chainContracts = /* @__PURE__ */ deepFreeze({
  ...asChainContracts(preinstalls),
  ...asChainContracts(precompiles),
  wkash: { address: wkash } satisfies ChainContract,
});

/**
 * Mainnet: `konstellation-1`, EIP-155 id 5667 (D1).
 *
 * `rpcUrls` and `blockExplorers` are empty until public endpoints exist
 * (ENGINEERING.md §6.5, §6.6; `networks/konstellation-1/`). Nothing is
 * deployed yet — do not fill these in with guessed hostnames.
 */
export const konstellation = /* @__PURE__ */ deepFreeze({
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
} as const satisfies KonstellationChain);

/**
 * Devnet: `devnet-1`, EIP-155 id 56672 (`0xdd60`). **The network dapp
 * developers start on** (decided 2026-09-29): one foundation-run validator,
 * the same binary version as mainnet, faucet-fed, rarely reset. Upgrades
 * reach it after `testnet-1` and 1–2 weeks before `konstellation-1`.
 *
 * `rpcUrls` and `blockExplorers` are empty until `networks/devnet-1/chain.json`
 * lists endpoints; the faucet URL is likewise not known yet.
 */
export const devnet = /* @__PURE__ */ deepFreeze({
  id: 56672,
  name: "Konstellation Devnet",
  cosmosChainId: "devnet-1",
  bech32Prefix,
  baseDenom,
  nativeCurrency,
  rpcUrls: {
    default: { http: [], webSocket: [] },
  },
  contracts: chainContracts,
  testnet: true,
} as const satisfies KonstellationChain);

/**
 * Testnet: `testnet-1`, EIP-155 id 56671 (D1). The validator/operations
 * rehearsal network — new releases land here first and it may be disrupted
 * by upgrade drills and chaos tests. Build dapps against `devnet` instead.
 *
 * `rpcUrls` and `blockExplorers` are empty until `networks/testnet-1/chain.json`
 * lists endpoints; the faucet URL is likewise not known yet.
 */
export const testnet = /* @__PURE__ */ deepFreeze({
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
} as const satisfies KonstellationChain);

/**
 * Local dev chain as started by `konstellation/local_node.sh`: Cosmos chain-id
 * `konstellation-local-1`, EIP-155 id 56670 — the id `konstellationd init`
 * assigns to every Cosmos chain-id it does not recognise (D1 follow-up), so
 * any locally initialised chain gets 56670 whatever its Cosmos chain-id is.
 * JSON-RPC defaults to `http://127.0.0.1:8545` (HTTP) and `ws://127.0.0.1:8546`.
 */
export const localnet = /* @__PURE__ */ deepFreeze({
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
} as const satisfies KonstellationChain);

/** All networks, keyed by their export name. */
export const networks = /* @__PURE__ */ deepFreeze({ konstellation, devnet, testnet, localnet } as const);

/**
 * All networks, keyed by EIP-155 chain id. The keys are the four literal ids,
 * so indexing with an arbitrary `number` is a type error — use
 * `getNetworkById` for that.
 */
export const networksById = /* @__PURE__ */ deepFreeze({
  [konstellation.id]: konstellation,
  [devnet.id]: devnet,
  [testnet.id]: testnet,
  [localnet.id]: localnet,
} as const);

/**
 * Look a network up by EIP-155 chain id: a number, a decimal string, or the
 * `0x`-hex string wallets return from `eth_chainId` / `chainChanged`.
 * `undefined` for anything else — including prototype keys such as
 * `"__proto__"`, which never reach the object.
 */
export function getNetworkById(id: number | string): KonstellationChain | undefined {
  let n: number;
  if (typeof id === "number") {
    n = id;
  } else if (/^0x[0-9a-fA-F]{1,13}$/.test(id)) {
    n = Number.parseInt(id, 16);
  } else if (/^[0-9]{1,15}$/.test(id)) {
    n = Number(id);
  } else {
    return undefined;
  }
  if (!Number.isSafeInteger(n) || n <= 0 || !Object.hasOwn(networksById, n)) return undefined;
  return networksById[n as keyof typeof networksById];
}
