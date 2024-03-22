// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @author Serhii Smirnov
/// @title Describes a contract that has some methods to be called only by owner of the contract
contract Ownable {

    /// @notice Owner of the domain registry system
    address payable public owner;

    /// @notice Indicates that the sender is not an owner of the contract 
    error UnauthorizedAccount();
    
    constructor(address payable _owner){
        owner = _owner;
    }

    /// @notice Guarantees that only owner can call a method with the modifier
    modifier onlyOwner() {
        if (msg.sender != owner)
            revert UnauthorizedAccount();
        _;
    }
}
