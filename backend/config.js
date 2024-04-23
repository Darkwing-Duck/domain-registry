import contractArtifact from "../hardhat/artifacts/contracts/MyToken.sol/MyToken.json" assert { type: "json" }

const config = {
  jsonRpcUrl: "http://127.0.0.1:8545",
  contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  contractAbi: contractArtifact.abi,
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
}

export default config;
