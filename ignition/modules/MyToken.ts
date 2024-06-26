import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";
import "dotenv/config";

const MyTokenModule = buildModule("MyTokenModule", (m) => {
  const privateKey = process.env.PRIVATE_KEY ?? null;
  if (!privateKey) {
    throw new Error("Please set the deployer PRIVATE_KEY in a .env file");
  }
  
  const deployerWallet = new ethers.Wallet(privateKey);
  const initialOwner = deployerWallet.address;

  const token = m.contract("MyToken", [initialOwner]);

  return { token };
});

export default MyTokenModule;
