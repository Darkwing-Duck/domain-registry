// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library DomainRegistryStorageLibrary {
    using DomainRegistryStorageLibrary for DomainRegistryData;
    
    struct DomainRegistryData {
        /// @notice Mapping of top-level domain name to domain holder address
        mapping(string => address payable) domainsMap;
    }

    error DomainIsAlreadyExist();

    function addDomain(DomainRegistryData registryStorage, string memory domainName, address payable domainHolder) internal {
        if (registryStorage.domainsMap[domainName] != address(0x0))
            revert DomainIsAlreadyExist();
        
        domainsMap[domainName] = domainHolder;
    }

    function hasDomain(DomainRegistryData registryStorage, string memory domainName) internal returns(bool) {
        return registryStorage.domainsMap[domainName] != address(0x0);
    }
    
}
