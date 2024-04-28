export function init() {
  return {
    connectButton: document.getElementById('connectButton'),
    currentAddress: document.getElementById('currentAddress'),
    ethDomainNameInput: document.getElementById('ethDomainNameInput'),
    usdDomainNameInput: document.getElementById('usdDomainNameInput'),
    usdRegisterButton: document.getElementById('usdRegisterButton'),
    ethRegisterButton: document.getElementById('ethRegisterButton'),
    ethPriceField: document.getElementById('ethPriceField'),
    usdPriceField: document.getElementById('usdPriceField'),
    claimEthRewardButton: document.getElementById('claimEthRewardButton'),
    claimUsdRewardButton: document.getElementById('claimUsdRewardButton'),
    resolveDomainNameInput: document.getElementById('resolveDomainNameInput'),
    resolveButton: document.getElementById('resolveButton'),
    domainHolderAddressLabel: document.getElementById('domainHolderAddressLabel'),
    rewardDomainHolderAddressInput: document.getElementById('rewardDomainHolderAddressInput'),
    checkRewardButton: document.getElementById('checkRewardButton'),
    holderEthRewardLabel: document.getElementById('holderEthRewardLabel'),
    holderUsdRewardLabel: document.getElementById('holderUsdRewardLabel'),
  }
}
