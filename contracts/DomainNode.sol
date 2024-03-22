// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol";
import "solidity-stringutils/src/strings.sol";
import {Ownable} from "./Ownable.sol";
import {IDomainNodeFactory} from "./DomainNodeFactory.sol";

/// @author Serhii Smirnov
/// @title Describes a controller of a domain level with the possibility to have sub-domains 
contract DomainNode is Ownable {
    using strings for *;
    
    /// @notice Domain name of the registry
    string public name;

    /// @notice Holder of the domain name 'name'
    address payable public domainHolder;

    /// @notice Address of a parent node that created this node
    address payable public parentNode;

    /// @notice Price for registration sub-domains 
    uint public registrationPrice;

    /// @notice Maps one-level domain name to corresponding registry
    mapping(string => DomainNode) public domainsMap;

    /// @notice Factory to create sub-domains
    IDomainNodeFactory private factory;
    
    
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
    
    
    constructor(
        string memory _name,
        address payable _owner,
        address payable _domainHolder,
        address payable _parentNode,
        uint _registrationPrice,
        IDomainNodeFactory _factory
    )
        Ownable(_owner)
    {
        name = _name;
        domainHolder = _domainHolder;
        registrationPrice = _registrationPrice;
        parentNode = _parentNode;
        factory = _factory;
    }

    receive() external payable { }
    fallback() external payable { }

    /// @notice Guarantees that only available domains can be passed to a method with the modifier
    modifier availableDomain(string memory domain) {
        if (isDomainRegistered(domain))
            revert DomainIsAlreadyRegistered();
        _;
    }

    /// @notice Guarantees that only available domains can be passed to a method with the modifier
    modifier existDomain(string memory domain) {
        if (!isDomainRegistered(domain))
            revert DomainWasNotRegistered();
        _;
    }

    /// @notice Guarantees that only supported domain names can be passed to a method with the modifier
    modifier onlySupportedDomain(string memory domain) {
        bool containsDot = domain.toSlice().contains(".".toSlice());

        if (containsDot)
            revert UnsupportedDomainName("Currently only top level domain names are supported ('com', 'net', ...).");
        _;
    }

    /// @notice Checks if domain available to be registered or not
    /// @param domainName - The name of domain to check
    function isDomainRegistered(string memory domainName)
        public 
        view
        returns (bool) 
    {
        return address(domainsMap[domainName]) != address(0);
    }

    /// @notice Registers new one-level domain name
    /// @param domainName - The name of domain to be registered
    function registerDomain(string memory domainName)
        payable 
        external
        availableDomain(domainName)
        onlySupportedDomain(domainName)
        returns (DomainNode)
    {
        if (msg.value < registrationPrice)
            revert PaymentForRegisteringDomainFailed("Not enough ether to register the domain");
        
        // excess refunding mechanism
        if (msg.value > registrationPrice){
            uint256 excess = msg.value - registrationPrice;
            
            if (!payTo(payable(msg.sender), excess))
                revert PaymentForRegisteringDomainFailed("The overpayment was detected, but refunding the excess was not succeed");
        }
        
        // create sub-domain registry
        DomainNode newNode = factory.create({
            _name: domainName,
            _owner: payable(owner),
            _domainHolder: payable(msg.sender),
            _parentNode: payable(this),
            _registrationPrice: registrationPrice
        });

        domainsMap[domainName] = newNode;
        
        return newNode;
    }

    /// @notice Resolves domain node by the name
    /// @param domainName - The name of domain to be resolved
    function getDomainNode(string memory domainName) 
        external 
        view
        existDomain(domainName)
        returns (DomainNode)
    {
        return domainsMap[domainName];
    }

    /// @notice Changes price for sub-domains registration
    function changeRegistrationPrice(uint toValue) external onlyOwner {
        registrationPrice = toValue;
    }

    /// @notice Withdraws all the balance to the owner's address 
    function withdraw() external onlyOwner {
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
