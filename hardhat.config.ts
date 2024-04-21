import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";
const MNEMONIC = process.env.MNEMONIC || DEFAULT_MNEMONIC;
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            accounts: {
                mnemonic: DEFAULT_MNEMONIC,
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                chainId: 1337,
            },
        },
        sepolia: {
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
            accounts: {
                mnemonic: MNEMONIC,
            }
        }
    },
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    }
}
