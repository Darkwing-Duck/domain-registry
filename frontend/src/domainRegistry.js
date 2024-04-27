import {ethers} from 'ethers'
import contractArtifact
  from "../../hardhat/artifacts/contracts/DomainRegistryV2.sol/DomainRegistryV2.json" assert {type: "json"}
import erc20TokenArtifact
  from "../../hardhat/artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json" assert {type: "json"}

const provider = new ethers.BrowserProvider(window.ethereum)
const DOMAIN_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

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

export const getEthRewardBalanceFor = async (domainName) => {
  const balance = await contract.getDomainRewardBalanceEth(domainName)
  console.log(`The eth reward balance for domain name '${domainName}' is ${balance} wei`)
  return balance
}

export const getUsdRewardBalanceFor = async (domainName) => {
  const balance = await contract.getDomainRewardBalanceUsd(domainName)
  console.log(`The eth reward balance for domain name '${domainName}' is ${balance} usd`)
  return balance
}

export const claimEthRewardFor = async (domainName) => {
  try {
    const signer = await provider.getSigner()
    const availableReward = await getEthRewardBalanceFor(domainName)
    const tx = await contract.connect(signer).withdrawEthRewardFor(domainName)
    await tx.wait()
    console.log(`Reward gained by domain name ${domainName} was successfully claimed by holder ${signer.address} with ${availableReward} wei.`)
    console.log(`Tx hash: ${tx.hash}`)
  } catch (error) {
    console.error('Error domain name registering:', error.message)
  }
}

export const claimUsdRewardFor = async (domainName) => {
  try {
    const signer = await provider.getSigner()
    const availableReward = await getUsdRewardBalanceFor(domainName)
    const tx = await contract.connect(signer).withdrawUsdRewardFor(domainName)
    await tx.wait()
    console.log(`Reward gained by domain name ${domainName} was successfully claimed by holder ${signer.address} with ${availableReward} usd.`)
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
