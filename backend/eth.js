import {ethers} from 'ethers';
import config from "./config.js";

const abi = config.contractAbi;
const rpcUrl = config.jsonRpcUrl;
const contractAddress = config.contractAddress;
const mnemonic = config.mnemonic;

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function withdrawEth(to) {
  try {

    const balanceInWei = await provider.getBalance(wallet.address);
    console.log("balanceInWei:", balanceInWei);
    
    const tx = await contract.withdrawEthTo(to, { gasLimit: 32000 });
    await tx.wait();
    console.log(`All gained ETH was withdrawed to ${to}. Tx hash: ${tx.hash}`);
  } catch (error) {
    console.error('Error withdrawing:', error.message);
    throw error;
  }
}

async function withdrawUsd(to) {
  try {
    const tx = await contract.withdrawUsdTo(to, { gasLimit: 41000 });
    await tx.wait();
    console.log(`All gained USD was withdrawed to ${to}. Tx hash: ${tx.hash}`);
  } catch (error) {
    console.error('Error withdrawing:', error.message);
    throw error;
  }
}

async function registrationPrice() {
  try {
    const price = await contract.registrationPriceUsd();
    console.log(`Registration price is ${price} usd`);
    return price;
  } catch (error) {
    console.error('Error getting registration price:', error.message);
    throw error;
  }
}

async function reward() {
  try {
    const value = await contract.domainHolderRewardUsd();
    console.log(`Domain holder reward is ${value} usd`);
    return value;
  } catch (error) {
    console.error('Error getting reward:', error.message);
    throw error;
  }
}

export {
  registrationPrice, 
  reward,
  withdrawEth,
  withdrawUsd
};
