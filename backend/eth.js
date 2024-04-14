import { ethers } from 'ethers';
import config from "./config.js";

const abi = config.contractAbi;
const rpcUrl = config.jsonRpcUrl;
const contractAddress = config.contractAddress;
const mnemonic = config.mnemonic;

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function mint(to, amount) {
  try {
    const tx = await contract.mint(to, amount, /*{ gasLimit: 100 }*/);
    await tx.wait();
    console.log(`Minted ${amount} tokens. Tx hash: ${tx.hash}`);
  } catch (error) {
    console.error('Error minting:', error.message);
    throw error;
  }
}

async function balanceOf(address) {
  try {
    const balance = await contract.balanceOf(address);
    console.log(`Balance of ${address}: ${balance}`);
    return balance;
  } catch (error) {
    console.error('Error getting balance:', error.message);
    throw error;
  }
}

export { mint, balanceOf };
