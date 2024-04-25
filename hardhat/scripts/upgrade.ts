import {ethers, upgrades} from "hardhat";
import assert from "assert";
import {deployMock} from "./deployMock";

async function upgrade(){
    const { priceFeed, token } = await deployMock();
    const DomainRegistryProtoV2 = await ethers.getContractFactory("DomainRegistryV2");
    const address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const priceFeedAddress = await priceFeed.getAddress();
    const tokenAddress = await token.getAddress();
    
    const upgradedToContractV2 = await upgrades.upgradeProxy(address, DomainRegistryProtoV2, {call: {
        fn: "reinitialize",
        args: [priceFeedAddress, tokenAddress]
    }});
    
    console.log("DomainRegistry was upgraded\n");
    console.log("Address before upgrade:", address);
    console.log("Address after upgrade:", await upgradedToContractV2.getAddress());

    const rewardValue = 1; // 1$
    await upgradedToContractV2.changeDomainHolderRewardUsd(rewardValue);
    
    console.log("Reward for parent domain: ", await upgradedToContractV2.domainHolderRewardUsd(), "usd");
    
    assert(await upgradedToContractV2.getAddress() === address);

    console.log("\nAddresses are the same!")
}

async function deployMockToken() {
    const mockUSDCTokenFactory = await ethers.getContractFactory("MockUSDCToken")
    return mockUSDCTokenFactory.deploy();
}

async function deployMockPriceFeed() {
    const DECIMALS = "8"
    const INITIAL_PRICE = "308163834765"
    const mockV3AggregatorFactory = await ethers.getContractFactory("MockV3Aggregator")

    return mockV3AggregatorFactory.deploy(DECIMALS, INITIAL_PRICE);
}

upgrade().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});