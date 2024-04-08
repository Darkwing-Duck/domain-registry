// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "solidity-stringutils/src/strings.sol";
import "hardhat/console.sol";

/// @author Serhii Smirnov
/// @title Describes a registry of all registered domain names linked to a domain holder, who have registered the domain name
contract DomainRegistryV2 is OwnableUpgradeable {
    using strings for *;

    /// @custom:storage-location erc7201:mycompanyname.storage.DomainRegistry
    struct RegistryStorage {
        /// @notice Price for registration sub-domains 
        uint registrationPrice;

        /// @notice Mapping of domain name to domain holder address
        mapping(string => address payable) domainsMap;

        /// @notice Parent domain holder's reward for sub domain registration
        uint holderRegistrationReward;

        /// @notice Describes the total rewards balance that all domain holders have together
        /// @dev using to calculate how much the owner can withdraw
        uint totalRewardsBalance;

        /// @notice Balances of each registered domain
        mapping(string => uint256) domainBalances;
    }

    // keccak256(abi.encode(uint256(keccak256("mycompanyname.storage.DomainRegistry")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant RegistryStorageLocation = 0x95137cbd5b999a2a07f15c64ecb41442a54817dd1810d04f8ff3a7e325fb5100;

    /// @dev the way to get access to registry storage 
    function _getRegistryStorage() private pure returns (RegistryStorage storage $) {
        assembly {
            $.slot := RegistryStorageLocation
        }
    }

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

    /// @notice Indicates that while registering sub-domain name the parent domain name doesn't exist.
    error ParentDomainNameWasNotFound(string parentDomainName);

    /// @notice Indicates that withdraw reward was failed
    error WithdrawRewardFailed(string domainName);

    /// @notice Indicates that nothing to withdraw
    error NothingToWithdraw();


    /// @dev Used instead of constructor due to use upgradeable contract approach
    function initialize(address owner_, uint registrationPrice_) initializer public {
        __Ownable_init(owner_);
        _getRegistryStorage().registrationPrice = registrationPrice_;
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

    /// @notice Checks if domain has been already registered
    /// @param domainName - The name of domain to check
    function isDomainRegistered(string memory domainName)
        public
        view
        returns (bool)
    {
        return _getRegistryStorage().domainsMap[domainName] != address(0x0);
    }

    /// @notice Registers passed domain name and sends the event to outside world
    /// @param domainName - The name of domain to be registered
    function registerDomain(string memory domainName)
        payable
        external
        availableDomain(domainName)
    {
        RegistryStorage storage $ = _getRegistryStorage();

        if (msg.value < $.registrationPrice)
            revert PaymentForRegisteringDomainFailed("Not enough ether to register the domain");

        // excess refunding mechanism
        if (msg.value > $.registrationPrice){
            uint256 excess = msg.value - $.registrationPrice;

            if (!payTo(payable(msg.sender), excess))
                revert PaymentForRegisteringDomainFailed("The overpayment was detected, but refunding the excess was not succeed");
        }

        // get domain name parts
        strings.slice memory domainNameSlice = domainName.toSlice();
        strings.slice memory delimiter = ".".toSlice();
        string[] memory parts = new string[](domainNameSlice.count(delimiter) + 1);
        
        for(uint i = 0; i < parts.length; i++) {
            parts[i] = domainNameSlice.split(delimiter).toString();
        }

        string memory parentDomainName = "";
        
        // go backward through the full domain name parts
        // and note that we don't need to process the final new sub-domain name
        for(uint i = parts.length; i > 1; i--) {
            parentDomainName = string.concat(parts[i - 1], parentDomainName);

            if (!isDomainRegistered(parentDomainName)) 
                revert ParentDomainNameWasNotFound(parentDomainName);

            // add reward for parent domain
            $.domainBalances[parentDomainName] += $.holderRegistrationReward;
            $.totalRewardsBalance += $.holderRegistrationReward;

            parentDomainName = string.concat(".", parentDomainName);
        }

        // register new domain name
        $.domainsMap[domainName] = payable(msg.sender);

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
        return _getRegistryStorage().domainsMap[domainName];
    }

    /// @notice Changes price for domain registration
    function changeRegistrationPrice(uint toValue) external onlyOwner {
        _getRegistryStorage().registrationPrice = toValue;
    }

    /// @notice Changes reward for domain's holder when registering new sub-domain
    function changeDomainHolderReward(uint toValue) external onlyOwner {
        _getRegistryStorage().holderRegistrationReward = toValue;
    }

    /// @notice Withdraws all the balance to the owner's address 
    function withdraw() external onlyOwner {
        uint256 availableBalanceToWithdraw = address(this).balance - _getRegistryStorage().totalRewardsBalance;

        if (availableBalanceToWithdraw == 0)
            revert NothingToWithdraw();
        
        if (!payTo(payable(owner()), availableBalanceToWithdraw))
            revert WithdrawFailed();
    }

    /// @notice Withdraws reward for specified domain name
    function withdrawRewardFor(string memory domainName) 
        external 
        onlyOwner
        onlyRegisteredDomain(domainName)
    {
        RegistryStorage storage $ = _getRegistryStorage();
        address payable domainHolder = $.domainsMap[domainName]; 
        uint256 rewardBalance = $.domainBalances[domainName];
        
        if (rewardBalance == 0)
            revert NothingToWithdraw();

        $.domainBalances[domainName] = 0;
        $.totalRewardsBalance -= rewardBalance;
        
        if (!payTo(domainHolder, rewardBalance))
            revert WithdrawRewardFailed(domainName);
    }

    /// @notice Returns actual price for a domain registration
    function registrationPrice() external view returns (uint256) {
        return _getRegistryStorage().registrationPrice;
    }

    /// @notice Returns actual domain's holder reward for a domain registration
    function domainHolderReward() external view returns (uint256) {
        return _getRegistryStorage().holderRegistrationReward;
    }

    /// @notice Returns reward balance of domain's holder
    function getDomainHolderBalance(string memory domainName) external view returns (uint256) {
        return _getRegistryStorage().domainBalances[domainName];
    }

    /// @notice Returns total reward balance of all domain names
    function getTotalRewardBalance() external view returns (uint256) {
        return _getRegistryStorage().totalRewardsBalance;
    }

    /// @notice Sends 'amount' of ether to 'recipient' 
    /// @param recipient - Recipient of the payment
    /// @param amount - amount of ether to send
    function payTo(address payable recipient, uint256 amount) private returns (bool) {
        (bool success,) = recipient.call{value: amount}("");
        return success;
    }
}
