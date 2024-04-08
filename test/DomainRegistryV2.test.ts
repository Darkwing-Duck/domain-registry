import {loadFixture,} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {TypedContractEvent, TypedEventLog} from "../typechain-types/common";
import {DomainRegisteredEvent} from "../typechain-types/DomainRegistry";

describe("DomainRegistry", function () {
    async function domainRegistryFixture() {

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();
        const DomainRegistryProto = await ethers.getContractFactory("DomainRegistryV2");

        const domainHolderReward = ethers.parseEther("0.1");
        const registrationPrice = ethers.parseEther("1");
        const domainRegistry = await upgrades.deployProxy(DomainRegistryProto, [owner.address, registrationPrice]);
        domainRegistry.changeDomainHolderReward(domainHolderReward);
        
        console.log(await domainRegistry.getAddress());

        return { domainRegistry, owner, otherAccount };
    }

    function getReadableDate(timestamp: BigInt) {
        return new Date(Number(timestamp) * 1000).toLocaleDateString();
    }

    function sortLogsByDate(logs: TypedEventLog<TypedContractEvent<DomainRegisteredEvent.InputTuple, DomainRegisteredEvent.OutputTuple, DomainRegisteredEvent.OutputObject>>[]) {
        return logs.sort((a, b) => Number(b.args.createdDate - a.args.createdDate));
    }

    function logDomainInfo(name: string, createdDate: BigInt, domainHolder: string) {
        // make logs with a proper indentation
        console.log(`[${name}]:
    - createdDate: ${getReadableDate(createdDate)}
    - domainHolder: ${domainHolder}`);
    }
    
    it("Should revert with 'NotEnoughMoneyToRegisterDomain' error", async () => {
        const domainName = "com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const lessEtherToSend = await domainRegistry.registrationPrice() - ethers.parseEther("0.2");
        const options = { value: lessEtherToSend };

        await expect(domainRegistry.registerDomain(domainName, options)).to.be.rejectedWith(
            'PaymentForRegisteringDomainFailed("Not enough ether to register the domain")'
        );
    });

    it("Should revert with 'ParentDomainNameWasNotFound' error", async () => {
        const domainName = "business.com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const options = { value: ethers.parseEther("1") };

        await expect(domainRegistry.registerDomain(domainName, options)).to.be.rejectedWith(
            'ParentDomainNameWasNotFound("com")'
        );
    });

    it("Should register domain and the domain became unavailable", async () => {
        const domainName = "com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const options = { value: ethers.parseEther("1") };

        // the domain com is available to register
        expect(await domainRegistry.isDomainRegistered(domainName)).to.be.false;

        await domainRegistry.registerDomain(domainName, options);

        // the domain com is unavailable to register
        expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;

        await expect(domainRegistry.registerDomain(domainName, options)).to.be.rejectedWith(
            'DomainIsAlreadyRegistered'
        );
    });

    it("Should register sub-domains and became unavailable", async () => {
        const rootDomain = "com";
        const subDomain = "business.com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const options = { value: ethers.parseEther("1") };

        await domainRegistry.registerDomain(rootDomain, options);

        // the domain com is available to register
        expect(await domainRegistry.isDomainRegistered(subDomain)).to.be.false;

        await domainRegistry.registerDomain(subDomain, options);

        // the domain com is unavailable to register
        expect(await domainRegistry.isDomainRegistered(subDomain)).to.be.true;
    });

    it("Should reward holder of parent domain while registering new sub-domain", async () => {
        const rootDomain = "com";
        const subDomain1 = "business.com";
        const subDomain2 = "test.com";
        
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const options = { value: ethers.parseEther("1") };
        const domainHolderReward = await domainRegistry.domainHolderReward();
        let targetRewardBalance = domainHolderReward;

        await domainRegistry.registerDomain(rootDomain, options);
        
        // on start reward balance is 0
        expect(await domainRegistry.getDomainHolderBalance(rootDomain)).to.be.equal(0);

        await domainRegistry.registerDomain(subDomain1, options);
        
        // after first sub-domain registration reward balance is 'domainHolderReward' value
        expect(await domainRegistry.getDomainHolderBalance(rootDomain)).to.be.equal(targetRewardBalance);

        await domainRegistry.registerDomain(subDomain2, options);

        targetRewardBalance += domainHolderReward;

        // after second sub-domain registration reward balance is 'domainHolderReward' * 2 value
        expect(await domainRegistry.getDomainHolderBalance(rootDomain)).to.be.equal(targetRewardBalance);
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

    it("Only owner can withdraw balance to its own address", async () => {
        const { domainRegistry, owner, otherAccount } = await loadFixture(domainRegistryFixture);
        const etherToSend = ethers.parseEther("1");
        const options = { value: etherToSend };
        const targetContractBalance = ethers.parseEther("3");

        await domainRegistry.registerDomain("net", options);
        await domainRegistry.registerDomain("com", options);
        await domainRegistry.registerDomain("business.com", options);

        await expect(domainRegistry.connect(otherAccount).withdraw()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount'
        );

        expect(await ethers.provider.getBalance(domainRegistry)).to.be.equal(targetContractBalance);

        const withdrawTx = await domainRegistry.withdraw();
        const totalRewardBalance = await domainRegistry.getTotalRewardBalance();
        const withdrawValue = targetContractBalance - totalRewardBalance;

        expect(await ethers.provider.getBalance(domainRegistry)).to.be.equal(totalRewardBalance);
        await expect(withdrawTx).to.changeEtherBalance(owner, withdrawValue);
    });

    it("Only owner can withdraw reward balance to domain holders", async () => {
        const { domainRegistry, owner, otherAccount } = await loadFixture(domainRegistryFixture);
        const etherToSend = ethers.parseEther("1");
        const options = { value: etherToSend };

        await domainRegistry.registerDomain("com", options);
        await domainRegistry.registerDomain("net", options);

        await expect(domainRegistry.connect(otherAccount).withdraw()).to.be.rejectedWith(
            'OwnableUnauthorizedAccount'
        );

        const withdrawTx = await domainRegistry.withdraw();

        expect(await ethers.provider.getBalance(domainRegistry)).to.be.equal(0);
        await expect(withdrawTx).to.changeEtherBalance(owner, ethers.parseEther("2"));
    });

    // @notice If sender will pay more then needed, contract should refund the excess 
    it("Should refund excess due to overpayment", async () => {
        const domainName = "com";
        const { domainRegistry, owner } = await loadFixture(domainRegistryFixture);

        const etherToSend = ethers.parseEther("3");
        const options = { value: etherToSend };
        const priceForRegistration = await domainRegistry.registrationPrice();

        // balances before registration
        let contractBalanceBefore = await ethers.provider.getBalance(domainRegistry);
        let ownerBalanceBefore = await ethers.provider.getBalance(owner);

        expect(contractBalanceBefore).to.be.equal(0);

        // calculate the full transaction cost
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

    it("Only owner can change registration price", async () => {
        const { domainRegistry, otherAccount } = await loadFixture(domainRegistryFixture);
        const newPrice = ethers.parseEther("3");
        const initialPrice = await domainRegistry.registrationPrice();

        await expect(domainRegistry.connect(otherAccount).changeRegistrationPrice(newPrice)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount'
        );

        expect(await domainRegistry.registrationPrice()).to.be.equal(initialPrice);

        await expect(domainRegistry.changeRegistrationPrice(newPrice)).to.not.be.rejectedWith(
            'OwnableUnauthorizedAccount'
        );

        expect(await domainRegistry.registrationPrice()).to.be.equal(newPrice);
    });

    it("Only owner can change domain's holder reward value", async () => {
        const { domainRegistry, otherAccount } = await loadFixture(domainRegistryFixture);
        const newPrice = ethers.parseEther("0.2");
        const initialPrice = await domainRegistry.domainHolderReward();

        await expect(domainRegistry.connect(otherAccount).changeDomainHolderReward(newPrice)).to.be.rejectedWith(
            'OwnableUnauthorizedAccount'
        );

        expect(await domainRegistry.domainHolderReward()).to.be.equal(initialPrice);

        await expect(domainRegistry.changeDomainHolderReward(newPrice)).to.not.be.rejectedWith(
            'OwnableUnauthorizedAccount'
        );

        expect(await domainRegistry.domainHolderReward()).to.be.equal(newPrice);
    });

    it("Should print all the created domains", async () => {
        const domainsToRegisterByOwner = ["com", "org"];
        const domainsToRegisterByOtherAccount = ["io", "net"];
        const { domainRegistry, otherAccount } = await loadFixture(domainRegistryFixture);
        const etherToSend = await domainRegistry.registrationPrice();
        const options = { value: etherToSend };

        // register domain by owner by default
        for (let domainName of domainsToRegisterByOwner) {
            await domainRegistry.registerDomain(domainName, options);
        }

        // register domains by otherAccount
        for (let domainName of domainsToRegisterByOtherAccount) {
            await domainRegistry.connect(otherAccount).registerDomain(domainName, options);
        }

        const filter = domainRegistry.filters.DomainRegistered();
        const logs = await domainRegistry.queryFilter(filter);
        let sortedLogs = sortLogsByDate(logs);
        
        console.log(`Number of registered domains: ${sortedLogs.length}`);
        
        expect(logs.length).to.be.equal(4);

        console.log("\n");

        // print detailed info of all registered domains
        console.log(`===== All registered domains ======`);
        logs.map((log) => {
            logDomainInfo(log.args.name, log.args.createdDate, log.args.domainHolder);
        });
        console.log(`===================================`);

        console.log("\n");

        // print detailed info of all registered sub-domains for domain 'org'
        console.log(`===== All registered domains by a domain holder (%s) ======`, otherAccount.address);
        const orgFilter = domainRegistry.filters.DomainRegistered(null, otherAccount);
        const orgLogs = await domainRegistry.queryFilter(orgFilter);
        sortedLogs = sortLogsByDate(orgLogs);

        sortedLogs.map((log) => {
            logDomainInfo(log.args.name, log.args.createdDate, log.args.domainHolder);
        });
        console.log(`====================================================`);
    });

});