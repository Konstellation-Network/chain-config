# @konstellation-network/chain-config

Chain metadata and canonical contract addresses for the Konstellation network,
shaped for [viem](https://viem.sh), [wagmi](https://wagmi.sh) and EIP-3085
`wallet_addEthereumChain`. TypeScript, ESM + CJS, zero runtime dependencies.

> **Not yet published.** Nothing is deployed: no public RPC, no explorer, no
> devnet or testnet. This package is being built ahead of the public networks so
> dapps can integrate against the final chain ids and addresses.
>
> ```sh
> npm install @konstellation-network/chain-config   # not yet published — see below
> ```
>
> `package.json` is `"private": true` until: the npm org `@konstellation-network`
> is claimed (it is **not** ours yet, and `@konstellation` belongs to someone
> else — the org will be created before any repo goes public, STATUS §5a
> P25/P6), a LICENSE is chosen for the org (no repo has one yet, P6), and
> `.github/workflows/publish.yml` — npm trusted publishing with provenance,
> gated on a `v*` tag — is enabled by registering this repo as the package's
> trusted publisher. Until then the install line above does nothing useful.

## What is in it

| Export | Value |
|---|---|
| `konstellation` | mainnet — Cosmos `konstellation-1`, EIP-155 **5667** |
| `devnet` | `devnet-1`, EIP-155 **56672** (`0xdd60`) — **where dapp developers start** |
| `testnet` | `testnet-1`, EIP-155 **56671** — validator/operations rehearsal network |
| `localnet` | the dev chain `konstellation/local_node.sh` starts — `konstellation-local-1`, EIP-155 **56670**, JSON-RPC `http://127.0.0.1:8545` |
| `nativeCurrency` | `{ name: "KASH", symbol: "KASH", decimals: 18 }` |
| `baseDenom`, `bech32Prefix` | `esp` (1 KASH = 10<sup>18</sup> esp), `kons` |
| `contracts` | `{ preinstalls, precompiles, wkash }` — every canonical address, see below |
| `chainContracts` | the same addresses in viem's `ChainContract` shape; what each network's `.contracts` is |
| `networks`, `networksById`, `getNetworkById` | the four networks keyed by export name / literal chain id, and a lookup taking a `number`, a decimal string, or the `0x…` hex string wallets return |
| `addEthereumChainParameters`, `toAddEthereumChainParameter`, `toHexChainId` | EIP-3085 helpers |

Every network object is a valid viem `Chain` **plus** `cosmosChainId`,
`bech32Prefix` and `baseDenom`. The addresses are the same on every
network: preinstalls sit at their canonical mainnet addresses by design
(`ENGINEERING.md §6.3`) and precompiles are fixed by the chain binary.

### Which network to build on

| Network | For | Validators | Stability |
|---|---|---|---|
| `devnet` (`devnet-1`) | **dapp development — start here** | 1, foundation-run | runs the same release as mainnet; faucet-fed; rarely reset |
| `testnet` (`testnet-1`) | validator operators: upgrade drills, chaos tests, admission rehearsals | 4, foundation-run | new releases land here first; may be disrupted |
| `konstellation` (`konstellation-1`) | mainnet, real value | 4 foundation-run at genesis; admission permissioned, opening by governance | — |

Upgrades roll out testnet-1 → devnet-1 (1–2 weeks before mainnet) →
konstellation-1, so code that works on devnet works against the release
mainnet is about to run. The package has no "default network" export — pick
one explicitly; the examples below use `devnet`.

### Addresses

Preinstalls — real bytecode written into `genesis.json`, usable from block 0:

| Key | Address | Origin |
|---|---|---|
| `create2` | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | cosmos/evm default: Arachnid's deterministic-deployment proxy (raw `CREATE2`, calldata `salt ‖ initCode`; what Foundry's `new X{salt}` uses) |
| `multicall3` | `0xcA11bde05977b3631167028862bE2a173976CA11` | cosmos/evm default, also pinned in `contracts` |
| `permit2` | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | cosmos/evm default, also pinned in `contracts` |
| `safeSingletonFactory` | `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7` | cosmos/evm default |
| `historyStorage` | `0x0000F90827F1C53a10cb7A02335B175320002935` | cosmos/evm default (EIP-2935) |
| `entryPointV07` | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | `contracts/preinstalls` (ERC-4337 v0.7) |
| `senderCreatorV07` | `0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C` | `contracts/preinstalls` (required by EntryPoint v0.7) |
| `entryPointV08` | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` | `contracts/preinstalls` (ERC-4337 v0.8) |
| `senderCreatorV08` | `0x449ED7C3e6Fee6a97311d4b55475DF59C44AdD33` | `contracts/preinstalls` (required by EntryPoint v0.8) |
| `create2Deployer` | `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2` | `contracts/preinstalls`: hardhat-deploy / OpenZeppelin Defender `Create2Deployer` (`deploy(value, salt, code)`, `computeAddress`); what `DeployWKASH.s.sol` uses |

`create2` and `create2Deployer` are two different factories with different
calling conventions and address derivations — they are not interchangeable.

Precompiles — native Go code at a fixed address:

| Key | Address | What |
|---|---|---|
| `p256` | `0x…0100` | secp256r1 verification (EIP-7212), passkey wallets |
| `bech32` | `0x…0400` | bech32 <-> hex |
| `staking`, `distribution`, `ics20`, `bank`, `gov`, `slashing`, `ics02` | `0x…0800`, `…0801`, `…0802`, `…0804`, `…0805`, `…0806`, `…0807` | cosmos/evm's static precompiles; `eth_getCode` on them is empty |
| `compliance` | `0x…0900` | Konstellation `ICompliance`: `isVerified(address)`, `isFrozen(address)` (D6) |
| `werc20` | `0xD4949664cD82660AaE99bEdc034a0deA8A0bd517` | cosmos/evm's `werc20` *dynamic* precompile exposing `esp` through the ERC-20 interface; unlike the others it does have bytecode at its address (a ~13 kB placeholder) |

Not included, on purpose: `0x…0803` (`vesting`). cosmos/evm v0.7.3 lists it and
the chain's genesis marks it active, but upstream ships no implementation, so
every `eth_call`/tx to it fails with `precompiled contract not stored in
memory` (STATUS §5a P24). It comes back only once a call succeeds on a node.

Post-genesis deploy — known address, no code until the deploy script has run on
that network:

| Key | Address | What |
|---|---|---|
| `wkash` | `0x34Ab8285C63b876717C2c56151700D02623559bE` | `WKASH.sol`, the wrapped native token, deployed through `create2Deployer` with salt `keccak256("konstellation-network/contracts:WKASH:v1")` — same address on every network; pinned by `contracts/test/DeployWKASH.t.sol` |

`werc20` and `wkash` are different contracts: the precompile is chain-native
and always there; `WKASH` is ordinary Solidity that must be deployed. Do not
use one where the other is meant.

## Usage

### viem

```ts
import { createPublicClient, http } from "viem";
import { devnet } from "@konstellation-network/chain-config";

// No public RPC exists yet — pass your own until rpcUrls is filled in.
const client = createPublicClient({ chain: devnet, transport: http("https://<your-rpc>") });

// Multicall batching works out of the box: chain.contracts.multicall3 is set.
const balance = await client.getBalance({ address: "0x…" });
```

`defineChain(devnet)` also works and keeps the Cosmos fields; it is not needed
because the object already has the right shape.

### wagmi

```ts
import { createConfig, http } from "wagmi";
import { devnet, konstellation } from "@konstellation-network/chain-config";

export const config = createConfig({
  chains: [konstellation, devnet],
  transports: {
    [konstellation.id]: http("https://<your-rpc>"),
    [devnet.id]: http("https://<your-devnet-rpc>"),
  },
});
```

`switchChain({ chainId: devnet.id })` will fail on a wallet that does not
already know the network: wagmi falls back to `wallet_addEthereumChain` with
the chain's own `rpcUrls`, which are empty here, and MetaMask requires at
least one `https://` RPC. Until endpoints are published, pass the parameter
yourself:

```ts
import { switchChain } from "@wagmi/core";
import { devnet, toAddEthereumChainParameter } from "@konstellation-network/chain-config";

await switchChain(config, {
  chainId: devnet.id,
  addEthereumChainParameter: toAddEthereumChainParameter(devnet, { rpcUrls: ["https://<your-devnet-rpc>"] }),
});
```

### Add the network to a wallet (EIP-3085)

```ts
import { addEthereumChainParameters, devnet, toAddEthereumChainParameter } from "@konstellation-network/chain-config";

// rpcUrls is empty for mainnet, devnet and testnet until endpoints are published, and
// MetaMask rejects an empty list — pass the endpoints you know about:
await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [toAddEthereumChainParameter(devnet, { rpcUrls: ["https://<your-rpc>"] })],
});

// localnet is complete as shipped:
addEthereumChainParameters.localnet; // { chainId: "0xdd5e", rpcUrls: ["http://127.0.0.1:8545"], … }
```

`blockExplorerUrls` and `iconUrls` are **omitted** from the params until there
is something to put in them: MetaMask Mobile and the extension up to v12
reject `[]`, while an absent key is accepted (viem omits it too). Passing
`{ blockExplorerUrls: [] }` as an override is also normalised to "absent".

Every URL in `overrides` is checked up front — `https://` or `wss://`, or
`http://` / `ws://` on `localhost` / `127.0.0.1` / `[::1]` only — and a bad
one throws a `TypeError` immediately, with the field name, instead of an
opaque wallet error later.

### Contract addresses

```ts
import { contracts } from "@konstellation-network/chain-config";

contracts.preinstalls.entryPointV07; // "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
contracts.precompiles.compliance;    // "0x0000000000000000000000000000000000000900"
contracts.precompiles.werc20;        // "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517" (precompile)
contracts.wkash;                     // "0x34Ab8285C63b876717C2c56151700D02623559bE" (WKASH.sol, post-genesis)
```

Every exported object is deep-frozen; mutating one throws in strict mode.
The `Address` type is `` `0x${string}` `` — every address shipped here is
EIP-55 checksummed (tested), but the type cannot enforce that on values you
build yourself; validate those with viem's `isAddress(x, { strict: true })`.

### Cosmos side

```ts
import { konstellation } from "@konstellation-network/chain-config";

konstellation.cosmosChainId; // "konstellation-1"
konstellation.bech32Prefix;  // "kons"
konstellation.baseDenom;     // "esp"
```

## The invariant this repo enforces

`ENGINEERING.md §5.2`: **`chain-config` addresses match `contracts` deployments
— enforced by a test in `chain-config`.**

`test/invariant.test.ts` reads the sibling checkouts in the org directory at
test time and asserts:

- every `contracts/preinstalls/*.json` has an entry in `contracts.preinstalls`
  with the same address, and every entry the package claims is pinned there
  still is — so a new or re-pinned preinstall in `contracts` fails this repo's
  tests until the package is updated;
- `contracts.wkash` equals `EXPECTED_WKASH` in `contracts/test/DeployWKASH.t.sol`;
- the `ICompliance` precompile address, the `werc20` precompile address, the
  four EIP-155 ids, the four Cosmos chain-ids, the base denom and the symbol
  match the constants in `konstellation` (`x/compliance/precompile/precompile.go`,
  `app/config/chain.go`);
- the preinstalls `konstellation/app/preinstalls` embeds are the same set.

The parsers strip Go/Solidity comments first, require exactly one definition
of each constant, and take `EXPECTED_WKASH` only from inside
`contract DeployWKASHTest`, so a commented-out old value or a decoy contract
cannot satisfy them.

The paths default to `../contracts` and `../konstellation`; override with
`KONSTELLATION_CONTRACTS_DIR` / `KONSTELLATION_CHAIN_DIR`. A sibling missing
from its default location **skips** its tests with a message (and they count
as skipped in the summary), never passes silently. It is a **failure** when the
env var is set explicitly and points nowhere, when
`KONSTELLATION_REQUIRE_SIBLINGS=1`, or when the sibling is there but the
expected files are not (a moved `preinstalls/` directory is a failure, not a
skip).

**In CI the invariant always runs or the job is red.** Both repos are checked
out sparsely with a read token because they are private
(`.github/workflows/ci.yml`, secret `CONTRACTS_READ_TOKEN`); a failed checkout
fails the job with an explanatory `::error::`. Intended consequences: a PR from
a fork (no secrets) is red until it is re-run from an org branch, and a
missing or expired token is red until a maintainer sets it.

### The published artifact is tested too

`test/dist.test.ts` loads `dist/esm/index.js` and `dist/cjs/index.js` — the
files `package.json#exports` serves — after a build and asserts that every
export deep-equals the `src` export, that both flavours agree, that they are
deep-frozen, and that the functions behave identically. `npm test` builds
first (`pretest`); `prepack` runs it again so a tarball is never produced from
an untested `dist/`.

The other five preinstalls come from cosmos/evm v0.7.3's
`x/vm/types.DefaultPreinstalls` and are not re-checked here; they change only
with a cosmos/evm bump, which `konstellation/app/upstream_pin_test.go` flags.

## Requirements

- Consumers: Node >= 20 (or any bundler); the shipped JavaScript is plain
  ES2022 with no runtime dependencies. TypeScript >= 5.0 — the declaration
  files import `./types.ts` with an explicit extension (viem 2 needs TS 5 too).
- Development: Node >= 22.18 (`npm test` runs the `.ts` sources directly via
  Node's type stripping; `devEngines` warns otherwise).

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit over src and test
npm run build       # dist/esm + dist/cjs + .d.ts (tsc, no bundler)
npm test            # builds, then node:test over src, the §5.2 invariant, and dist/
```

Dev dependencies only: `typescript`, `@types/node`, and `viem` for the
type-compatibility test in `test/viem.test.ts`. There are no runtime dependencies.

## Adding an endpoint or an explorer

When `networks/<net>/chain.json` lists public endpoints and `explorer` is up,
fill `rpcUrls.default.http` / `.webSocket` and `blockExplorers.default` in
`src/networks.ts`. Do not add hostnames that are not live.

## License

Licensed under the [Apache License 2.0](LICENSE). The Konstellation name and logo are trademarks and are not licensed; see the [trademark policy](https://github.com/Konstellation-Network/.github).
