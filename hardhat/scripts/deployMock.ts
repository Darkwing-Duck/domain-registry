import {ethers} from "hardhat";

export async function deployMock(){
    const priceFeed = await deployMockPriceFeed();
    const token = await deployMockToken();

    const priceFeedAddress = await priceFeed.getAddress();
    const tokenAddress = await token.getAddress();

    console.log("Mock price feed deployed with address: ", priceFeedAddress);
    console.log("Mock token deployed with address: ", tokenAddress);
    
    return {
        priceFeed,
        token
    }
}

async function deployMockToken() {
    const mockUSDCTokenFactory = await ethers.getContractFactory("MockUSDCToken")
    return mockUSDCTokenFactory.deploy();
}

async function deployMockPriceFeed() {
    const DECIMALS = "8"
    const INITIAL_PRICE = "308163834765"
    const mockV3AggregatorFactory = await ethers.getContractFactory("MockV3Aggregator")

    return mockV3AggregatorFactory.deploy(DECIMALS, INITIAL_PRICE);
}