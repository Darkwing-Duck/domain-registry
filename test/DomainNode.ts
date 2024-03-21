import {loadFixture,} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";

describe("DomainRegistry", function () {
    async function domainRegistryFixture() {

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();
        
        const DomainRegistryProto = await ethers.getContractFactory("DomainRegistry");
        
        const registrationPrice = ethers.parseEther("1");
        const salt = ethers.encodeBytes32String("test_salt");
        const domainRegistry = await DomainRegistryProto.deploy(registrationPrice, salt);

        return { domainRegistry, owner, otherAccount };
    }
    
    function getReadableDate(timestamp: BigInt) {
        return new Date(Number(timestamp)).toLocaleDateString();
    }

    it("Should support only top-level domain names", async () => {
        const { domainRegistry } = await loadFixture(domainRegistryFixture);

        // should be rejected due an unsupported domain name
        await expect(domainRegistry.registerDomain("business.com")).to.be.rejectedWith(
            "UnsupportedDomainName"
        );

        // should not be rejected for supported domain name
        await expect(domainRegistry.registerDomain("com")).to.not.be.rejectedWith(
            "UnsupportedDomainName"
        );
    });
    
    it("Should revert with 'NotEnoughMoneyToRegisterDomain' error", async () => {
        const domainName = "com";
        const { domainRegistry } = await loadFixture(domainRegistryFixture);
        const lessEtherToSend = await domainRegistry.registrationPrice() - ethers.parseEther("0.2");
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
        expect(await domainRegistry.isDomainRegistered(domainName)).to.be.false;

        await domainRegistry.registerDomain(domainName, options);

        // the domain com is unavailable to register
        expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;
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
            'UnauthorizedAccount'
        );

        expect(await domainRegistry.registrationPrice()).to.be.equal(initialPrice);

        await expect(domainRegistry.changeRegistrationPrice(newPrice)).to.not.be.rejectedWith(
            'UnauthorizedAccount'
        );

        expect(await domainRegistry.registrationPrice()).to.be.equal(newPrice);
    });

    it("Should print all the created domains", async () => {
        const domainsToRegister = ["com", "org", "net"];
        const { domainRegistry, otherAccount } = await loadFixture(domainRegistryFixture);
        const etherToSend = await domainRegistry.registrationPrice();
        const options = { value: etherToSend };

        for (let domainName of domainsToRegister) {
            await domainRegistry.registerDomain(domainName, options);
        }

        const filter = domainRegistry.filters.DomainCreated();
        const logs = await domainRegistry.queryFilter(filter);
        
        // print registered domains number
        console.log(`Number of registered domains: ${logs.length}`);

        console.log("\n");

        // print detailed info of all registered domains
        console.log(`===== All registered domains ======`);
        logs.map((log) => {
            logDomainInfo(log.args.name, log.args.createdDate, log.args.domainHolder, log.args.domainNode);
        });
        console.log(`===================================`);

        console.log("\n");
        
        // print detailed info of all registered sub-domains for domain 'org'
        console.log(`===== All registered domains for domain 'org' ======`);
        const domainNodeAddress = await domainRegistry.getDomainNode("org");
        const orgFilter = domainRegistry.filters.DomainCreated(null, domainNodeAddress);
        const orgLogs = await domainRegistry.queryFilter(orgFilter);

        orgLogs.map((log) => {
            logDomainInfo(log.args.name, log.args.createdDate, log.args.domainHolder, log.args.domainNode);
        });
        console.log(`====================================================`);
        
        expect(logs.length).to.be.equal(3);
    });
    
    function logDomainInfo(name: string, createdDate: BigInt, domainHolder: string, nodeAddress: string) {
        // make logs with a proper indentation
        console.log(`[${name}]:
    - createdDate: ${getReadableDate(createdDate)}
    - domainHolder: ${domainHolder}
    - domainNode: ${nodeAddress}`);
    }
});