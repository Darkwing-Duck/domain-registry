import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {TypedContractEvent, TypedEventLog} from "../typechain-types/common";
import {DomainRegisteredEvent} from "../typechain-types/contracts/DomainRegistryV2";

describe("DomainRegistryV2", function () {
    async function domainRegistryV2Fixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();
        const DomainRegistryProto =
            await ethers.getContractFactory("DomainRegistryV2");

        const priceFeed = await deployMockPriceFeed();
        const token = await deployMockToken();
        const priceFeedAddress = await priceFeed.getAddress();
        const tokenAddress = await token.getAddress();
        const holderRewardUsd = 1; // 1$
        const registerPriceUsd = 50; // 50$
        
        const domainRegistry = await upgrades.deployProxy(DomainRegistryProto, [
            owner.address,
            registerPriceUsd,
            priceFeedAddress,
            tokenAddress
        ]);

        const registerPriceEth = await domainRegistry.usd2Eth(registerPriceUsd);
        const holderRewardEth = await domainRegistry.usd2Eth(holderRewardUsd);

        // initialize domain holder reward value
        await domainRegistry.changeDomainHolderRewardUsd(holderRewardUsd);

        return {
            domainRegistry, 
            token,
            owner,
            otherAccount,
            priceFeed,
            registerPriceEth,
            registerPriceUsd,
            holderRewardEth
        };
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

    function getReadableDate(timestamp: BigInt) {
        return new Date(Number(timestamp) * 1000).toLocaleDateString();
    }

    function sortLogsByDate(
        logs: TypedEventLog<
            TypedContractEvent<
                DomainRegisteredEvent.InputTuple,
                DomainRegisteredEvent.OutputTuple,
                DomainRegisteredEvent.OutputObject
            >
        >[],
    ) {
        return logs.sort((a, b) => Number(b.args.createdDate - a.args.createdDate));
    }

    function logDomainInfo(
        name: string,
        createdDate: BigInt,
        domainHolder: string,
    ) {
        // make logs with a proper indentation
        console.log(`[${name}]:
    - createdDate: ${getReadableDate(createdDate)}
    - domainHolder: ${domainHolder}`);
    }

    it("Should revert with 'NotEnoughMoneyToRegisterDomain' error", async () => {
        const domainName = "com";
        const {domainRegistry, registerPriceEth} = await loadFixture(domainRegistryV2Fixture);
        
        // get value less than registration price
        const options = {value: registerPriceEth - 1n};

        await expect(
            domainRegistry.registerDomain(domainName, options),
        ).to.be.rejectedWith(
            'PaymentForRegisteringDomainFailed("Not enough ether to register the domain")',
        );
    });

    it("Should revert with 'ParentDomainNameWasNotFound' error", async () => {
        const domainName = "business.com";
        const {domainRegistry, registerPriceEth} = await loadFixture(domainRegistryV2Fixture);
        const options = {value: registerPriceEth};

        await expect(
            domainRegistry.registerDomain(domainName, options),
        ).to.be.rejectedWith('ParentDomainNameWasNotFound("com")');
    });

    it("Should register domain and the domain became unavailable", async () => {
        const domainName = "com";
        const {domainRegistry, registerPriceEth} = await loadFixture(domainRegistryV2Fixture);
        const options = {value: registerPriceEth};

        // the domain com is available to register
        expect(await domainRegistry.isDomainRegistered(domainName)).to.be.false;

        await domainRegistry.registerDomain(domainName, options);

        // the domain com is unavailable to register
        expect(await domainRegistry.isDomainRegistered(domainName)).to.be.true;

        await expect(
            domainRegistry.registerDomain(domainName, options),
        ).to.be.rejectedWith("DomainIsAlreadyRegistered");
    });

    it("Should register sub-domains and became unavailable", async () => {
        const rootDomain = "com";
        const subDomain = "business.com";
        const {domainRegistry, registerPriceEth} = await loadFixture(domainRegistryV2Fixture);
        const options = {value: registerPriceEth};

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

        const {domainRegistry, registerPriceEth} = await loadFixture(domainRegistryV2Fixture);
        const options = {value: registerPriceEth};
        const domainHolderReward = await domainRegistry.domainHolderRewardUsd();
        let targetRewardBalance = await domainRegistry.usd2Eth(domainHolderReward);

        await domainRegistry.registerDomain(rootDomain, options);

        // on start reward balance is 0
        expect(await domainRegistry.getDomainRewardBalanceEth(rootDomain)).to.be.equal(
            0,
        );

        await domainRegistry.registerDomain(subDomain1, options);
        
        // after first sub-domain registration reward balance is 'domainHolderReward' value
        expect(await domainRegistry.getDomainRewardBalanceEth(rootDomain)).to.be.equal(
            targetRewardBalance,
        );

        await domainRegistry.registerDomain(subDomain2, options);

        targetRewardBalance *= 2n;

        // after second sub-domain registration reward balance is 'domainHolderReward' * 2 value
        expect(await domainRegistry.getDomainRewardBalanceEth(rootDomain)).to.be.equal(
            targetRewardBalance,
        );
    });

    it("Should increase balance due to domain registering", async () => {
        const domainName = "com";
        const {domainRegistry, registerPriceEth} = await loadFixture(domainRegistryV2Fixture);
        const options = {value: registerPriceEth};

        let balance = await ethers.provider.getBalance(domainRegistry);
        expect(balance).to.be.equal(0);

        await domainRegistry.registerDomain(domainName, options);

        balance = await ethers.provider.getBalance(domainRegistry);
        expect(balance).to.be.equal(registerPriceEth);
    });

    it("Only owner can withdraw balance to its own address", async () => {
        const {domainRegistry, owner, otherAccount, registerPriceEth} = await loadFixture(
            domainRegistryV2Fixture,
        );
        const options = {value: registerPriceEth};
        const targetContractBalance = registerPriceEth * 3n;

        await domainRegistry.registerDomain("net", options);
        await domainRegistry.registerDomain("com", options);
        await domainRegistry.registerDomain("business.com", options);

        await expect(
            (domainRegistry.connect(otherAccount) as any).withdrawEth(),
        ).to.be.rejectedWith("OwnableUnauthorizedAccount");

        expect(await ethers.provider.getBalance(domainRegistry)).to.be.equal(
            targetContractBalance,
        );

        const withdrawTx = await domainRegistry.withdrawEth();
        const totalRewardBalance = await domainRegistry.getTotalRewardBalanceEth();
        const withdrawValue = targetContractBalance - totalRewardBalance;

        expect(await ethers.provider.getBalance(domainRegistry)).to.be.equal(
            totalRewardBalance,
        );
        await expect(withdrawTx).to.changeEtherBalance(owner, withdrawValue);
    });

    it("Should withdraw reward balance for a domain holder, only by owner", async () => {
        const {domainRegistry, otherAccount, registerPriceEth} = await loadFixture(
            domainRegistryV2Fixture,
        );
        const options = {value: registerPriceEth};
        const topDomain = "com";
        const subDomain = "business.com";
        const rewardAmountUsd = await domainRegistry.domainHolderRewardUsd();
        const rewardAmountEth = await domainRegistry.usd2Eth(rewardAmountUsd);

        await domainRegistry.registerDomain(topDomain, options);
        await domainRegistry.registerDomain(subDomain, options);

        expect(await domainRegistry.getDomainRewardBalanceEth(topDomain)).to.be.equal(
            rewardAmountEth,
        );

        await expect(
            (domainRegistry.connect(otherAccount) as any).withdrawEthRewardFor(
                topDomain,
            ),
        ).to.be.rejectedWith("OwnableUnauthorizedAccount");

        const totalRewardBalanceEth = await domainRegistry.getTotalRewardBalanceEth();
        const topDomainHolderAddress =
            await domainRegistry.findDomainHolderBy(topDomain);
        const targetContractBalance = registerPriceEth * 2n - rewardAmountEth;
        const withdrawTx = await domainRegistry.withdrawEthRewardFor(topDomain);

        expect(await ethers.provider.getBalance(domainRegistry)).to.be.equal(
            targetContractBalance,
        );
        
        expect(await domainRegistry.getTotalRewardBalanceEth()).to.be.equal(
            totalRewardBalanceEth - rewardAmountEth,
        );
        expect(await domainRegistry.getDomainRewardBalanceEth(topDomain)).to.be.equal(
            0,
        );
        await expect(withdrawTx).to.changeEtherBalance(
            topDomainHolderAddress,
            rewardAmountEth,
        );
    });

    // @notice If sender will pay more then needed, contract should refund the excess
    it("Should refund excess due to overpayment", async () => {
        const domainName = "com";
        const {domainRegistry, owner, registerPriceEth} = await loadFixture(
            domainRegistryV2Fixture,
        );

        const etherToSend = registerPriceEth * 3n;
        const options = {value: etherToSend};
        const priceForRegistrationUsd = await domainRegistry.registrationPriceUsd();
        const priceForRegistrationEth = await domainRegistry.usd2Eth(priceForRegistrationUsd);

        // balances before registration
        let contractBalanceBefore =
            await ethers.provider.getBalance(domainRegistry);
        let ownerBalanceBefore = await ethers.provider.getBalance(owner);

        expect(contractBalanceBefore).to.be.equal(0);

        // calculate the full transaction cost
        const tx = await domainRegistry.registerDomain(domainName, options);
        const receipt = await tx.wait();
        const cumulativeGasUse: bigint = receipt!.cumulativeGasUsed;
        const gasPrice: bigint = receipt!.gasPrice;
        const gasUsed = cumulativeGasUse * gasPrice;
        const predictedOwnerBalance = ownerBalanceBefore - priceForRegistrationEth - gasUsed;

        // balances after registration
        let contractBalanceAfter = await ethers.provider.getBalance(domainRegistry);
        let ownerBalanceAfter = await ethers.provider.getBalance(owner);

        // check that contract balance increased only by 'priceForRegistration' value and not more
        expect(contractBalanceAfter).to.be.equal(priceForRegistrationEth);

        // check that sender balance decreased only by 'priceForRegistration' value and not more
        expect(ownerBalanceAfter).to.be.equal(predictedOwnerBalance);
    });

    it("Only owner can change registration price", async () => {
        const {domainRegistry, otherAccount} = await loadFixture(
            domainRegistryV2Fixture,
        );
        const newPriceUsd = 150n; // 150$
        const initialPrice = await domainRegistry.registrationPriceUsd();

        await expect(
            (domainRegistry.connect(otherAccount) as any).changeRegistrationPriceUsd(
                newPriceUsd,
            ),
        ).to.be.rejectedWith("OwnableUnauthorizedAccount");

        expect(await domainRegistry.registrationPriceUsd()).to.be.equal(initialPrice);

        await expect(
            domainRegistry.changeRegistrationPriceUsd(newPriceUsd),
        ).to.not.be.rejectedWith("OwnableUnauthorizedAccount");

        expect(await domainRegistry.registrationPriceUsd()).to.be.equal(newPriceUsd);
    });

    it("Only owner can change domain's holder reward value", async () => {
        const {domainRegistry, otherAccount} = await loadFixture(
            domainRegistryV2Fixture,
        );
        const newRewardUsd = 5; // 5$
        const initialPrice = await domainRegistry.domainHolderRewardUsd();

        await expect(
            (domainRegistry.connect(otherAccount) as any).changeDomainHolderRewardUsd(
                newRewardUsd,
            ),
        ).to.be.rejectedWith("OwnableUnauthorizedAccount");

        expect(await domainRegistry.domainHolderRewardUsd()).to.be.equal(initialPrice);

        await expect(
            domainRegistry.changeDomainHolderRewardUsd(newRewardUsd),
        ).to.not.be.rejectedWith("OwnableUnauthorizedAccount");

        expect(await domainRegistry.domainHolderRewardUsd()).to.be.equal(newRewardUsd);
    });

    it("Should print all the created domains", async () => {
        const domainsToRegisterByOwner = ["com", "org"];
        const domainsToRegisterByOtherAccount = ["io", "net"];
        const {domainRegistry, otherAccount, registerPriceEth} = await loadFixture(
            domainRegistryV2Fixture,
        );
        const options = {value: registerPriceEth};

        // register domain by owner by default
        for (let domainName of domainsToRegisterByOwner) {
            await domainRegistry.registerDomain(domainName, options);
        }

        // register domains by otherAccount
        for (let domainName of domainsToRegisterByOtherAccount) {
            await (domainRegistry.connect(otherAccount) as any).registerDomain(
                domainName,
                options,
            );
        }

        const filter = domainRegistry.filters.DomainRegistered();
        const logs: any[] = await domainRegistry.queryFilter(filter);
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
        console.log(
            `===== All registered domains by a domain holder (%s) ======`,
            otherAccount.address,
        );
        const orgFilter = domainRegistry.filters.DomainRegistered(
            null,
            otherAccount,
        );
        const orgLogs: any[] = await domainRegistry.queryFilter(orgFilter);
        sortedLogs = sortLogsByDate(orgLogs);

        sortedLogs.map((log) => {
            logDomainInfo(log.args.name, log.args.createdDate, log.args.domainHolder);
        });
        console.log(`====================================================`);
    });

    it("Should correctly convert usd to eth wei value", async () => {
        const {domainRegistry, token, owner, priceFeed} = await loadFixture(domainRegistryV2Fixture);
        const registryAddress = await domainRegistry.getAddress();
        const usdValue = 1n;
        const ethValue = await domainRegistry.usd2Eth(usdValue);
        const ethFloatPrice = Number(ethers.formatEther(ethValue)).toFixed(5);

        expect(ethFloatPrice).to.be.equal("0.00032");
    });

    it("Should register domain name by usd", async () => {
        const {domainRegistry, token, owner} = await loadFixture(domainRegistryV2Fixture);
        const registryAddress = await domainRegistry.getAddress();

        const tokenDecimals = await token.decimals();
        const usdPrice = await domainRegistry.registrationPriceUsd() * 10n ** tokenDecimals;
        const initialSenderUsdBalance = await token.balanceOf(owner.address);
        const targetSenderUsdBalance = initialSenderUsdBalance - usdPrice;
        const domainToRegister = "com";

        expect(await token.balanceOf(registryAddress)).to.be.equal(0);
        expect(await domainRegistry.isDomainRegistered(domainToRegister)).to.be.false;

        await token.approve(registryAddress, usdPrice);

        expect(await token.allowance(owner.address, registryAddress)).to.be.equal(usdPrice);
        
        await domainRegistry.registerDomainWithUsd(domainToRegister);

        expect(await domainRegistry.isDomainRegistered(domainToRegister)).to.be.true;
        expect(await token.balanceOf(registryAddress)).to.be.equal(usdPrice);
        expect(await token.balanceOf(owner.address)).to.be.equal(targetSenderUsdBalance);
    });

    it("Should reward domain holder with usd", async () => {
        const {domainRegistry, token, owner} = await loadFixture(domainRegistryV2Fixture);
        const registryAddress = await domainRegistry.getAddress();

        const tokenDecimals = await token.decimals();
        const usdPrice = await domainRegistry.registrationPriceUsd() * 10n ** tokenDecimals;
        const usdRewardValue = await domainRegistry.domainHolderRewardUsd();
        const domainToRegister = "com";
        const childDomainToRegister = "business.com";

        expect(await domainRegistry.isDomainRegistered(domainToRegister)).to.be.false;
        expect(await domainRegistry.isDomainRegistered(childDomainToRegister)).to.be.false;
        
        expect(await domainRegistry.getDomainRewardBalanceUsd(domainToRegister)).to.be.equal(0);
        expect(await domainRegistry.getTotalRewardBalanceUsd()).to.be.equal(0);

        await token.approve(registryAddress, usdPrice);
        await domainRegistry.registerDomainWithUsd(domainToRegister);

        await token.approve(registryAddress, usdPrice);
        await domainRegistry.registerDomainWithUsd(childDomainToRegister);

        expect(await domainRegistry.isDomainRegistered(domainToRegister)).to.be.true;
        expect(await domainRegistry.isDomainRegistered(childDomainToRegister)).to.be.true;

        expect(await domainRegistry.getDomainRewardBalanceUsd(domainToRegister)).to.be.equal(usdRewardValue);
        expect(await domainRegistry.getTotalRewardBalanceUsd()).to.be.equal(usdRewardValue);
    });

    it("Should withdraw owner's usd", async () => {
        const {domainRegistry, token, owner, otherAccount} = await loadFixture(domainRegistryV2Fixture);
        const registryAddress = await domainRegistry.getAddress();
        const tokenDecimals = await token.decimals();
        const usdPrice = await domainRegistry.registrationPriceUsd() * 10n ** tokenDecimals;
        const usdRewardValue = await domainRegistry.domainHolderRewardUsd() * 10n ** tokenDecimals;
        const domainToRegister = "com";
        const childDomainToRegister = "business.com";
        const targetUsdToWithdraw = usdPrice * 2n - usdRewardValue;

        await token.approve(registryAddress, usdPrice);
        await domainRegistry.registerDomainWithUsd(domainToRegister);

        await token.approve(registryAddress, usdPrice);
        await domainRegistry.registerDomainWithUsd(childDomainToRegister);

        const withdrawTx = await domainRegistry.withdrawUsd();
        await withdrawTx.wait();

        const registryBalance = await token.balanceOf(domainRegistry.getAddress());

        expect(registryBalance).to.be.equal(usdRewardValue);

        await expect(withdrawTx).to.changeTokenBalance(
            token,
            owner.address,
            targetUsdToWithdraw,
        );
    });

    it("Should withdraw domain holder's reward in usd", async () => {
        const {domainRegistry, token, owner, otherAccount} = await loadFixture(domainRegistryV2Fixture);
        const registryAddress = await domainRegistry.getAddress();
        const tokenDecimals = await token.decimals();
        const usdPrice = await domainRegistry.registrationPriceUsd() * 10n ** tokenDecimals;
        const usdRewardValue = await domainRegistry.domainHolderRewardUsd() * 10n ** tokenDecimals;
        const domainToRegister = "com";
        const childDomainToRegister = "business.com";

        await token.approve(registryAddress, usdPrice);
        await domainRegistry.registerDomainWithUsd(domainToRegister);

        await token.approve(registryAddress, usdPrice);
        await domainRegistry.registerDomainWithUsd(childDomainToRegister);

        const registryBalance = await token.balanceOf(domainRegistry.getAddress());
        const targetRegistryBalance = registryBalance - usdRewardValue;

        const withdrawTx = await domainRegistry.withdrawUsdRewardFor(domainToRegister);
        await withdrawTx.wait();

        expect(await token.balanceOf(domainRegistry.getAddress())).to.be.equal(targetRegistryBalance);

        await expect(withdrawTx).to.changeTokenBalance(
            token,
            owner.address,
            usdRewardValue,
        );
    });
});
