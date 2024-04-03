// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DomainRegistry} from "./DomainRegistry.sol";

interface IDomainRegistryFactory {
    function create(
        address payable owner,
        uint registrationPrice
    ) 
        external 
        returns (DomainRegistry registry);
}

/// @author Serhii Smirnov
/// @title Factory of the domain node
/// @dev Using salt value passed from outside
contract DomainRegistryFactory is IDomainRegistryFactory {

    bytes32 private salt;

    constructor(bytes32 salt_) {
        salt = salt_;
    }

    function create(
        address payable owner,
        uint registrationPrice
    ) public virtual returns (DomainRegistry registry) {
        return new DomainRegistry{salt: salt}(owner, registrationPrice);
    }

    function predictAddress(address payable owner_, uint registrationPrice_)
        external
        view
        returns (address)
    {
        bytes memory bytecode = abi.encodePacked(
            type(DomainRegistry).creationCode,
            abi.encode(owner_, registrationPrice_)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode))
        );

        // NOTE: cast last 20 bytes of hash to address
        return address(uint160(uint(hash)));
    }
}
