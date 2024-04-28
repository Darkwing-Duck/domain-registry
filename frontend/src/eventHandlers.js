import * as domainRegistry from './domainRegistry.js'
import {registrationPriceEth, registrationPriceUsd} from './domainRegistry.js'
import {ethers} from "ethers";

export async function onClickConnect (button, currentAddr, usdPriceField, ethPriceField, claimEthRewardButton, claimUsdRewardButton) {
  try {
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    })
    button.innerHTML = "Connected"
    currentAddr.innerHTML = accounts[0]
    
    // init usd price
    const usdPrice = await registrationPriceUsd();
    usdPriceField.innerHTML = `${usdPrice} $`;

    // init eth price
    const ethPrice = await registrationPriceEth();
    ethPriceField.innerHTML = `${ethPrice} eth`;

    await domainRegistry.initializeUsdTokenContract()

    // init reward
    const rewardEth = await domainRegistry.getDomainHolderRewardBalanceEth(accounts[0])
    const rewardUsd = await domainRegistry.getDomainHolderRewardBalanceUsd(accounts[0])
    
    const readableEthReward = formatWei(rewardEth)

    claimEthRewardButton.innerText = `Claim Reward (${readableEthReward} Eth)`;
    claimUsdRewardButton.innerText = `Claim Reward (${rewardUsd} Usd)`;

    claimEthRewardButton.disabled = rewardEth <= 0n
    claimUsdRewardButton.disabled = rewardUsd <= 0n
    
  } catch (error) {
    console.error(error)
  }
}

function formatWei(weiValue) {
  return Number(ethers.formatEther(weiValue)).toFixed(5)
}

export async function onClickRegisterEth(domainName) {
  try {
    await domainRegistry.registerWithEth(domainName)
  } catch (error) {
    console.error(error)
  }
}

export async function onClickRegisterUsd(domainName) {
  try {
    await domainRegistry.registerWithUsd(domainName)
  } catch (error) {
    console.error(error)
  }
}

export async function onClickClaimRewardEth(claimEthRewardButton) {
  try {
    claimEthRewardButton.disabled = true
    await domainRegistry.claimEthReward()
    claimEthRewardButton.innerText = `Claim Reward (0 Eth)`;
  } catch (error) {
    console.error(error)
    claimEthRewardButton.disabled = false
  }
}

export async function onClickClaimRewardUsd(claimUsdRewardButton) {
  try {
    claimUsdRewardButton.disabled = true
    await domainRegistry.claimUsdReward()
    claimUsdRewardButton.innerText = `Claim Reward (0 Usd)`;
  } catch (error) {
    console.error(error)
    claimUsdRewardButton.disabled = false
  }
}

export async function onClickResolve(domainName, domainHolderAddressLabel) {
  domainHolderAddressLabel.innerText = await domainRegistry.findDomainHolderBy(domainName)
}

export async function onClickCheckReward(domainHolderAddress, holderEthRewardLabel, holderUsdRewardLabel) {
  const ethReward = await domainRegistry.getDomainHolderRewardBalanceEth(domainHolderAddress)
  const usdReward = await domainRegistry.getDomainHolderRewardBalanceUsd(domainHolderAddress)
  holderEthRewardLabel.innerText = formatWei(ethReward)
  holderUsdRewardLabel.innerText = usdReward
}
