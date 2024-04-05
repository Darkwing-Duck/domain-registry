// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "solidity-stringutils/src/strings.sol";
import {Ownable} from "./Ownable.sol";

/// @author Serhii Smirnov
/// @title Describes a registry of all registered domain names linked to a domain holder, who have registered the domain name
contract DomainRegistry is Ownable {
    using strings for *;

    /// @notice Price for registration sub-domains 
    uint public registrationPrice;

    /// @notice Mapping of top-level domain name to domain holder address
    mapping(string => address payable) public domainsMap;

    
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
        uint createdDate);


    /// @notice Indicates that the domain name is already registered and unavailable
    error DomainIsAlreadyRegistered();

    /// @notice Indicates that the domain name was not registered
    error DomainWasNotRegistered();

    /// @notice Indicates that withdraw was failed
    error WithdrawFailed();

    /// @notice Indicates that amount of money passed is not enough to register the domain name
    error PaymentForRegisteringDomainFailed(string message);

    /// @notice Indicates that the passed domain name is unsupported with an error message
    error UnsupportedDomainName(string message);
    
    
    constructor(address payable owner_, uint registrationPrice_) Ownable(owner_) {
        registrationPrice = registrationPrice_;
    }

    receive() external payable { }
    fallback() external payable { }

    /// @notice Guarantees that only available domains can be passed to a method with the modifier
    modifier availableDomain(string memory domain) {
        if (isDomainRegistered(domain))
            revert DomainIsAlreadyRegistered();
        _;
    }

    /// @notice Guarantees that only registered domains can be passed to a method with the modifier
    modifier onlyRegisteredDomain(string memory domain) {
        if (!isDomainRegistered(domain))
            revert DomainWasNotRegistered();
        _;
    }

    // @notice Guarantees that only supported domain names can be passed to a method with the modifier
    modifier onlySupportedDomain(string memory domain) {
        bool containsDot = domain.toSlice().contains(".".toSlice());

        if (containsDot)
            revert UnsupportedDomainName("Currently only top level domain names are supported ('com', 'net', ...).");
        _;
    }

    /// @notice Checks if domain has been already registered
    /// @param domainName - The name of domain to check
    function isDomainRegistered(string memory domainName)
        public
        view
        returns (bool)
    {
        return domainsMap[domainName] != address(0x0);
    }

    function registerDomain(string memory domainName)
        payable
        external
        availableDomain(domainName)
        onlySupportedDomain(domainName)
    {
        if (msg.value < registrationPrice)
            revert PaymentForRegisteringDomainFailed("Not enough ether to register the domain");

        // excess refunding mechanism
        if (msg.value > registrationPrice){
            uint256 excess = msg.value - registrationPrice;

            if (!payTo(payable(msg.sender), excess))
                revert PaymentForRegisteringDomainFailed("The overpayment was detected, but refunding the excess was not succeed");
        }

        // register new domain name
        domainsMap[domainName] = payable(msg.sender);

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
    function findDomainHolderBy(string memory domainName)
        external
        view
        onlyRegisteredDomain(domainName)
        returns (address)
    {
        return domainsMap[domainName];
    }

    /// @notice Changes price for domain registration
    function changeRegistrationPrice(uint toValue) external onlyOwner {
        registrationPrice = toValue;
    }

    /// @notice Withdraws all the balance to the owner's address 
    function withdraw() external onlyOwner {
        if (!payTo(owner, address(this).balance))
            revert WithdrawFailed();
    }

    /// @notice Sends 'amount' of ether to 'recipient' 
    /// @param recipient - Recipient of the payment
    /// @param amount - amount of ether to send
    function payTo(address payable recipient, uint256 amount) private returns (bool) {
        (bool success,) = recipient.call{value: amount}("");
        return success;
    }
}
