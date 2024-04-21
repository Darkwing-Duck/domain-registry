// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDCToken is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") public {
        _mint(msg.sender, 1000000000 * (10 ** uint256(decimals())));
    }
}