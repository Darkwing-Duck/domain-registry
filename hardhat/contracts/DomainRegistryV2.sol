// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {strings} from "solidity-stringutils/src/strings.sol";
import {RewardRegistry} from "../libraries/RewardRegistry.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @author Serhii Smirnov
/// @title Describes a registry of all registered domain names linked to a domain holder,
/// who have registered the domain name
contract DomainRegistryV2 is OwnableUpgradeable {
    using strings for *;
    using RewardRegistry for RewardRegistry.Info;

    /// @custom:storage-location erc7201:mycompanyname.storage.DomainRegistry
    struct RegistryStorage {
        /// @notice Price for registration sub-domains
        uint256 registrationPrice;
        /// @notice Mapping of domain name to domain holder address
        mapping(string => address payable) domainsMap;
        /// @notice Reward information
        RewardRegistry.Info ethRewardInfo;
        RewardRegistry.Info usdRewardInfo;

        AggregatorV3Interface priceFeed;

        ERC20 usdContractAddress;
    }

    // keccak256(abi.encode(uint256(keccak256("mycompanyname.storage.DomainRegistry")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REGISTRY_STORAGE_LOCATION =
        0x95137cbd5b999a2a07f15c64ecb41442a54817dd1810d04f8ff3a7e325fb5100;

    /// @dev the way to get access to registry storage
    function _getRegistryStorage()
        private
        pure
        returns (RegistryStorage storage registryStorage)
    {
        assembly {
            registryStorage.slot := REGISTRY_STORAGE_LOCATION
        }
    }

    /// @notice Event that is notifying external world about new domain registration action
    /// @param indexedName - Indexed name of domain to simplify filtering events by the name
    /// @param indexedDomainHolder - Indexed domain holder to simplify filtering events by the hodler
    /// @param name - The name of domain
    /// @param domainHolder - Domain holder of domain
    /// @param createdDate - The date when the domain was created
    event DomainRegistered(
        string indexed indexedName,
        address indexed indexedDomainHolder,
        string name,
        address domainHolder,
        uint256 createdDate
    );

    /// @notice Event that is notifying external world about Eth reward withdrawal
    /// @param indexedDomainHolder - Indexed domain holder to simplify filtering events by the holder
    /// @param domainHolder - Domain holder of domain
    /// @param withdrawValue - Value that was withdrawed to the domain holder
    event RewardEthWithdrawed(
        address indexed indexedDomainHolder,
        address domainHolder,
        uint256 withdrawValue
    );

    /// @notice Event that is notifying external world about Usd reward withdrawal
    /// @param indexedDomainHolder - Indexed domain holder to simplify filtering events by the holder
    /// @param domainHolder - Domain holder of domain
    /// @param withdrawValue - Value that was withdrawed to the domain holder
    event RewardUsdWithdrawed(
        address indexed indexedDomainHolder,
        address domainHolder,
        uint256 withdrawValue
    );

    /// @notice Indicates that the domain name is already registered and unavailable
    error DomainIsAlreadyRegistered();

    /// @notice Indicates that the domain name was not registered
    error DomainWasNotRegistered();

    /// @notice Indicates that withdraw was failed
    error WithdrawFailed();

    /// @notice Indicates that amount of money passed is not enough to register the domain name
    error PaymentForRegisteringDomainFailed(string message);

    /// @notice Indicates that while registering sub-domain name the parent domain name doesn't exist.
    error ParentDomainNameWasNotFound(string parentDomainName);

    /// @notice Indicates that withdraw reward was failed
    error WithdrawRewardFailed(address domainHolder);

    /// @notice Indicates that nothing to withdraw
    error NothingToWithdraw();

    /// @notice Indicates that the sender is not holder of the domain name
    error YouAreNotDomainHolder();
    

    /// @notice Guarantees that only available domains can be passed to a method with the modifier
    modifier availableDomain(string memory domain) {
        if (isDomainRegistered(domain)) revert DomainIsAlreadyRegistered();
        _;
    }

    /// @notice Guarantees that only registered domains can be passed to a method with the modifier
    modifier onlyRegisteredDomain(string memory domain) {
        if (!isDomainRegistered(domain)) revert DomainWasNotRegistered();
        _;
    }

    /// @notice Guarantees that only holder of the domain can claim reward
    modifier onlyDomainHolder(string memory domain) {
        address holder = _getRegistryStorage().domainsMap[domain];
        if (msg.sender != holder) revert YouAreNotDomainHolder();
        _;
    }

    function reinitialize(address priceFeed_, address usdcContractAddress_) public reinitializer(2) {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        registryStorage.priceFeed = AggregatorV3Interface(priceFeed_);
        registryStorage.usdContractAddress = ERC20(usdcContractAddress_);
    }

    /// @dev Used instead of constructor due to use upgradeable contract approach
    function initialize(
        address owner_,
        uint256 registrationPrice_
    ) public initializer {
        __Ownable_init(owner_);
        _getRegistryStorage().registrationPrice = registrationPrice_;
    }

    /// @notice Converts usd value without decimals to eth value with 18 decimals
    /// @param usdAmount_ - usd value without decimals
    function usd2Eth(uint256 usdAmount_) public view returns (uint256) {
        uint256 usdPrice = usdAmount_ * 10 ** 18;
        uint256 ethPriceInUsd = _getLatestPrice();
        
        uint256 requiredEth = (usdPrice * 10 ** 18) / ethPriceInUsd;
        return requiredEth;
    }

    receive() external payable {}
    fallback() external payable {}

    /// @notice Registers passed domain name for Usd token
    /// @param domainName - The name of domain to be registered
    function registerDomainWithUsd(string memory domainName)
        external
        availableDomain(domainName)
    {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        uint8 decimals = registryStorage.usdContractAddress.decimals();
        uint256 usdPrice = registryStorage.registrationPrice * 10 ** decimals; // 50$ with decimals

        _registerDomainInternal(domainName, registryStorage.usdRewardInfo);
        
        bool success = registryStorage.usdContractAddress.transferFrom(msg.sender, address(this), usdPrice);

        if (!success)
            revert PaymentForRegisteringDomainFailed("Transaction was not successful");
    }

    /// @notice Registers passed domain name and sends the event to outside world
    /// @param domainName - The name of domain to be registered
    function registerDomain(
        string memory domainName
    ) external payable availableDomain(domainName) {
        RegistryStorage storage registryStorage = _getRegistryStorage();

        _updateHolderRewardEth();
        _registerDomainInternal(domainName, registryStorage.ethRewardInfo);
        
        // convert registration price from usd to wei
        uint256 registrationPriceInWei = usd2Eth(registryStorage.registrationPrice);

        if (msg.value < registrationPriceInWei)
            revert PaymentForRegisteringDomainFailed(
                "Not enough ether to register the domain"
            );

        // excess refunding mechanism
        if (msg.value > registrationPriceInWei) {
            uint256 excess = msg.value - registrationPriceInWei;

            if (!payTo(payable(msg.sender), excess))
                revert PaymentForRegisteringDomainFailed(
                    "The overpayment was detected, but refunding the excess was not succeed"
                );
        }
    }

    /// @notice Changes Usd price for domain registration
    function changeRegistrationPriceUsd(uint256 toValue) external onlyOwner {
        _getRegistryStorage().registrationPrice = toValue;
    }

    /// @notice Changes Usd reward for domain's holder when registering new sub-domain
    function changeDomainHolderRewardUsd(uint256 toValue) external onlyOwner {
        _getRegistryStorage().usdRewardInfo.rewardValue = toValue;
    }

    /// @notice Withdraws all the Eth balance to the owner's address
    function withdrawEth() external onlyOwner {
        withdrawEthTo(payable(owner()));
    }

    /// @notice Withdraws all the Usd balance to the owner's address
    function withdrawUsd() external onlyOwner {
        withdrawUsdTo(owner());
    }

    /// @notice Withdraws Eth reward for specified domain name
    function withdrawEthReward() external {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        uint256 rewardBalance = registryStorage.ethRewardInfo.getDomainHolderRewardBalance(msg.sender);

        if (rewardBalance == 0) revert NothingToWithdraw();

        // reset domain holder reward balance
        registryStorage.ethRewardInfo.resetFor(msg.sender);

        // fire event
        emit RewardEthWithdrawed({
            indexedDomainHolder: msg.sender,
            domainHolder: msg.sender,
            withdrawValue: rewardBalance
        });

        if (!payTo(payable(msg.sender), rewardBalance))
            revert WithdrawRewardFailed(msg.sender);
    }

    /// @notice Withdraws Usd reward for specified domain name
    function withdrawUsdReward() external {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        uint8 tokenDecimals = registryStorage.usdContractAddress.decimals();
        uint256 rewardBalance = registryStorage.usdRewardInfo.getDomainHolderRewardBalance(msg.sender) * 10 ** tokenDecimals;

        if (rewardBalance == 0) revert NothingToWithdraw();

        // reset domain reward balance
        registryStorage.usdRewardInfo.resetFor(msg.sender);

        // fire event
        emit RewardUsdWithdrawed({
            indexedDomainHolder: msg.sender,
            domainHolder: msg.sender,
            withdrawValue: rewardBalance
        });

        registryStorage.usdContractAddress.approve(address(this), rewardBalance);
        bool success = registryStorage.usdContractAddress.transferFrom(address(this), msg.sender, rewardBalance);

        if (!success)
            revert WithdrawRewardFailed(msg.sender);
    }

    /// @notice Resolves domain entry by the name
    /// @param domainName - The name of domain to be resolved
    function findDomainHolderBy(
        string memory domainName
    ) external view onlyRegisteredDomain(domainName) returns (address) {
        return _getRegistryStorage().domainsMap[domainName];
    }

    /// @notice Returns actual Usd price for a domain registration
    function registrationPriceUsd() external view returns (uint256) {
        return _getRegistryStorage().registrationPrice;
    }

    /// @notice Returns actual domain's holder Usd reward for a domain registration
    function domainHolderRewardUsd() external view returns (uint256) {
        return _getRegistryStorage().usdRewardInfo.rewardValue;
    }

    /// @notice Returns usd token address
    function usdTokenAddress() external view returns (address) {
        return address(_getRegistryStorage().usdContractAddress);
    }

    /// @notice Returns Usd reward balance of domain's holder
    function getDomainHolderRewardBalanceUsd(
        address domainHolder
    ) external view returns (uint256) {
        return _getRegistryStorage().usdRewardInfo.getDomainHolderRewardBalance(domainHolder);
    }

    /// @notice Returns Eth reward balance of domain's holder
    function getDomainHolderRewardBalanceEth(
        address domainHolder
    ) external view returns (uint256) {
        return _getRegistryStorage().ethRewardInfo.getDomainHolderRewardBalance(domainHolder);
    }

    /// @notice Returns total Usd reward balance of all domain names
    function getTotalRewardBalanceUsd() external view returns (uint256) {
        return _getRegistryStorage().usdRewardInfo.totalRewardsBalance;
    }

    /// @notice Returns total Eth reward balance of all domain names
    function getTotalRewardBalanceEth() external view returns (uint256) {
        return _getRegistryStorage().ethRewardInfo.totalRewardsBalance;
    }

    /// @notice Withdraws all the Eth balance to specified address
    function withdrawEthTo(address payable recipient) public onlyOwner {
        uint256 availableBalanceToWithdraw = address(this).balance -
                                _getRegistryStorage().ethRewardInfo.totalRewardsBalance;

        if (availableBalanceToWithdraw == 0) revert NothingToWithdraw();

        if (!payTo(recipient, availableBalanceToWithdraw))
            revert WithdrawFailed();
    }

    /// @notice Withdraws all the Usd balance to specified address
    function withdrawUsdTo(address recipient) public onlyOwner {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        uint8 tokenDecimals = registryStorage.usdContractAddress.decimals();
        uint256 usdBalance = registryStorage.usdContractAddress.balanceOf(address(this));
        uint256 availableBalanceToWithdraw = usdBalance - registryStorage.usdRewardInfo.totalRewardsBalance * 10 ** tokenDecimals;

        if (availableBalanceToWithdraw == 0) revert NothingToWithdraw();

        registryStorage.usdContractAddress.approve(address(this), availableBalanceToWithdraw);
        bool success = registryStorage.usdContractAddress.transferFrom(address(this), recipient, availableBalanceToWithdraw);

        if (!success)
            revert WithdrawFailed();
    }

    /// @notice Checks if domain has been already registered
    /// @param domainName - The name of domain to check
    function isDomainRegistered(
        string memory domainName
    ) public view returns (bool) {
        return _getRegistryStorage().domainsMap[domainName] != address(0x0);
    }

    // @notice Returns actual eth price from feed with 18 decimals
    function _getLatestPrice() private view returns (uint256) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int256 price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = _getRegistryStorage().priceFeed.latestRoundData();

        // get priceFeed decimals
        RegistryStorage storage registryStorage = _getRegistryStorage();
        uint8 decimals = registryStorage.priceFeed.decimals();
        
        // return value * 10ˆ18
        return uint256(price) * 10 ** (18 - decimals);
    }

    /// @notice Applies reward to all the parent domains of the specified domain name if exist
    /// @param domainName - The name of domain to be processed
    function _tryRewardAllParentDomains(
        string memory domainName,
        RewardRegistry.Info storage rewardInfo
    ) private {
        strings.slice memory domainNameSlice = domainName.toSlice();
        strings.slice memory delimiter = ".".toSlice();

        // number entries of symbol '.' is equal to number of parent domains
        uint256 numParentDomains = domainNameSlice.count(delimiter);

        if (numParentDomains < 1) return;

        string memory parentDomainName = "";

        for (uint256 i = 0; i < numParentDomains; i++) {
            parentDomainName = string(abi.encodePacked(domainNameSlice.rsplit(delimiter).toString(), parentDomainName));

            if (!isDomainRegistered(parentDomainName))
                revert ParentDomainNameWasNotFound(parentDomainName);

            // apply reward for parent domain
            rewardInfo.applyFor(_getRegistryStorage().domainsMap[parentDomainName]);

            parentDomainName = string(abi.encodePacked(".", parentDomainName));
        }
    }

    /// @notice Updates reward in eth for ethRewardInfo.
    /// @dev Should be called right before use the ethRewardInfo.rewardValue
    function _updateHolderRewardEth() private {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        uint256 rewardEth = usd2Eth(registryStorage.usdRewardInfo.rewardValue);
        registryStorage.ethRewardInfo.rewardValue = rewardEth;
    }

    /// @notice Common function to register domain.
    /// @param domainName - name of domain to be registered
    /// @param rewardInfo - reward info to apply reward there
    function _registerDomainInternal(string memory domainName, RewardRegistry.Info storage rewardInfo) private {
        RegistryStorage storage registryStorage = _getRegistryStorage();
        _tryRewardAllParentDomains(domainName, rewardInfo);

        // register new domain name
        registryStorage.domainsMap[domainName] = payable(msg.sender);

        // send event
        emit DomainRegistered({
            indexedName: domainName,
            indexedDomainHolder: msg.sender,
            name: domainName,
            domainHolder: msg.sender,
            createdDate: block.timestamp
        });
    }

    /// @notice Sends 'amount' of ether to 'recipient'
    /// @param recipient - Recipient of the payment
    /// @param amount - amount of ether to send
    function payTo(
        address payable recipient,
        uint256 amount
    ) private returns (bool) {
        (bool success, ) = recipient.call{value: amount}("");
        return success;
    }
}
