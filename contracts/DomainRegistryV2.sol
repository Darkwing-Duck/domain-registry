// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {strings} from "solidity-stringutils/src/strings.sol";
import {RewardRegistry} from "../libraries/RewardRegistry.sol";

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
        RewardRegistry.Info rewardInfo;
    }

    // keccak256(abi.encode(uint256(keccak256("mycompanyname.storage.DomainRegistry")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REGISTRY_STORAGE_LOCATION =
        0x95137cbd5b999a2a07f15c64ecb41442a54817dd1810d04f8ff3a7e325fb5100;

    /// @dev the way to get access to registry storage
    function _getRegistryStorage()
        private
        pure
        returns (RegistryStorage storage $)
    {
        assembly {
            $.slot := REGISTRY_STORAGE_LOCATION
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

    /// @notice Event that is notifying external world about applying reward to a parent node
    /// @param indexedDomainName - Indexed name of domain who gain the reward
    /// @param indexedDomainHolder - Indexed domain holder to simplify filtering events by the holder
    /// @param domainName - The name of domain who gain the reward
    /// @param domainHolder - Domain holder of domain
    /// @param rewardValue - Reward value that was applied to the domain
    /// @param rewardBalance - Reward balance for the domain after reward was applied
    event RewardApplied(
        string indexed indexedDomainName,
        address indexed indexedDomainHolder,
        string domainName,
        address domainHolder,
        uint256 rewardValue,
        uint256 rewardBalance
    );

    /// @notice Event that is notifying external world about applying reward to a parent node
    /// @param indexedDomainName - Indexed name of domain who withdraw the reward
    /// @param indexedDomainHolder - Indexed domain holder to simplify filtering events by the holder
    /// @param domainName - The name of domain who withdraw the reward
    /// @param domainHolder - Domain holder of domain
    /// @param withdrawValue - Value that was withdrawed to the domain holder
    event RewardWithdrawed(
        string indexed indexedDomainName,
        address indexed indexedDomainHolder,
        string domainName,
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
    error WithdrawRewardFailed(string domainName);

    /// @notice Indicates that nothing to withdraw
    error NothingToWithdraw();

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

    /// @dev Used instead of constructor due to use upgradeable contract approach
    function initialize(
        address owner_,
        uint256 registrationPrice_
    ) public initializer {
        __Ownable_init(owner_);
        _getRegistryStorage().registrationPrice = registrationPrice_;
    }

    receive() external payable {}
    fallback() external payable {}

    /// @notice Registers passed domain name and sends the event to outside world
    /// @param domainName - The name of domain to be registered
    function registerDomain(
        string memory domainName
    ) external payable availableDomain(domainName) {
        RegistryStorage storage $ = _getRegistryStorage();

        if (msg.value < $.registrationPrice)
            revert PaymentForRegisteringDomainFailed(
                "Not enough ether to register the domain"
            );

        // excess refunding mechanism
        if (msg.value > $.registrationPrice) {
            uint256 excess = msg.value - $.registrationPrice;

            if (!payTo(payable(msg.sender), excess))
                revert PaymentForRegisteringDomainFailed(
                    "The overpayment was detected, but refunding the excess was not succeed"
                );
        }

        tryRewardAllParentDomains(domainName, $);

        // register new domain name
        $.domainsMap[domainName] = payable(msg.sender);

        // send event
        emit DomainRegistered({
            indexedName: domainName,
            indexedDomainHolder: msg.sender,
            name: domainName,
            domainHolder: msg.sender,
            createdDate: block.timestamp
        });
    }

    /// @notice Changes price for domain registration
    function changeRegistrationPrice(uint256 toValue) external onlyOwner {
        _getRegistryStorage().registrationPrice = toValue;
    }

    /// @notice Changes reward for domain's holder when registering new sub-domain
    function changeDomainHolderReward(uint256 toValue) external onlyOwner {
        _getRegistryStorage().rewardInfo.holderRegistrationReward = toValue;
    }

    /// @notice Withdraws all the balance to the owner's address
    function withdraw() external onlyOwner {
        uint256 availableBalanceToWithdraw = address(this).balance -
            _getRegistryStorage().rewardInfo.totalRewardsBalance;

        if (availableBalanceToWithdraw == 0) revert NothingToWithdraw();

        if (!payTo(payable(owner()), availableBalanceToWithdraw))
            revert WithdrawFailed();
    }

    /// @notice Withdraws reward for specified domain name
    function withdrawRewardFor(
        string memory domainName
    ) external onlyOwner onlyRegisteredDomain(domainName) {
        RegistryStorage storage $ = _getRegistryStorage();
        address payable domainHolder = $.domainsMap[domainName];
        uint256 rewardBalance = $.rewardInfo.getDomainRewardBalance(domainName);

        if (rewardBalance == 0) revert NothingToWithdraw();

        // reset domain reward balance
        $.rewardInfo.resetFor(domainName);

        if (!payTo(domainHolder, rewardBalance))
            revert WithdrawRewardFailed(domainName);

        // fire event
        emit RewardWithdrawed({
            indexedDomainName: domainName,
            indexedDomainHolder: domainHolder,
            domainName: domainName,
            domainHolder: domainHolder,
            withdrawValue: rewardBalance
        });
    }

    /// @notice Resolves domain entry by the name
    /// @param domainName - The name of domain to be resolved
    function findDomainHolderBy(
        string memory domainName
    ) external view onlyRegisteredDomain(domainName) returns (address) {
        return _getRegistryStorage().domainsMap[domainName];
    }

    /// @notice Returns actual price for a domain registration
    function registrationPrice() external view returns (uint256) {
        return _getRegistryStorage().registrationPrice;
    }

    /// @notice Returns actual domain's holder reward for a domain registration
    function domainHolderReward() external view returns (uint256) {
        return _getRegistryStorage().rewardInfo.holderRegistrationReward;
    }

    /// @notice Returns reward balance of domain's holder
    function getDomainRewardBalance(
        string memory domainName
    ) external view returns (uint256) {
        return
            _getRegistryStorage().rewardInfo.getDomainRewardBalance(domainName);
    }

    /// @notice Returns total reward balance of all domain names
    function getTotalRewardBalance() external view returns (uint256) {
        return _getRegistryStorage().rewardInfo.totalRewardsBalance;
    }

    /// @notice Checks if domain has been already registered
    /// @param domainName - The name of domain to check
    function isDomainRegistered(
        string memory domainName
    ) public view returns (bool) {
        return _getRegistryStorage().domainsMap[domainName] != address(0x0);
    }

    /// @notice Applies reward to all the parent domains of the specified domain name if exist
    /// @param domainName - The name of domain to be processed
    function tryRewardAllParentDomains(
        string memory domainName,
        RegistryStorage storage $
    ) private {
        strings.slice memory domainNameSlice = domainName.toSlice();
        strings.slice memory delimiter = ".".toSlice();

        // number entries of symbol '.' is equal to number of parent domains
        uint256 numParentDomains = domainNameSlice.count(delimiter);

        if (numParentDomains < 1) return;

        string memory parentDomainName = "";

        for (uint256 i = 0; i < numParentDomains; i++) {
            parentDomainName = domainNameSlice.rsplit(delimiter).toString();

            if (!isDomainRegistered(parentDomainName))
                revert ParentDomainNameWasNotFound(parentDomainName);

            // apply reward for parent domain
            uint256 appliedReward = $.rewardInfo.applyFor(parentDomainName);

            address domainHolderAddress = $.domainsMap[parentDomainName];

            // fire event
            emit RewardApplied({
                indexedDomainName: parentDomainName,
                indexedDomainHolder: domainHolderAddress,
                domainName: parentDomainName,
                domainHolder: domainHolderAddress,
                rewardValue: appliedReward,
                rewardBalance: $.rewardInfo.getDomainRewardBalance(
                    parentDomainName
                )
            });
        }
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
