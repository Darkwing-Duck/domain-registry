import * as tokenContract from './tokenContract.js'

export async function onClickConnect (button, currentAddr) {
  try {
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    })
    button.innerHTML = "Connected"
    currentAddr.innerHTML = accounts[0]
  } catch (error) {
    console.error(error)
  }
}

export async function onClickFetchTokenData (tokenContractAddress, totalSupply) {
  if (!tokenContractAddress) {
    return
  }
  tokenContract.bind(tokenContractAddress)
  totalSupply.innerHTML = await tokenContract.totalSupply()
}

export async function onClickBalanceOfTokens (balanceOfElem, address) {
  balanceOfElem.innerHTML = `Balance of ${address} is ${await tokenContract.balanceOf(address)}`
}

export async function onClickTransfer (to, amount) {
  await tokenContract.transfer(to, amount)
}
