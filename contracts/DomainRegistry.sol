// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DomainNodeFactory} from "./DomainNodeFactory.sol";
import {DomainNode} from "./DomainNode.sol";

/// @author Serhii Smirnov
/// @title Describes root node of domain names
/// @notice It is sending all the events and used as a factory to create new domain nodes 
contract DomainRegistry is DomainNode, DomainNodeFactory {

    event DomainCreated(
        string indexed indexedName,
        address indexed indexedParentNode,
        string name,
        address domainHolder,
        address domainNode,
        address parentNode,
        uint createdDate);
    
    constructor(uint registrationPrice, bytes32 salt)
        DomainNodeFactory(salt)
        DomainNode("", payable(msg.sender), payable(msg.sender), payable(this), registrationPrice, this)
    { }
    
    /// @notice Creates new domain node base on the incom information and fires event
    /// @dev override factory method to add logging
    function create(
        string memory _name,
        address payable _owner,
        address payable _domainHolder,
        address payable _parentNode,
        uint _registrationPrice
    ) public override returns (DomainNode registry) {
        DomainNode newDomainNode = super.create(_name, _owner, _domainHolder, _parentNode, _registrationPrice);

        // send event
        emit DomainCreated({
            indexedName: _name,
            indexedParentNode: _parentNode,
            name: _name,
            domainHolder: _domainHolder,
            domainNode: address(newDomainNode),
            parentNode: _parentNode,
            createdDate: block.timestamp
        });
        
        return newDomainNode;
    }
}
