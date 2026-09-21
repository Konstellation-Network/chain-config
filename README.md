# @konstellation-network/chain-config

Chain metadata and canonical contract addresses for the Konstellation network,
shaped for [viem](https://viem.sh), [wagmi](https://wagmi.sh) and EIP-3085
`wallet_addEthereumChain`. TypeScript, ESM + CJS, zero runtime dependencies.

> **Not yet published.** Nothing is deployed: no public RPC, no explorer, no
> testnet. This package is being built ahead of testnet-1 so dapps can integrate
> against the final chain ids and addresses. `package.json` is `"private": true`
> until the first release is cut; the `@konstellation-network` npm scope is a
> placeholder that has to be claimed first.

## What is in it

| Export | Value |
|---|---|
| `konstellation` | mainnet — Cosmos `konstellation-1`, EIP-155 **5667** |
| `testnet` | `testnet-1`, EIP-155 **56671** |
| `localnet` | the dev chain `konstellation/local_node.sh` starts — `konstellation-local-1`, EIP-155 **56670**, JSON-RPC `http://127.0.0.1:8545` |
| `nativeCurrency` | `{ name: "Konstellation", symbol: "KASH", decimals: 18 }` |
| `baseDenom`, `bech32Prefix` | `esp` (1 KASH = 10<sup>18</sup> esp), `kons` |
| `contracts` | `{ preinstalls, precompiles, wkash }` — every canonical address, see below |
| `chainContracts` | the same addresses in viem's `ChainContract` shape; what each network's `.contracts` is |
| `networks`, `networksById`, `getNetworkById` | the three networks keyed by export name / literal chain id, and a lookup for any `number` |
| `addEthereumChainParameters`, `toAddEthereumChainParameter`, `toHexChainId` | EIP-3085 helpers |

Every network object is a valid viem `Chain` **plus** `cosmosChainId`,
`bech32Prefix` and `baseDenom`. The addresses are the same on all three
networks: preinstalls sit at their canonical mainnet addresses by design
(`ENGINEERING.md §6.3`) and precompiles are fixed by the chain binary.

### Addresses

Preinstalls — real bytecode written into `genesis.json`, usable from block 0:

| Key | Address | Origin |
|---|---|---|
| `create2` | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | cosmos/evm default (deterministic-deployment proxy) |
| `multicall3` | `0xcA11bde05977b3631167028862bE2a173976CA11` | cosmos/evm default, also pinned in `contracts` |
| `permit2` | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | cosmos/evm default, also pinned in `contracts` |
| `safeSingletonFactory` | `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7` | cosmos/evm default |
| `historyStorage` | `0x0000F90827F1C53a10cb7A02335B175320002935` | cosmos/evm default (EIP-2935) |
| `entryPointV07` | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | `contracts/preinstalls` (ERC-4337 v0.7) |
| `senderCreatorV07` | `0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C` | `contracts/preinstalls` (required by EntryPoint v0.7) |
| `entryPointV08` | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` | `contracts/preinstalls` (ERC-4337 v0.8) |
| `senderCreatorV08` | `0x449ED7C3e6Fee6a97311d4b55475DF59C44AdD33` | `contracts/preinstalls` (required by EntryPoint v0.8) |
| `create2Deployer` | `0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2` | `contracts/preinstalls` (hardhat-deploy / Defender) |

Precompiles — native code at a fixed address, no bytecode:

| Key | Address | What |
|---|---|---|
| `p256` | `0x…0100` | secp256r1 verification (EIP-7212), passkey wallets |
| `bech32` | `0x…0400` | bech32 <-> hex |
| `staking` … `ics02` | `0x…0800` – `0x…0807` | cosmos/evm's staking, distribution, ics20, vesting, bank, gov, slashing, ics02 |
| `compliance` | `0x…0900` | Konstellation `ICompliance`: `isVerified(address)`, `isFrozen(address)` (D6) |
| `werc20` | `0xD4949664cD82660AaE99bEdc034a0deA8A0bd517` | cosmos/evm's `werc20` native precompile exposing `esp` through the ERC-20 interface |

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
import { testnet } from "@konstellation-network/chain-config";

// No public RPC exists yet — pass your own until rpcUrls is filled in.
const client = createPublicClient({ chain: testnet, transport: http("https://<your-rpc>") });

// Multicall batching works out of the box: chain.contracts.multicall3 is set.
const balance = await client.getBalance({ address: "0x…" });
```

`defineChain(testnet)` also works and keeps the Cosmos fields; it is not needed
because the object already has the right shape.

### wagmi

```ts
import { createConfig, http } from "wagmi";
import { konstellation, testnet } from "@konstellation-network/chain-config";

export const config = createConfig({
  chains: [konstellation, testnet],
  transports: {
    [konstellation.id]: http("https://<your-rpc>"),
    [testnet.id]: http("https://<your-testnet-rpc>"),
  },
});
```

### Add the network to a wallet (EIP-3085)

```ts
import { addEthereumChainParameters, toAddEthereumChainParameter, testnet } from "@konstellation-network/chain-config";

// rpcUrls is empty for mainnet and testnet until endpoints are published, and
// MetaMask rejects an empty list — pass the endpoints you know about:
await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [toAddEthereumChainParameter(testnet, { rpcUrls: ["https://<your-rpc>"] })],
});

// localnet is complete as shipped:
addEthereumChainParameters.localnet; // { chainId: "0xdd5e", rpcUrls: ["http://127.0.0.1:8545"], … }
```

`blockExplorerUrls` and `iconUrls` are **omitted** from the params until there
is something to put in them: MetaMask Mobile and the extension up to v12
reject `[]`, while an absent key is accepted (viem omits it too). Passing
`{ blockExplorerUrls: [] }` as an override is also normalised to "absent".

### Contract addresses

```ts
import { contracts } from "@konstellation-network/chain-config";

contracts.preinstalls.entryPointV07; // "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
contracts.precompiles.compliance;    // "0x0000000000000000000000000000000000000900"
contracts.precompiles.werc20;        // "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517" (precompile)
contracts.wkash;                     // "0x34Ab8285C63b876717C2c56151700D02623559bE" (WKASH.sol, post-genesis)
```

Every exported object is deep-frozen; mutating one throws in strict mode.

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
  three EIP-155 ids, the three Cosmos chain-ids, the base denom and the symbol
  match the constants in `konstellation` (`x/compliance/precompile/precompile.go`,
  `app/config/chain.go`);
- the preinstalls `konstellation/app/preinstalls` embeds are the same set.

The paths default to `../contracts` and `../konstellation`; override with
`KONSTELLATION_CONTRACTS_DIR` / `KONSTELLATION_CHAIN_DIR`. A sibling missing
from its default location **skips** its tests with a message (and they count
as skipped in the summary), never passes silently. It is a **failure** when the
env var is set explicitly and points nowhere, when
`KONSTELLATION_REQUIRE_SIBLINGS=1`, or when the sibling is there but the
expected files are not (a moved `preinstalls/` directory is a failure, not a
skip). In CI both repos are checked out sparsely with a read token because
they are private (see `.github/workflows/ci.yml`); the env vars are set only
for a checkout that succeeded, and the workflow warns for each that did not.

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
npm test            # node:test
```

Dev dependencies only: `typescript`, `@types/node`, and `viem` for the
type-compatibility test in `test/viem.test.ts`. There are no runtime dependencies.

## Adding an endpoint or an explorer

When `networks/<net>/chain.json` lists public endpoints and `explorer` is up,
fill `rpcUrls.default.http` / `.webSocket` and `blockExplorers.default` in
`src/networks.ts`. Do not add hostnames that are not live.
