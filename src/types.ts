/**
 * A 0x-prefixed 20-byte hex address. Every address this package ships is
 * EIP-55 checksummed (tested), but the type itself cannot enforce that —
 * run `getAddress`/`isAddress(x, { strict: true })` from viem if you need to
 * validate one you did not get from here.
 */
export type Address = `0x${string}`;

/**
 * The subset of viem's `Chain` type that this package fills in, declared
 * locally so the package has no runtime or type dependency on viem. Every
 * network object `satisfies` this and is accepted by viem's `defineChain`
 * and wagmi's `createConfig({ chains })` unchanged (checked against the real
 * viem types in `test/viem.test.ts`).
 */
export interface EvmChain {
  /** EIP-155 chain id. */
  readonly id: number;
  /** Display name. */
  readonly name: string;
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly rpcUrls: {
    readonly default: {
      readonly http: readonly string[];
      readonly webSocket?: readonly string[];
    };
  };
  readonly blockExplorers?: {
    readonly default: {
      readonly name: string;
      readonly url: string;
      readonly apiUrl?: string;
    };
  };
  readonly contracts?: {
    readonly [name: string]: ChainContract | undefined;
    readonly multicall3: ChainContract;
  };
  readonly testnet?: boolean;
}

/** viem's `ChainContract`: an address and, optionally, the block it became available at. */
export interface ChainContract {
  readonly address: Address;
  /** `0` for everything in this package: preinstalls and precompiles exist from genesis. */
  readonly blockCreated?: number;
}

/**
 * Preinstalls: real bytecode written into `genesis.json` at canonical mainnet
 * addresses. Source of truth: `contracts/preinstalls/*.json` (the five pinned
 * there) and cosmos/evm's `x/vm/types.DefaultPreinstalls` (the other five).
 */
export interface PreinstallAddresses {
  /**
   * Arachnid's deterministic-deployment proxy: raw `CREATE2`, calldata =
   * `salt ‖ initCode`, used by Foundry's default `new X{salt: …}()` path and
   * many tooling defaults. NOT interchangeable with `create2Deployer` below,
   * which has a Solidity ABI (`deploy(value, salt, code)`) and a different
   * address-derivation input. cosmos/evm default.
   */
  readonly create2: Address;
  /** Multicall3. cosmos/evm default; also pinned in `contracts`. */
  readonly multicall3: Address;
  /** Uniswap Permit2. cosmos/evm default; also pinned in `contracts`. */
  readonly permit2: Address;
  /** Safe singleton factory. cosmos/evm default. */
  readonly safeSingletonFactory: Address;
  /** EIP-2935 history storage (historical block hashes served from state). cosmos/evm default. */
  readonly historyStorage: Address;
  /** ERC-4337 EntryPoint v0.7. Pinned in `contracts`. */
  readonly entryPointV07: Address;
  /** SenderCreator that EntryPoint v0.7's bytecode hard-references. Pinned in `contracts`. */
  readonly senderCreatorV07: Address;
  /** ERC-4337 EntryPoint v0.8. Pinned in `contracts`. */
  readonly entryPointV08: Address;
  /** SenderCreator that EntryPoint v0.8's bytecode hard-references. Pinned in `contracts`. */
  readonly senderCreatorV08: Address;
  /**
   * hardhat-deploy / OpenZeppelin Defender `Create2Deployer`
   * (`deploy(uint256 value, bytes32 salt, bytes code)`, `computeAddress`).
   * The one `contracts/script/DeployWKASH.s.sol` uses. Not interchangeable
   * with `create2` above. Pinned in `contracts`.
   */
  readonly create2Deployer: Address;
}

/**
 * Precompiles: native Go code the EVM exposes at a fixed address.
 * `0x100`–`0x807` are cosmos/evm's static precompiles
 * (`x/vm/types/precompiles.go`) — `eth_getCode` on them returns nothing;
 * `0x900` opens Konstellation's own range
 * (`konstellation/x/compliance/precompile`). `werc20` is different: a
 * *dynamic* precompile that also carries ~13 kB of placeholder bytecode so
 * tooling sees a contract there.
 *
 * cosmos/evm v0.7.3 also lists a `vesting` precompile at `0x…0803` and the
 * chain's genesis marks it active, but upstream ships no implementation:
 * any call to it fails with "precompiled contract not stored in memory". It
 * is deliberately NOT in this map (STATUS.md §5a P24).
 */
export interface PrecompileAddresses {
  /** secp256r1 signature verification (EIP-7212 / RIP-7212), for passkey wallets. */
  readonly p256: Address;
  /** Bech32 <-> hex address conversion. */
  readonly bech32: Address;
  readonly staking: Address;
  readonly distribution: Address;
  /** IBC ICS-20 transfers. */
  readonly ics20: Address;
  readonly bank: Address;
  readonly gov: Address;
  readonly slashing: Address;
  /** IBC ICS-02 client queries. */
  readonly ics02: Address;
  /** Konstellation `ICompliance` (D6): read-only `isVerified(address)` / `isFrozen(address)`. */
  readonly compliance: Address;
  /**
   * cosmos/evm's `werc20` native precompile: exposes the base denom (`esp`) to
   * Solidity through the ERC-20 interface, registered as the native token pair
   * in the erc20 module's genesis. Unlike the static precompiles it has
   * bytecode at its address (a placeholder the erc20 module writes). This is
   * NOT the `WKASH` wrapper contract — see `ContractAddresses.wkash`.
   */
  readonly werc20: Address;
}

export interface ContractAddresses {
  readonly preinstalls: PreinstallAddresses;
  readonly precompiles: PrecompileAddresses;
  /**
   * `WKASH.sol`, the wrapped native token (`contracts/src/WKASH.sol`). A
   * post-genesis deploy, not a preinstall: `contracts/script/DeployWKASH.s.sol`
   * deploys it through the preinstalled `create2Deployer` with a fixed salt,
   * so the address is the same on every network and known before deployment.
   * Pinned by `contracts/test/DeployWKASH.t.sol`; checked here by
   * `test/invariant.test.ts`. Until the deploy transaction lands on a
   * network there is no code at this address on it.
   */
  readonly wkash: Address;
}

/** EIP-3085 `wallet_addEthereumChain` request parameter. */
export interface AddEthereumChainParameter {
  /** Hex-encoded EIP-155 chain id, e.g. `"0x1623"`. */
  readonly chainId: `0x${string}`;
  readonly chainName: string;
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly rpcUrls: readonly string[];
  /**
   * Present only when non-empty: MetaMask (Mobile, and the extension up to
   * v12) rejects an empty array, while an absent key is accepted.
   */
  readonly blockExplorerUrls?: readonly string[];
  /** Present only when non-empty, for the same reason. */
  readonly iconUrls?: readonly string[];
}

/** Key of any canonical address: a preinstall, a precompile, or `wkash`. The sets never overlap. */
export type ContractName = keyof PreinstallAddresses | keyof PrecompileAddresses | "wkash";

/** One Konstellation network: an `EvmChain` plus the Cosmos-side identity. */
export interface KonstellationChain extends EvmChain {
  /** Cosmos SDK chain-id string (`genesis.json` `chain_id`). */
  readonly cosmosChainId: string;
  /** Bech32 human-readable part for Cosmos-encoded addresses. */
  readonly bech32Prefix: string;
  /** On-chain base unit of the native token; 1 KASH = 10^18 esp. */
  readonly baseDenom: string;
  /**
   * Every canonical address, keyed as in `contracts.preinstalls` /
   * `contracts.precompiles` plus `wkash`, in viem's `ChainContract` shape so
   * the whole object is a valid viem `Chain`. Identical on every network.
   * Preinstalls and precompiles carry `blockCreated: 0`; `wkash` has no
   * `blockCreated` because it is deployed after genesis.
   */
  readonly contracts: { readonly [K in ContractName]: ChainContract } & {
    readonly multicall3: ChainContract & { readonly blockCreated: number };
  };
}
