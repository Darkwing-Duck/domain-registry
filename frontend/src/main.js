import { onClickConnect, onClickFetchTokenData, onClickBalanceOfTokens, onClickTransfer } from './eventHandlers.js'
import { init } from './htmlElements.js'

let elems;

const isMetaMaskInstalled = () => {
  const { ethereum } = window
  return Boolean(ethereum && ethereum.isMetaMask)
}

function assignEventHandlers() {
  elems.connectButton.onclick = async () => {
    await onClickConnect(elems.connectButton, elems.currentAddress)
  }
  elems.fetchTokenDataButton.onclick = async () => {
    await onClickFetchTokenData(elems.tokenContractAddressInput.value, elems.totalSupply)
    enableButtonsGroup2()
  }
  elems.balanceOfButton.onclick = async () => {
    await onClickBalanceOfTokens(elems.balanceOf, elems.balanceOfInput.value)
  }
  elems.transferButton.onclick = async () => {
    await onClickTransfer(elems.transferToInput.value, elems.transferAmountInput.value)
  }
}

const enableButtonsGroup1 = () => {
  elems.connectButton.disabled = false
  elems.fetchTokenDataButton.disabled = false
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
  assignEventHandlers();
  enableButtonsGroup1()
}

window.addEventListener('DOMContentLoaded', initialize)
