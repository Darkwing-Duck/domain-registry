import {ethers, upgrades} from "hardhat";
import assert from "assert";

async function upgrade(){
    const DomainRegistryProtoV2 = await ethers.getContractFactory("DomainRegistryV2");
    const address = "0x68bF90951656cDcDe091abDC940bbBaf8b5a98B3";
    const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const tokenAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    
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

upgrade().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});