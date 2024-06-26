# ERC-20 Boilerplate

## Overview
This repository contains a TypeScript-based starter code with 100% test coverage that utilizes Hardhat for development, testing and deployment of an ERC-20 token smart contract. The token template is provided by OpenZeppelin Wizard with the following configuration and features:

1. Token name and symbol: "MyToken" / "MTK"
2. Consturctor parameter: Initial owner (`initialOwner`)
3. Access control: The contract uses an "ownable" pattern, which means there is a single account (owner) that has special permissions like pausing, minting, or burning tokens.
  - The `initialOwner` parameter is assigned as the owner of the contract upon deployment.
4. Mintable: Privileged accounts can create new tokens, increasing the overall supply.
  - 10m tokens are preminted to the initial owner upon deployment.
5. Burnable: Token holders can destroy (burn) their tokens, reducing the overall supply.
6. Pausable: Privileged accounts can pause the contract functionality in case of emergencies. 
7. Not Upgradeable: The contract is not designed to be upgradeable, meaning its code cannot be changed post-deployment. 
8. License: The code is licensed under the MIT License.

## Requirements
To set up and run this project, you will need:
- Node.js (version 18 or higher recommended)
- npm (typically included with Node.js)

## Installation
1. Clone the repository to your local machine.
  ```
  git clone <repository-url>
  ```
2. Navigate to the cloned directory.
  ```
  cd <repository-name>
  ```
3. Install the required npm packages.
  ```
  npm install
  ```

## Configuration
Create a `.env` file from `.env.sample`. Change the variable values as needed.

## Commands
Below are npm scripts you can use that uses Hardhat under the hood:
- `npm run node`: Spin up a Hardhat Network. To use this network for deployments, add `-- --network localhost` to the command.
- `npm run test`: Run tests in `test` directory. Default in-process instance of Hardhat network will be used.
- `npm run test-gas`: Run tests with gas reporting.
- `npm run coverage`: Generate a test coverage report.
- `npm run compile`: Compile the entire project.
- `npm run deploy`: Deploy the contract to the default network.
- `npm run deploy -- --network sepolia`: Deploy the contract to Sepolia testnet.
- `DEPLOYMENT_ID=<id> npm run verify`: Verify a contract on a live network using deployment id.
- `npm run deploy-verify -- --network sepolia`: Deploy and verify the contract on Sepolia testnet.

Alternatively, you can always use Hardhat commands directly. For more details, see `npx hardhat help`.
