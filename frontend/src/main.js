import {
  onClickCheckReward,
  onClickClaimRewardEth,
  onClickClaimRewardUsd,
  onClickConnect,
  onClickRegisterEth,
  onClickRegisterUsd,
  onClickResolve
} from './eventHandlers.js'
import {init} from './htmlElements.js'

let elems;

const isMetaMaskInstalled = () => {
  const { ethereum } = window
  return Boolean(ethereum && ethereum.isMetaMask)
}

function assignEventHandlers() {
  elems.connectButton.onclick = async () => {
    await onClickConnect(
        elems.connectButton, 
        elems.currentAddress,
        elems.usdPriceField,
        elems.ethPriceField,
        elems.claimEthRewardButton,
        elems.claimUsdRewardButton)

    elems.usdRegisterButton.disabled = false
    elems.ethRegisterButton.disabled = false
    elems.resolveButton.disabled = false
    elems.checkRewardButton.disabled = false
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

  elems.claimEthRewardButton.onclick = async () => {
    await onClickClaimRewardEth(elems.claimEthRewardButton)
  }

  elems.claimUsdRewardButton.onclick = async () => {
    await onClickClaimRewardUsd(elems.claimUsdRewardButton)
  }

  elems.resolveButton.onclick = async () => {
    elems.resolveButton.disabled = true
    elems.resolveDomainNameInput.disabled = true
    await onClickResolve(elems.resolveDomainNameInput.value, elems.domainHolderAddressLabel)
    elems.resolveButton.disabled = false
    elems.resolveDomainNameInput.disabled = false
  }

  elems.checkRewardButton.onclick = async () => {
    elems.checkRewardButton.disabled = true
    elems.rewardDomainHolderAddressInput.disabled = true
    await onClickCheckReward(elems.rewardDomainHolderAddressInput.value, elems.holderEthRewardLabel, elems.holderUsdRewardLabel)
    elems.checkRewardButton.disabled = false
    elems.rewardDomainHolderAddressInput.disabled = false
  }
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
