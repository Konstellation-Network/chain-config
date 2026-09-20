/** A 0x-prefixed, EIP-55 checksummed, 20-byte hex address. */
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
  /** Deterministic-deployment proxy (Arachnid's `CREATE2` factory). cosmos/evm default. */
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
  /** hardhat-deploy / OpenZeppelin Defender `Create2Deployer`. Pinned in `contracts`. */
  readonly create2Deployer: Address;
}

/**
 * Precompiles: native code the EVM exposes at a fixed address; there is no
 * bytecode at these addresses. `0x100`–`0x807` are cosmos/evm's static
 * precompiles (`x/vm/types/precompiles.go`); `0x900` opens Konstellation's
 * own range (`konstellation/x/compliance/precompile`).
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
  /** x/auth vesting. Note: Konstellation vests through Solidity contracts (D12), not this. */
  readonly vesting: Address;
  readonly bank: Address;
  readonly gov: Address;
  readonly slashing: Address;
  /** IBC ICS-02 client queries. */
  readonly ics02: Address;
  /** Konstellation `ICompliance` (D6): read-only `isVerified(address)` / `isFrozen(address)`. */
  readonly compliance: Address;
  /**
   * The `werc20` native precompile that exposes the base denom (`esp`) to
   * Solidity as an ERC-20. Registered as the native token pair in the erc20
   * module's genesis. Distinct from the `WKASH` Solidity wrapper, which is a
   * post-genesis deploy and not in this package until it has an address.
   */
  readonly wkash: Address;
}

export interface ContractAddresses {
  readonly preinstalls: PreinstallAddresses;
  readonly precompiles: PrecompileAddresses;
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
  readonly blockExplorerUrls?: readonly string[];
  readonly iconUrls?: readonly string[];
}

/** Key of any canonical address: a preinstall or a precompile. The two sets never overlap. */
export type ContractName = keyof PreinstallAddresses | keyof PrecompileAddresses;

/** One Konstellation network: an `EvmChain` plus the Cosmos-side identity. */
export interface KonstellationChain extends EvmChain {
  /** Cosmos SDK chain-id string (`genesis.json` `chain_id`). */
  readonly cosmosChainId: string;
  /** Bech32 human-readable part for Cosmos-encoded addresses. */
  readonly bech32Prefix: string;
  /** On-chain base unit of the native token; 1 KASH = 10^18 esp. */
  readonly baseDenom: string;
  /**
   * Every preinstall and precompile, keyed as in `contracts.preinstalls` /
   * `contracts.precompiles`, in viem's `ChainContract` shape so the whole
   * object is a valid viem `Chain`. Identical on every network.
   */
  readonly contracts: { readonly [K in ContractName]: ChainContract } & {
    readonly multicall3: ChainContract & { readonly blockCreated: number };
  };
}
