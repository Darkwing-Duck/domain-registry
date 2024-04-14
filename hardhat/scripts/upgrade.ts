import {ethers, upgrades} from "hardhat";
import assert from "assert";

async function upgrade(){
    const DomainRegistryProtoV2 = await ethers.getContractFactory("DomainRegistryV2");
    const address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const upgradedToContractV2 = await upgrades.upgradeProxy(address, DomainRegistryProtoV2);
    
    console.log("DomainRegistry was upgraded\n");
    console.log("Address before upgrade:", address);
    console.log("Address after upgrade:", await upgradedToContractV2.getAddress());

    assert(await upgradedToContractV2.getAddress() === address);

    console.log("\nAddresses are the same!")
}

upgrade().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});