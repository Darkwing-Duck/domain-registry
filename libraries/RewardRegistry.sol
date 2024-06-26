// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

library RewardRegistry {

    /// @author Serhii Smirnov
    /// @title Describes all the information regarding domain rewards
    struct Info {
        /// @notice Parent domain holder's reward for sub domain registration
        uint holderRegistrationReward;

        /// @notice Describes the total rewards balance that all domain holders have together
        /// @dev using to calculate how much the owner can withdraw
        uint totalRewardsBalance;

        /// @notice Balances of each registered domain
        mapping(string => uint256) domainBalances;
    }

    /// @notice Returns reward balance of domain's holder
    function getDomainRewardBalance(Info storage rewardRegistry, string memory domainName) 
        internal 
        view 
        returns (uint256) 
    {
        return rewardRegistry.domainBalances[domainName];
    }

    /// @notice Applies reward to specified domain name
    function applyFor(Info storage rewardRegistry, string memory domainName)
        internal
        returns (uint256)
    {
        rewardRegistry.domainBalances[domainName] += rewardRegistry.holderRegistrationReward;
        rewardRegistry.totalRewardsBalance += rewardRegistry.holderRegistrationReward;
        return rewardRegistry.holderRegistrationReward;
    }

    /// @notice Resets reward for specified domain name
    function resetFor(Info storage rewardRegistry, string memory domainName)
        internal
    {
        rewardRegistry.totalRewardsBalance -= rewardRegistry.domainBalances[domainName];
        rewardRegistry.domainBalances[domainName] = 0;
    }
}
