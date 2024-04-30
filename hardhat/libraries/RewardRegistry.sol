// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

library RewardRegistry {

    /// @author Serhii Smirnov
    /// @title Describes all the information regarding domain rewards
    struct Info {
        /// @notice Parent domain holder's reward for sub domain registration
        uint rewardValue;

        /// @notice Describes the total rewards balance that all domain holders have together
        /// @dev using to calculate how much the owner can withdraw
        uint totalRewardsBalance;
        
        /// @notice Balances of domain holders
        mapping(address => uint256) holderBalances;
    }

    /// @notice Returns reward balance of domain's holder
    function getDomainHolderRewardBalance(Info storage rewardRegistry, address domainHolder) 
        internal 
        view 
        returns (uint256) 
    {
        return rewardRegistry.holderBalances[domainHolder];
    }

    /// @notice Applies reward to specified domain name
    function applyFor(Info storage rewardRegistry, address domainHolder)
        internal
    {
        rewardRegistry.holderBalances[domainHolder] += rewardRegistry.rewardValue;
        rewardRegistry.totalRewardsBalance += rewardRegistry.rewardValue;
    }

    /// @notice Resets reward for specified domain name
    function resetFor(Info storage rewardRegistry, address domainHolder)
        internal
    {
        rewardRegistry.totalRewardsBalance -= rewardRegistry.holderBalances[domainHolder];
        rewardRegistry.holderBalances[domainHolder] = 0;
    }
}
