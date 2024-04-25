import contractArtifact from "../hardhat/artifacts/contracts/DomainRegistryV2.sol/DomainRegistryV2.json" assert { type: "json" }

const config = {
  jsonRpcUrl: process.env.RPC || "http://127.0.0.1:8545",
  contractAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  contractAbi: contractArtifact.abi,
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
}

export default config;
