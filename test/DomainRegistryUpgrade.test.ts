import {ethers, upgrades} from "hardhat";
import {expect} from "chai";

describe("DomainRegistry upgrade", function () {
    it("Upgrade", async function () {
        const [owner] = await ethers.getSigners();
        const registrationPrice = ethers.parseEther("1");
        const options = { value: registrationPrice };
        const topLevelDomains = ["com", "net", "io"];
        const secondLevelSubDomains = ["business.com", "work.net", "company.io"];
        const thirdLevelSubDomains = ["test.business.com", "my.work.net", "some.company.io"];
        let targetRegistryBalance = 0n;
        
        const DomainRegistryProtoV1 = await ethers.getContractFactory("DomainRegistry");
        let domainRegistry = await upgrades.deployProxy(DomainRegistryProtoV1, [owner.address, registrationPrice]);

        expect(await ethers.provider.getBalance(domainRegistry)).to.equal(targetRegistryBalance);
        expect(await domainRegistry.registrationPrice()).to.equal(registrationPrice);

        // register top level domains
        for (let domainName of topLevelDomains) {
            await domainRegistry.registerDomain(domainName, options);
        }

        targetRegistryBalance += BigInt(topLevelDomains.length) * registrationPrice;
        expect(await ethers.provider.getBalance(domainRegistry)).to.equal(targetRegistryBalance);

        // register second level domains
        for (let domainName of secondLevelSubDomains) {
            await domainRegistry.registerDomain(domainName, options);
        }

        targetRegistryBalance += BigInt(secondLevelSubDomains.length) * registrationPrice;
        expect(await ethers.provider.getBalance(domainRegistry)).to.equal(targetRegistryBalance);

        // register third level domains
        for (let domainName of thirdLevelSubDomains) {
            await domainRegistry.registerDomain(domainName, options);
        }

        targetRegistryBalance += BigInt(thirdLevelSubDomains.length) * registrationPrice;
        expect(await ethers.provider.getBalance(domainRegistry)).to.equal(targetRegistryBalance);

        const DomainRegistryProtoV2 = await ethers.getContractFactory("DomainRegistryV2");
        const address = await domainRegistry.getAddress();
        const domainHolderReward = ethers.parseEther("0.1");
        
        domainRegistry = await upgrades.upgradeProxy(address, DomainRegistryProtoV2);

        domainRegistry.changeDomainHolderReward(domainHolderReward);

        expect(await domainRegistry.registrationPrice()).to.equal(registrationPrice);
        expect(await domainRegistry.domainHolderReward()).to.equal(domainHolderReward);
        expect(await ethers.provider.getBalance(domainRegistry)).to.equal(targetRegistryBalance);

        // ensure that all the top level domains still registered on upgraded contract
        for (let domainName of topLevelDomains) {
            expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
        }

        // ensure that all the second level domains still registered on upgraded contract
        for (let domainName of secondLevelSubDomains) {
            expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
        }

        // ensure that all the third level domains still registered on upgraded contract
        for (let domainName of thirdLevelSubDomains) {
            expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
        }
    });
});