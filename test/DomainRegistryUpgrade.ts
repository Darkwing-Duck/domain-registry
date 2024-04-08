import {ethers, upgrades} from "hardhat";
import {expect} from "chai";

describe("DomainRegistry upgrade", function () {
    it("test", async function () {
        const [owner, otherAccount] = await ethers.getSigners();
        const registrationPrice = ethers.parseEther("1");
        
        const options = { value: registrationPrice };
        
        const topLevelDomains = ["com", "net", "io"];
        const secondLevelSubDomains = ["business.com", "work.net", "company.io"];
        const thirdLevelSubDomains = ["test.business.com", "my.work.net", "some.company.io"];
        
        const DomainRegistryProtoV1 = await ethers.getContractFactory("DomainRegistry");
        let domainRegistry = await upgrades.deployProxy(DomainRegistryProtoV1, [owner.address, registrationPrice]);

        expect(await domainRegistry.registrationPrice()).to.equal(registrationPrice);

        // register top level domains
        for (let domainName of topLevelDomains) {
            await domainRegistry.registerDomain(domainName, options);
        }

        // register second level domains
        for (let domainName of secondLevelSubDomains) {
            await domainRegistry.registerDomain(domainName, options);
        }

        // register third level domains
        for (let domainName of thirdLevelSubDomains) {
            await domainRegistry.registerDomain(domainName, options);
        }

        let DomainRegistryProtoV2 = await ethers.getContractFactory("DomainRegistryV2");
        const address = await domainRegistry.getAddress();
        const domainHolderReward = ethers.parseEther("0.1");

        // const [owner, addr1] = await ethers.getSigners();
        // ContractV2 = ContractV2.connect(addr1);

        domainRegistry = await upgrades.upgradeProxy(address, DomainRegistryProtoV2, {call: {
            fn: "changeDomainHolderReward",
            args: [domainHolderReward],
        }});

        expect(await domainRegistry.registrationPrice()).to.equal(registrationPrice);
        expect(await domainRegistry.domainHolderReward()).to.equal(domainHolderReward);

        for (let domainName of topLevelDomains) {
            expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
        }

        for (let domainName of secondLevelSubDomains) {
            expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
        }

        for (let domainName of thirdLevelSubDomains) {
            expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
        }
    });
});