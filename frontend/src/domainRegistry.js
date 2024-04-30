import {ethers} from 'ethers'
import contractArtifact
  from "../../hardhat/artifacts/contracts/DomainRegistryV2.sol/DomainRegistryV2.json" assert {type: "json"}
import erc20TokenArtifact
  from "../../hardhat/artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json" assert {type: "json"}

const provider = new ethers.BrowserProvider(window.ethereum)
const DOMAIN_REGISTRY_ADDRESS = "0x68bF90951656cDcDe091abDC940bbBaf8b5a98B3";

const contract = new ethers.Contract(
    DOMAIN_REGISTRY_ADDRESS,
    contractArtifact.abi,
    provider
)

let tokenContract;

export const initializeUsdTokenContract = async () => {
  tokenContract = new ethers.Contract(
      await contract.usdTokenAddress(),
      erc20TokenArtifact.abi,
      provider
  )
}

export const registrationPriceUsd = async () => {
  return await contract.registrationPriceUsd()
}

export const registrationPriceEth = async () => {
  const usdPrice = await contract.registrationPriceUsd()
  const weiValue = await contract.usd2Eth(usdPrice)
  return Number(ethers.formatEther(weiValue)).toFixed(5)
}

export const registerWithEth = async (domainName) => {
  try {
    const signer = await provider.getSigner()
    const usdPrice = await contract.registrationPriceUsd()
    const weiValue = await contract.usd2Eth(usdPrice)
    const options = {value: weiValue};

    const tx = await contract.connect(signer).registerDomain(domainName, options)
    await tx.wait()
    console.log(`Domain name ${domainName} was registered by ${signer.address} for ${weiValue} wei. Tx hash: ${tx.hash}`)
  } catch (error) {
    console.error('Error domain name registering:', error.message)
  }
}

export const registerWithUsd = async (domainName) => {
  try {
    const signer = await provider.getSigner()
    const tokenDecimals = await tokenContract.decimals()
    const usdPrice = await contract.registrationPriceUsd()
    const usdPriceWithDecimals = usdPrice * 10n ** tokenDecimals

    await tokenContract.connect(signer).approve(DOMAIN_REGISTRY_ADDRESS, usdPriceWithDecimals)

    const tx = await contract.connect(signer).registerDomainWithUsd(domainName)
    await tx.wait()
    console.log(`Domain name ${domainName} was registered by ${signer.address} for ${usdPrice} usd. Tx hash: ${tx.hash}`)
  } catch (error) {
    console.error('Error domain name registering:', error.message)
  }
}

export const getEthRewardBalanceFor = async (domainHolder) => {
  const balance = await contract.getDomainHolderRewardBalanceEth(domainHolder)
  console.log(`The eth reward balance for domain name '${domainHolder}' is ${balance} wei`)
  return balance
}

export const getUsdRewardBalanceFor = async (domainHolder) => {
  const balance = await contract.getDomainHolderRewardBalanceUsd(domainHolder)
  console.log(`The eth reward balance for domain holder '${domainHolder}' is ${balance} usd`)
  return balance
}

export const claimEthReward = async () => {
  try {
    const signer = await provider.getSigner()
    const availableReward = await getEthRewardBalanceFor(signer.address)
    const tx = await contract.connect(signer).withdrawEthReward()
    await tx.wait()
    console.log(`Reward gained by domain holder ${signer.address} was successfully claimed with ${availableReward} wei.`)
    console.log(`Tx hash: ${tx.hash}`)
  } catch (error) {
    console.error('Error domain name registering:', error.message)
  }
}

export const claimUsdReward = async () => {
  try {
    const signer = await provider.getSigner()
    const availableReward = await getUsdRewardBalanceFor(signer.address)
    const tx = await contract.connect(signer).withdrawUsdReward()
    await tx.wait()
    console.log(`Reward gained by domain holder ${signer.address} was successfully with ${availableReward} usd.`)
    console.log(`Tx hash: ${tx.hash}`)
  } catch (error) {
    console.error('Error domain name registering:', error.message)
  }
}

export const findDomainHolderBy = async (domainName) => {
  const holderAddress = await contract.findDomainHolderBy(domainName)
  console.log(`Domain holder's address for domain '${domainName}' is ${holderAddress}`)
  return holderAddress;
}

export const getDomainHolderRewardBalanceEth = async (domainHolder) => {
  const balance = await contract.getDomainHolderRewardBalanceEth(domainHolder)
  console.log(`Domain holder's address has '${balance}' eth of reward`)
  return balance;
}

export const getDomainHolderRewardBalanceUsd = async (domainHolder) => {
  const balance = await contract.getDomainHolderRewardBalanceUsd(domainHolder)
  console.log(`Domain holder's address has '${balance}' usd of reward`)
  return balance;
}

export const getDomainRegisteredLogsFor = async (domainHolderAddress) => {
  let filter = contract.filters.DomainRegistered(null, domainHolderAddress);
  let logs = await contract.queryFilter(filter);
  return sortLogsByDate(logs)
}

function sortLogsByDate(logs) {
  return logs.sort((a, b) => Number(b.args.createdDate - a.args.createdDate));
}

