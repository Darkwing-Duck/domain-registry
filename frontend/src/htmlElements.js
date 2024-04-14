export function init() {
  return {
    connectButton: document.getElementById('connectButton'),
    tokenContractAddressInput: document.getElementById('tokenContractAddressInput'),
    fetchTokenDataButton: document.getElementById('fetchTokenDataButton'),
    currentAddress: document.getElementById('currentAddress'),
    totalSupply: document.getElementById('totalSupply'),
    balanceOfInput: document.getElementById('balanceOfInput'),
    balanceOfButton: document.getElementById('balanceOfButton'),
    balanceOf: document.getElementById('balanceOf'),
    transferToInput: document.getElementById('transferToInput'),
    transferAmountInput: document.getElementById('transferAmountInput'),
    transferButton: document.getElementById('transferButton')
  }
}
