import type { AddEthereumChainParameter, KonstellationChain } from "./types.ts";
import { konstellation, localnet, testnet } from "./networks.ts";

/** Hex-encode an EIP-155 chain id the way EIP-3085 / EIP-695 expect (`0x1623`, no padding). */
export function toHexChainId(id: number): `0x${string}` {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError(`chain id must be a positive integer, got ${id}`);
  }
  return `0x${id.toString(16)}`;
}

/**
 * Build the EIP-3085 `wallet_addEthereumChain` parameter for a network.
 *
 * MetaMask rejects a request whose `rpcUrls` is empty, and this package ships
 * no public RPC endpoints yet (none exist). Pass your own `rpcUrls` /
 * `blockExplorerUrls` through `overrides` until they are published here.
 */
export function toAddEthereumChainParameter(
  chain: KonstellationChain,
  overrides: Partial<Pick<AddEthereumChainParameter, "rpcUrls" | "blockExplorerUrls" | "iconUrls">> = {},
): AddEthereumChainParameter {
  const rpcUrls = overrides.rpcUrls ?? chain.rpcUrls.default.http;
  const explorerUrl = chain.blockExplorers?.default.url;
  const blockExplorerUrls = overrides.blockExplorerUrls ?? (explorerUrl ? [explorerUrl] : []);
  return {
    chainId: toHexChainId(chain.id),
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls,
    blockExplorerUrls,
    ...(overrides.iconUrls ? { iconUrls: overrides.iconUrls } : {}),
  };
}

/** Ready-made EIP-3085 params. `rpcUrls` are empty for mainnet and testnet (see above). */
export const addEthereumChainParameters = {
  konstellation: toAddEthereumChainParameter(konstellation),
  testnet: toAddEthereumChainParameter(testnet),
  localnet: toAddEthereumChainParameter(localnet),
} as const;
