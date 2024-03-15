// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol";
import "solidity-stringutils/src/strings.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @author Serhii Smirnov
/// @title 
interface IRegisterDomainNotifier {
    event DomainRegistered(string name, address indexed owner);
}

/// @author Serhii Smirnov
/// @title 
contract DomainRegistryFactory is IRegisterDomainNotifier {
    function create(string memory name, address payable owner, address payable domainHolder) public returns (DomainRegistry registry) {
        DomainRegistry newDomainRegistry = new DomainRegistry(name, owner, domainHolder, this);
        emit DomainRegistered(name, owner);
        return newDomainRegistry;
    }
}

/// @author Serhii Smirnov
/// @title Describes single-level domain registry with the possibility to have sub-domains 
contract DomainRegistry is IRegisterDomainNotifier {

    /// @notice using library to manipulate strings (split ..)
    using strings for *;

    /// @notice using library to convert uint to string
    using Strings for *;

    /// @notice Indicates that the sender is not an owner of the contract 
    error UnauthorizedAccount();

    /// @notice Indicates that the domain name is already registered and unavailable
    error DomainIsAlreadyRegistered();

    /// @notice Indicates that withdraw was failed
    error WithdrawFailed();

    /// @notice Indicates that amount of money passed is not enough to register the domain name
    error PaymentForRegisteringDomainFailed(string message);

    /// @notice Indicates that the passed domain name is invalid with an error message
    error InvalidDomainName(string message);

    /// @notice Indicates that the passed domain name is unsupported with an error message
    error UnsupportedDomainName(string message);


    /// @notice Domain name of the registry
    string public name;

    /// @notice Owner of the domain registry system
    address payable public owner;

    /// @notice Holder of the domain name 'name'
    address payable public domainHolder;

    /// @notice Domain name of the registry
    uint public domainRegistrationPrice = 1 ether;

    /// @notice Minimum length of domain name
    uint public constant minDomainNameLength = 2;

    /// @notice Maximum length of domain name
    uint public constant maxDomainNameLength = 12;

    /// @notice Maps one-level domain name to corresponding registry
    mapping(string => DomainRegistry) public domainsMap;

    /// @notice Factory to create registries
    DomainRegistryFactory private factory;
    
    constructor(string memory _name, address payable _owner, address payable _domainHolder, DomainRegistryFactory _factory) {
        name = _name;
        owner = _owner;
        domainHolder = _domainHolder;
        factory = _factory;
    }

    receive() external payable { }
    fallback() external payable { }

    /// @notice Guarantees that only valid domain names can be passed to a method with the modifier
    modifier validDomain(string memory domain) {
        if (!isDomainValid(domain)) {
            string memory error = string.concat("The length of domain should be in range [", minDomainNameLength.toString(), ", ", maxDomainNameLength.toString(), "].");
            revert InvalidDomainName(error);
        }
        
        _;
    }

    /// @notice Guarantees that only available domains can be passed to a method with the modifier
    modifier availableDomain(string memory domain) {
        if (!isDomainAvailable(domain))
            revert DomainIsAlreadyRegistered();
        _;
    }

    /// @notice Guarantees that only supported domain names can be passed to a method with the modifier
    modifier onlySupportedDomain(string memory domain) {
        bool containsDot = domain.toSlice().contains(".".toSlice());

        if (containsDot)
            revert UnsupportedDomainName("Currently only top level domain names are supported ('com', 'net', ...).");
        _;
    }

    /// @notice Guarantees that only owner can call a method with the modifier
    modifier onlyOwner() {
        if (msg.sender != owner) 
            revert UnauthorizedAccount();
        _;
    }

    /// @notice Checks if the length of domain name is in allowance bounds 
    /// @param domain - The name of domain to check
    function isDomainValid(string memory domain) public pure returns (bool) {
        bytes memory domainBytes = bytes(domain);
        
        if (domainBytes.length < minDomainNameLength)
            return false;
        
        return domainBytes.length <= maxDomainNameLength;
    }

    /// @notice Checks if domain available to be registered or not
    /// @param domain - The name of domain to check
    function isDomainAvailable(string memory domain)
        public 
        view 
        validDomain(domain)
        onlySupportedDomain(domain)
        returns (bool) 
    {
        return address(domainsMap[domain]) == address(0);
    }

    /// @notice Registers new one-level domain name
    /// @param domain - The name of domain to be registered
    function registerDomain(string memory domain)
        payable 
        public 
        validDomain(domain) 
        onlySupportedDomain(domain) 
        availableDomain(domain) 
        returns (DomainRegistry)
    {
        if (msg.value < domainRegistrationPrice)
            revert PaymentForRegisteringDomainFailed("Not enough ether to register the domain");
        
        // excess refunding mechanism
        if (msg.value > domainRegistrationPrice){
            uint256 excess = msg.value - domainRegistrationPrice;
            
            if (!payTo(payable(msg.sender), excess))
                revert PaymentForRegisteringDomainFailed("The overpayment was detected, but refunding the excess was not succeed");
        }
        
        // create sub-domain registry
        domainsMap[domain] = factory.create({
            name: domain,
            owner: payable(this),
            domainHolder: payable(msg.sender)
        });
        
        emit DomainRegistered(domain, msg.sender);
        return domainsMap[domain];
    }

    /// @notice Withdraws all the balance to the owner's address 
    function withdraw() public onlyOwner {
        if (!payTo(payable(owner), address(this).balance))
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
