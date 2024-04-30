import contractArtifact from "../hardhat/artifacts/contracts/DomainRegistryV2.sol/DomainRegistryV2.json" assert { type: "json" }

const config = {
  jsonRpcUrl: process.env.RPC,
  contractAddress: "0x68bF90951656cDcDe091abDC940bbBaf8b5a98B3",
  contractAbi: contractArtifact.abi,
  mnemonic: process.env.MNEMONIC,
}

export default config;
