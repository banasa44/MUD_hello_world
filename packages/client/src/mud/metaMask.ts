import { MetaMaskInpageProvider } from "@metamask/providers";

export function getEthereum(): MetaMaskInpageProvider {
  const ethereum = window.ethereum as MetaMaskInpageProvider | undefined;
  if (!ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return ethereum;
}

export async function requestAccounts(): Promise<string[]> {
  const ethereum = getEthereum();
  return ethereum.request({ method: "eth_requestAccounts" });
}
