// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {strings} from "solidity-stringutils/src/strings.sol";

/// @author Serhii Smirnov
/// @title Describes a registry of all registered domain names linked to a domain holder,
/// who have registered the domain name
contract DomainRegistry is OwnableUpgradeable {
    using strings for *;

    /// @custom:storage-location erc7201:mycompanyname.storage.DomainRegistry
    struct RegistryStorage {
        /// @notice Price for registration sub-domains
        uint registrationPrice;
        /// @notice Mapping of top-level domain name to domain holder address
        mapping(string => address payable) domainsMap;
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
    /// @param name - The name of domain to check
    /// @param domainHolder - Domain holder of domain to check
    /// @param createdDate - The date when the domain was created
    event DomainRegistered(
        string indexed indexedName,
        address indexed indexedDomainHolder,
        string name,
        address domainHolder,
        uint createdDate
    );

    /// @notice Indicates that the domain name is already registered and unavailable
    error DomainIsAlreadyRegistered();

    /// @notice Indicates that the domain name was not registered
    error DomainWasNotRegistered();

    /// @notice Indicates that withdraw was failed
    error WithdrawFailed();

    /// @notice Indicates that amount of money passed is not enough to register the domain name
    error PaymentForRegisteringDomainFailed(string message);

    /// @dev Used instead of constructor due to use upgradeable contract approach
    function initialize(
        address owner_,
        uint registrationPrice_
    ) public initializer {
        __Ownable_init(owner_);
        _getRegistryStorage().registrationPrice = registrationPrice_;
    }

    receive() external payable {}
    fallback() external payable {}

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

    /// @notice Checks if domain has been already registered
    /// @param domainName - The name of domain to check
    function isDomainRegistered(
        string memory domainName
    ) public view returns (bool) {
        return _getRegistryStorage().domainsMap[domainName] != address(0x0);
    }

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

    /// @notice Resolves domain entry by the name
    /// @param domainName - The name of domain to be resolved
    function findDomainHolderBy(
        string memory domainName
    ) external view onlyRegisteredDomain(domainName) returns (address) {
        return _getRegistryStorage().domainsMap[domainName];
    }

    /// @notice Changes price for domain registration
    function changeRegistrationPrice(uint toValue) external onlyOwner {
        _getRegistryStorage().registrationPrice = toValue;
    }

    /// @notice Withdraws all the balance to the owner's address
    function withdraw() external onlyOwner {
        if (!payTo(payable(owner()), address(this).balance))
            revert WithdrawFailed();
    }

    /// @notice Returns actual price for a domain registration
    function registrationPrice() external view returns (uint256) {
        return _getRegistryStorage().registrationPrice;
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
