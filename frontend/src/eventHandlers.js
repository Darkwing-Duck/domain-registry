import * as domainRegistry from './domainRegistry.js'
import {registrationPriceEth, registrationPriceUsd} from './domainRegistry.js'

export async function onClickConnect (button, currentAddr, usdPriceField) {
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
    
  } catch (error) {
    console.error(error)
  }
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

export async function onClickClaimRewardEth(domainName) {
  try {
    await domainRegistry.claimEthRewardFor(domainName)
  } catch (error) {
    console.error(error)
  }
}

export async function onClickClaimRewardUsd(domainName) {
  try {
    await domainRegistry.claimUsdRewardFor(domainName)
  } catch (error) {
    console.error(error)
  }
}

export async function onClickResolve(domainName, domainHolderAddressLabel) {
  domainHolderAddressLabel.innerText = await domainRegistry.findDomainHolderBy(domainName)
}

// export async function onClickFetchTokenData (tokenContractAddress, totalSupply) {
//   if (!tokenContractAddress) {
//     return
//   }
//   tokenContract.bind(tokenContractAddress)
//   totalSupply.innerHTML = await tokenContract.totalSupply()
// }

// export async function onClickBalanceOfTokens (balanceOfElem, address) {
//   balanceOfElem.innerHTML = `Balance of ${address} is ${await tokenContract.balanceOf(address)}`
// }
//
// export async function onClickTransfer (to, amount) {
//   await tokenContract.transfer(to, amount)
// }
