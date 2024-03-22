// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DomainNode} from "./DomainNode.sol";

interface IDomainNodeFactory {
    function create(
        string memory _name, 
        address payable _owner,
        address payable _domainHolder,
        address payable _parentNode,
        uint _registrationPrice
    ) 
        external 
        returns (DomainNode registry);
}

/// @author Serhii Smirnov
/// @title Factory of the domain node
/// @dev Using salt value passed from outside
contract DomainNodeFactory is IDomainNodeFactory {

    bytes32 private salt;

    constructor(bytes32 _salt) {
        salt = _salt;
    }

    function create(
        string memory _name, 
        address payable _owner, 
        address payable _domainHolder,
        address payable _parentNode,
        uint _registrationPrice
    ) public virtual returns (DomainNode registry) {
        DomainNode newDomainNode = new DomainNode{salt: salt}(_name, _owner, _domainHolder, _parentNode, _registrationPrice, this);
        return newDomainNode;
    }
}
