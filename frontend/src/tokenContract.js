import { ethers } from 'ethers'
import contractArtifact from '../../hardhat/artifacts/contracts/MyToken.sol/MyToken.json' assert { type: "json" }

let Contract;
const provider = new ethers.BrowserProvider(window.ethereum)

export const bind = (address) => {
  Contract = new ethers.Contract(
    address,
    contractArtifact.abi,
    provider
  )
}

export const totalSupply = async () => {
  return await Contract.totalSupply()
}

export const balanceOf = async (address) => {
  return await Contract.balanceOf(address)
}

export const transfer = async (to, amount) => {
  try {
    const signer = await provider.getSigner()
    const tx = await Contract.connect(signer).transfer(to, amount)
    await tx.wait()
    console.log(`Transferred ${amount} tokens to ${to}. Tx hash: ${tx.hash}`)
  } catch (error) {
    console.error('Error transferring:', error.message)
  }
}
