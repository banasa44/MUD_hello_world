/*
 * The MUD client code is built on top of viem
 * (https://viem.sh/docs/getting-started.html).
 * This line imports the functions we need from it.
 */
import {
  createPublicClient,
  fallback,
  webSocket,
  http,
  createWalletClient,
  Hex,
  ClientConfig,
  custom,
  getContract,
  Address,
} from "viem";
import { encodeEntity, syncToRecs } from "@latticexyz/store-sync/recs";

import { getNetworkConfig } from "./getNetworkConfig";
import { world } from "./world";
import IWorldAbi from "contracts/out/IWorld.sol/IWorld.abi.json";
import {
  createBurnerAccount,
  transportObserver,
  ContractWrite,
} from "@latticexyz/common";
import { transactionQueue, writeObserver } from "@latticexyz/common/actions";
import { pad } from "viem";

import { Subject, share } from "rxjs";

/*
 * Import our MUD config, which includes strong types for
 * our tables and other config options. We use this to generate
 * things like RECS components and get back strong types for them.
 *
 * See https://mud.dev/templates/typescript/contracts#mudconfigts
 * for the source of this information.
 */
import mudConfig from "contracts/mud.config";
import { MetaMaskInpageProvider } from "@metamask/providers";

export type SetupNetworkResult = Awaited<ReturnType<typeof setupNetwork>>;

export async function setupNetwork() {
  const networkConfig = await getNetworkConfig();

  /*
   * Create a viem public (read only) client
   * (https://viem.sh/docs/clients/public.html)
   */
  const clientOptions = {
    chain: networkConfig.chain,
    transport: transportObserver(fallback([webSocket(), http()])),
    pollingInterval: 1000,
  } as const satisfies ClientConfig;

  const publicClient = createPublicClient(clientOptions);

  /*
   * Create an observable for contract writes that we can
   * pass into MUD dev tools for transaction observability.
   */
  const write$ = new Subject<ContractWrite>();

  /*
   * Create a temporary wallet and a viem client for it
   * (see https://viem.sh/docs/clients/wallet.html).
   */
  // Wallet Client Initialization
  let walletClient;
  let connectedAddress: Address | undefined;

  if (import.meta.env.VITE_USE_METAMASK === "true") {
    console.log("Using MetaMask for wallet connection");

    if (!window.ethereum) {
      console.error(
        "MetaMask not detected. Ensure it is installed and accessible."
      );
      throw new Error("MetaMask is not installed or not detected.");
    }

    const ethereum = window.ethereum as MetaMaskInpageProvider;

    // Request MetaMask accounts
    const accounts = (await ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in MetaMask.");
    }
    connectedAddress = accounts[0] as Address;
    console.log("Connected MetaMask Address:", connectedAddress);

    // Create a wallet client using MetaMask
    walletClient = createWalletClient({
      chain: networkConfig.chain,
      transport: custom(window.ethereum!),
      account: connectedAddress as Address, // Explicitly cast the account
    })
      .extend(transactionQueue()) // Ensure proper transaction management
      .extend(writeObserver({ onWrite: (write) => write$.next(write) })); // Observe transaction writes
  } else {
    console.log("Using burner wallet for wallet connection");

    // Use the burner private key from networkConfig
    const burnerAccount = createBurnerAccount(networkConfig.privateKey);
    connectedAddress = burnerAccount.address;

    walletClient = createWalletClient({
      ...clientOptions,
      account: burnerAccount,
    })
      .extend(transactionQueue()) // Ensure proper transaction management
      .extend(writeObserver({ onWrite: (write) => write$.next(write) })); // Observe transaction writes
  }
  /*
   * Create an object for communicating with the deployed World.
   */
  const worldContract = getContract({
    address: networkConfig.worldAddress as Hex,
    abi: IWorldAbi,
    client: { public: publicClient, wallet: walletClient },
  });

  /*
   * Sync on-chain state into RECS and keeps our client in sync.
   * Uses the MUD indexer if available, otherwise falls back
   * to the viem publicClient to make RPC calls to fetch MUD
   * events from the chain.
   */
  const { components, latestBlock$, storedBlockLogs$, waitForTransaction } =
    await syncToRecs({
      world,
      config: mudConfig,
      address: networkConfig.worldAddress as Hex,
      publicClient,
      startBlock: BigInt(networkConfig.initialBlockNumber),
      filters: [
        {
          tableId: mudConfig.tables.app__Counter.tableId,
        },
        {
          tableId: mudConfig.tables.app__History.tableId,
          key0: pad("0x01"),
        },
        {
          tableId: mudConfig.tables.app__History.tableId,
          key0: pad("0x05"),
        },
      ],
    });

  return {
    world,
    components,
    playerEntity: encodeEntity(
      { address: "address" },
      { address: connectedAddress }
    ),
    publicClient,
    walletClient,
    latestBlock$,
    storedBlockLogs$,
    waitForTransaction,
    worldContract,
    write$: write$.asObservable().pipe(share()),
  };
}
