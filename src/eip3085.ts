import { deepFreeze } from "./freeze.ts";
import { konstellation, localnet, testnet } from "./networks.ts";
import type { AddEthereumChainParameter, KonstellationChain } from "./types.ts";

/** Hex-encode an EIP-155 chain id the way EIP-3085 / EIP-695 expect (`0x1623`, no padding). */
export function toHexChainId(id: number): `0x${string}` {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError(`chain id must be a positive integer, got ${id}`);
  }
  return `0x${id.toString(16)}`;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * A URL a wallet will accept: `https:` / `wss:` anywhere, or `http:` / `ws:`
 * on a loopback host only. Anything else — a bare hostname, a typo'd scheme,
 * plain `http` to a remote host — is rejected here rather than by the wallet
 * later, where the error is less helpful.
 */
function assertWalletUrl(field: string, value: string): void {
  // scheme "://" authority — parsed by hand so the package needs neither the
  // DOM nor the Node `URL` type. authority = [userinfo@]host[:port].
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#\s]+)(?:[/?#]|$)/i.exec(value);
  if (!m) throw new TypeError(`${field}: "${value}" is not an absolute URL`);
  const scheme = m[1]!.toLowerCase();
  const authority = m[2]!.replace(/^[^@]*@/, "");
  const hostname = authority.startsWith("[") ? authority.slice(0, authority.indexOf("]") + 1) : authority.replace(/:\d*$/, "");
  const secure = scheme === "https" || scheme === "wss";
  const loopback = (scheme === "http" || scheme === "ws") && LOOPBACK_HOSTS.has(hostname.toLowerCase());
  if (!secure && !loopback) {
    throw new TypeError(`${field}: "${value}" must use https:// or wss:// (http:// and ws:// only on localhost)`);
  }
}

/**
 * Build the EIP-3085 `wallet_addEthereumChain` parameter for a network.
 *
 * MetaMask rejects a request whose `rpcUrls` is empty, and this package ships
 * no public RPC endpoints yet (none exist). Pass your own `rpcUrls` /
 * `blockExplorerUrls` through `overrides` until they are published here.
 *
 * `blockExplorerUrls` and `iconUrls` are omitted, not set to `[]`, when there
 * is nothing to put in them: MetaMask Mobile and the extension up to v12
 * reject an empty array, and an absent key is what viem sends too.
 *
 * Every URL in `overrides` is validated up front (`https:`/`wss:`, or
 * `http:`/`ws:` on localhost) and a bad one throws a `TypeError`.
 */
export function toAddEthereumChainParameter(
  chain: KonstellationChain,
  overrides: Partial<Pick<AddEthereumChainParameter, "rpcUrls" | "blockExplorerUrls" | "iconUrls">> = {},
): AddEthereumChainParameter {
  const rpcUrls = overrides.rpcUrls ?? chain.rpcUrls.default.http;
  const explorerUrl = chain.blockExplorers?.default.url;
  const blockExplorerUrls = overrides.blockExplorerUrls ?? (explorerUrl ? [explorerUrl] : []);
  const iconUrls = overrides.iconUrls ?? [];
  for (const u of overrides.rpcUrls ?? []) assertWalletUrl("rpcUrls", u);
  for (const u of overrides.blockExplorerUrls ?? []) assertWalletUrl("blockExplorerUrls", u);
  for (const u of overrides.iconUrls ?? []) assertWalletUrl("iconUrls", u);
  return {
    chainId: toHexChainId(chain.id),
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls,
    ...(blockExplorerUrls.length > 0 ? { blockExplorerUrls } : {}),
    ...(iconUrls.length > 0 ? { iconUrls } : {}),
  };
}

/**
 * Ready-made EIP-3085 params. `rpcUrls` are empty for mainnet and testnet and
 * no network has `blockExplorerUrls` yet (see above).
 */
export const addEthereumChainParameters = /* @__PURE__ */ deepFreeze({
  konstellation: toAddEthereumChainParameter(konstellation),
  testnet: toAddEthereumChainParameter(testnet),
  localnet: toAddEthereumChainParameter(localnet),
} as const);
