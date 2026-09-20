/**
 * Proves the network objects are accepted by viem's `defineChain` and the
 * `Chain` type without changes. viem is a devDependency only; the package has
 * no runtime dependencies.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPublicClient, defineChain, http, type Chain } from "viem";

import { konstellation, localnet, testnet, type KonstellationChain } from "../src/index.ts";

describe("viem compatibility", () => {
  it("every network is assignable to viem's Chain type as-is", () => {
    const chains: readonly Chain[] = [konstellation, testnet, localnet];
    assert.equal(chains.length, 3);
    // and back: viem's Chain shape does not lose the Cosmos fields at runtime
    const roundTrip: readonly KonstellationChain[] = [konstellation, testnet, localnet];
    assert.equal(roundTrip[0]?.cosmosChainId, "konstellation-1");
  });

  it("defineChain accepts every network and keeps the Cosmos fields", () => {
    for (const network of [konstellation, testnet, localnet]) {
      const chain = defineChain(network);
      assert.equal(chain.id, network.id);
      assert.equal(chain.cosmosChainId, network.cosmosChainId);
      assert.equal(chain.bech32Prefix, "kons");
      assert.equal(chain.baseDenom, "esp");
      assert.equal(chain.contracts.multicall3.address, "0xcA11bde05977b3631167028862bE2a173976CA11");
      assert.equal(chain.contracts.compliance.address, "0x0000000000000000000000000000000000000900");
    }
  });

  it("createPublicClient takes the localnet object (no network call is made)", () => {
    const client = createPublicClient({ chain: localnet, transport: http() });
    assert.equal(client.chain.id, 56670);
  });
});
