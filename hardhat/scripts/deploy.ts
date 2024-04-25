import {ethers, upgrades} from "hardhat";

async function deploy(){
    const accounts = await ethers.getSigners();
    const DomainRegistryProto = await ethers.getContractFactory("DomainRegistry");
    const registrationPrice = 50; // 50$
    const contract = await upgrades.deployProxy(DomainRegistryProto, [accounts[0].address, registrationPrice]);

    console.log("DomainRegistry deployed to: ", await contract.getAddress());
}

deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});