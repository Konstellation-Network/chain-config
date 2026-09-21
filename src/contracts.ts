import { deepFreeze } from "./freeze.ts";
import type { Address, ContractAddresses, PrecompileAddresses, PreinstallAddresses } from "./types.ts";

/**
 * Genesis preinstalls, at their canonical mainnet addresses (ENGINEERING.md
 * §6.3: wallet SDKs and tooling hard-code them). Ten in total: cosmos/evm
 * v0.7.3's five `DefaultPreinstalls` plus the five pinned in
 * `contracts/preinstalls/*.json` and embedded by `konstellation/app/preinstalls`.
 *
 * `test/invariant.test.ts` asserts these against `contracts/preinstalls/*.json`
 * (ENGINEERING.md §5.2). Do not edit by hand without changing `contracts` first.
 */
export const preinstalls: PreinstallAddresses = /* @__PURE__ */ deepFreeze({
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
});

/**
 * Static precompiles active in genesis (`konstellation/app/genesis.go`:
 * cosmos/evm's `AvailableStaticPrecompiles` plus the compliance precompile)
 * and the werc20 native precompile for the base denom
 * (`konstellation/app/config/chain.go` `WKASHPrecompile`).
 */
export const precompiles: PrecompileAddresses = /* @__PURE__ */ deepFreeze({
  p256: "0x0000000000000000000000000000000000000100",
  bech32: "0x0000000000000000000000000000000000000400",
  staking: "0x0000000000000000000000000000000000000800",
  distribution: "0x0000000000000000000000000000000000000801",
  ics20: "0x0000000000000000000000000000000000000802",
  vesting: "0x0000000000000000000000000000000000000803",
  bank: "0x0000000000000000000000000000000000000804",
  gov: "0x0000000000000000000000000000000000000805",
  slashing: "0x0000000000000000000000000000000000000806",
  ics02: "0x0000000000000000000000000000000000000807",
  compliance: "0x0000000000000000000000000000000000000900",
  werc20: "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517",
});

/**
 * `WKASH.sol` at its CREATE2 address: `create2Deployer` + salt
 * `keccak256("konstellation-network/contracts:WKASH:v1")` + the init code
 * compiled with `contracts/foundry.toml`'s settings. Same on every network;
 * has code only once `contracts/script/DeployWKASH.s.sol` has been run there.
 * Pinned by `contracts/test/DeployWKASH.t.sol` (`EXPECTED_WKASH`); checked by
 * `test/invariant.test.ts`.
 */
export const wkash: Address = "0x34Ab8285C63b876717C2c56151700D02623559bE";

/** Every canonical address on Konstellation. The same on all three networks. */
export const contracts: ContractAddresses = /* @__PURE__ */ deepFreeze({ preinstalls, precompiles, wkash });
