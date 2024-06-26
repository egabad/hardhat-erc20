import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      blockGasLimit: 1099511627775,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [process.env.PRIVATE_KEY ?? "key"],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? "key",
  },
  sourcify: {
    enabled: false
  },
};

export default config;
