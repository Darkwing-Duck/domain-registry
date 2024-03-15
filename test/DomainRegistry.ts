import {loadFixture,} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";

describe("DomainRegistry", function () {
    async function domainRegistryFixture() {

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();
        
        const Factory = await ethers.getContractFactory("DomainRegistryFactory");
        const DomainRegistry = await ethers.getContractFactory("DomainRegistry");
        
        const factory = await Factory.deploy();
        const domainRegistry = await DomainRegistry.deploy("", owner, owner, factory);

        return { domainRegistry, owner, otherAccount };
    }

    it("Should revert with 'UnsupportedDomainName' error", async () => {
        const { domainRegistry } = await loadFixture(domainRegistryFixture);

        await expect(domainRegistry.registerDomain("business.com")).to.be.rejectedWith(
            "UnsupportedDomainName"
        );
    });

    it("Should revert with 'InvalidDomainName' error", async () => {
        const { domainRegistry } = await loadFixture(domainRegistryFixture);

        await expect(domainRegistry.registerDomain("c")).to.be.rejectedWith(
            "InvalidDomainName"
        );
    });

    it("Should revert with 'NotEnoughMoneyToRegisterDomain' error", async () => {
        const domainName = "com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const lessEtherToSend = await domainRegistry.domainRegistrationPrice() - ethers.parseEther("0.2");
        const options = { value: lessEtherToSend };

        await expect(domainRegistry.registerDomain(domainName, options)).to.be.rejectedWith(
            'PaymentForRegisteringDomainFailed("Not enough ether to register the domain")'
        );
    });

    it("Should register domain and the domain became unavailable", async () => {
        const domainName = "com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const options = { value: ethers.parseEther("1") };

        // the domain com is available to register
        expect(await domainRegistry.isDomainAvailable(domainName)).to.be.true;
        
        await domainRegistry.registerDomain(domainName, options);

        // the domain com is unavailable to register
        expect(await domainRegistry.isDomainAvailable(domainName)).to.be.false;
    });

    it("Should increase balance due to domain registering", async () => {
        const domainName = "com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const etherToSend = ethers.parseEther("1");
        const options = { value: etherToSend };

        let balance = await ethers.provider.getBalance(domainRegistry);
        expect(balance).to.be.equal(0);
        
        await domainRegistry.registerDomain(domainName, options);

        balance = await ethers.provider.getBalance(domainRegistry);
        expect(balance).to.be.equal(etherToSend);
    });

    // @notice If sender will pay more then needed, contract should refund the excess 
    it("Should refund excess due to overpayment", async () => {
        const domainName = "com";
        const { domainRegistry, owner } = await loadFixture(domainRegistryFixture);
        
        const etherToSend = ethers.parseEther("3");
        const options = { value: etherToSend };
        const priceForRegistration = await domainRegistry.domainRegistrationPrice();
        
        // balances before registration
        let contractBalanceBefore = await ethers.provider.getBalance(domainRegistry);
        let ownerBalanceBefore = await ethers.provider.getBalance(owner);

        expect(contractBalanceBefore).to.be.equal(0);

        const tx = await domainRegistry.registerDomain(domainName, options);
        const receipt = await tx.wait();
        const gasUsed = receipt!.cumulativeGasUsed * receipt!.gasPrice;
        const predictedOwnerBalance = ownerBalanceBefore - priceForRegistration - gasUsed;

        // balances after registration
        let contractBalanceAfter = await ethers.provider.getBalance(domainRegistry);
        let ownerBalanceAfter = await ethers.provider.getBalance(owner);

        // check that contract balance increased only by 'priceForRegistration' value and not more
        expect(contractBalanceAfter).to.be.equal(priceForRegistration);
        
        // check that sender balance decreased only by 'priceForRegistration' value and not more
        expect(ownerBalanceAfter).to.be.equal(predictedOwnerBalance);
    });
});