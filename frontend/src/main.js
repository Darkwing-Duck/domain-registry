import {
  onClickClaimRewardEth,
  onClickClaimRewardUsd,
  onClickConnect,
  onClickRegisterEth,
  onClickRegisterUsd, onClickResolve
} from './eventHandlers.js'
import { init } from './htmlElements.js'

let elems;

const isMetaMaskInstalled = () => {
  const { ethereum } = window
  return Boolean(ethereum && ethereum.isMetaMask)
}

function assignEventHandlers() {
  elems.connectButton.onclick = async () => {
    await onClickConnect(elems.connectButton, elems.currentAddress, elems.usdPriceField)

    elems.usdRegisterButton.disabled = false
    elems.ethRegisterButton.disabled = false
    elems.usdClaimRewardButton.disabled = false
    elems.ethClaimRewardButton.disabled = false
    elems.resolveButton.disabled = false
  }

  elems.ethRegisterButton.onclick = async () => {
    elems.ethRegisterButton.disabled = true
    elems.ethDomainNameInput.disabled = true
    await onClickRegisterEth(elems.ethDomainNameInput.value)
    elems.ethRegisterButton.disabled = false
    elems.ethDomainNameInput.disabled = false
  }
  
  elems.usdRegisterButton.onclick = async () => {
    elems.usdRegisterButton.disabled = true;
    elems.usdDomainNameInput.disabled = true
    await onClickRegisterUsd(elems.usdDomainNameInput.value)
    elems.usdRegisterButton.disabled = false;
    elems.usdDomainNameInput.disabled = false
  }

  elems.ethClaimRewardButton.onclick = async () => {
    elems.ethClaimRewardButton.disabled = true
    elems.ethRewardDomainNameInput.disabled = true
    await onClickClaimRewardEth(elems.ethRewardDomainNameInput.value)
    elems.ethClaimRewardButton.disabled = false
    elems.ethRewardDomainNameInput.disabled = false
  }

  elems.usdClaimRewardButton.onclick = async () => {
    elems.usdClaimRewardButton.disabled = true
    elems.usdRewardDomainNameInput.disabled = true
    await onClickClaimRewardUsd(elems.usdRewardDomainNameInput.value)
    elems.usdClaimRewardButton.disabled = false
    elems.usdRewardDomainNameInput.disabled = false
  }

  elems.resolveButton.onclick = async () => {
    elems.resolveButton.disabled = true
    elems.resolveDomainNameInput.disabled = true
    await onClickResolve(elems.resolveDomainNameInput.value, elems.domainHolderAddressLabel)
    elems.resolveButton.disabled = false
    elems.resolveDomainNameInput.disabled = false
  }
  
  // elems.fetchTokenDataButton.onclick = async () => {
  //   await onClickFetchTokenData(elems.tokenContractAddressInput.value, elems.totalSupply)
  //   enableButtonsGroup2()
  // }
  // elems.balanceOfButton.onclick = async () => {
  //   await onClickBalanceOfTokens(elems.balanceOf, elems.balanceOfInput.value)
  // }
  // elems.transferButton.onclick = async () => {
  //   await onClickTransfer(elems.transferToInput.value, elems.transferAmountInput.value)
  // }
}

const enableButtonsGroup2 = () => {
  elems.balanceOfButton.disabled = false
  elems.transferButton.disabled = false
}

const initialize = () => {
  if (!isMetaMaskInstalled()) {
    connectButton.innerText = 'Install MetaMask!'
    return
  }

  elems = init()
  assignEventHandlers()

  elems.connectButton.disabled = false
}

window.addEventListener('DOMContentLoaded', initialize)
