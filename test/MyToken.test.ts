import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { MyToken } from "../typechain-types";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken", function () {
  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const DECIMALS = 18;
  const INIT_SUPPLY = 10000000;
  const INIT_SUPPLY_BIGINT = BigInt(INIT_SUPPLY) * BigInt(10) ** BigInt(DECIMALS);
  const TEST_AMOUNT = 1000;
  const ZERO_ADDRESS = ethers.ZeroAddress;

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMyTokenFixture() {
    const [acct1, acct2, owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory(NAME);
    const token = await Token.deploy(owner) as unknown as MyToken;

    return { token, acct1, acct2, owner };
  }

  async function getSignerZero() {
    const { owner } = await loadFixture(deployMyTokenFixture);
    const signerZero = await ethers.getImpersonatedSigner(ZERO_ADDRESS);

    // Fund the zero address to pay for the transaction
    await owner.sendTransaction({
      to: signerZero.address,
      // Send 2600 ETH to cover max upfront cost and pass test coverage
      value: ethers.parseEther("2600"),
    });

    return signerZero;
  }

  describe("Deployment", function () {
    it("should have the correct name and symbol", async function () {
      const { token } = await loadFixture(deployMyTokenFixture);

      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("should set the correct owner", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);

      expect(await token.owner()).to.equal(owner.address);
    });

    it("should assign the total supply of tokens to the deployer", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);
      const ownerBalance = await token.balanceOf(owner.address);
      const totalSupply = await token.totalSupply();

      expect(totalSupply).to.equal(INIT_SUPPLY_BIGINT);
      expect(ownerBalance).to.equal(INIT_SUPPLY_BIGINT);
    });
  });

  describe("Token Transfers", function () {
    it("should transfer tokens between accounts", async function () {
      const { token, owner, acct1, acct2 } = await loadFixture(deployMyTokenFixture);

      const amount1 = TEST_AMOUNT;
      await expect(token.connect(owner).transfer(acct1.address, amount1))
        .to.changeTokenBalances(token, [owner.address, acct1.address], [-amount1, amount1]);

      const amount2 = TEST_AMOUNT - 500;
      await expect(token.connect(acct1).transfer(acct2.address, amount2))
        .to.changeTokenBalances(token, [acct1.address, acct2.address], [-amount2, amount2]);
    });

    it("should revert if sender doesn't have enough tokens", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialAcct1Balance = await token.balanceOf(acct1.address);

      await expect(token.connect(acct1).transfer(owner.address, 1))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
        .withArgs(acct1.address, initialAcct1Balance, 1);
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("should revert if transfer is from the zero address", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);
      const signerZero = await getSignerZero();

      await expect(token.connect(signerZero).transfer(owner.address, 1))
        .to.be.revertedWithCustomError(token, "ERC20InvalidSender")
        .withArgs(ZERO_ADDRESS);
    });

    it("should revert if transfer is to the zero address", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).transfer(ZERO_ADDRESS, 1))
        .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
        .withArgs(ZERO_ADDRESS);
    });

    it("should emit Transfer event", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).transfer(acct1.address, TEST_AMOUNT))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, acct1.address, TEST_AMOUNT);
    });
  });

  describe("Approval and Allowance", function () {
    it("should set and update allowances", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);
      const amount1 = TEST_AMOUNT;

      await token.connect(owner).approve(acct1.address, amount1);
      expect(await token.allowance(owner.address, acct1.address)).to.equal(amount1);

      const amount2 = amount1 * 2;
      await token.connect(owner).approve(acct1.address, amount2);
      expect(await token.allowance(owner.address, acct1.address)).to.equal(amount2);
    });

    it("should transfer tokens within allowance limit", async function () {
      const { token, owner, acct1, acct2 } = await loadFixture(deployMyTokenFixture);

      await token.connect(owner).approve(acct1.address, TEST_AMOUNT);

      await expect(token.connect(acct1).transferFrom(owner.address, acct2.address, TEST_AMOUNT))
        .to.changeTokenBalances(token, [owner.address, acct2.address], [-TEST_AMOUNT, TEST_AMOUNT]);
      expect(await token.allowance(owner.address, acct1.address)).to.equal(0);
    });

    it("should burn tokens within allowance limit", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);

      await token.connect(owner).approve(acct1.address, TEST_AMOUNT);

      await expect(token.connect(acct1).burnFrom(owner.address, TEST_AMOUNT))
        .to.changeTokenBalance(token, owner.address, -TEST_AMOUNT);
      expect(await token.allowance(owner.address, acct1.address)).to.equal(0);
    });

    it("should revert if transfer amount exceeds allowance", async function () {
      const { token, owner, acct1, acct2 } = await loadFixture(deployMyTokenFixture);
      const allowance = TEST_AMOUNT;
      const transferAmount = allowance + 1;

      await token.connect(owner).approve(acct1.address, allowance);
      await expect(token.connect(acct1).transferFrom(owner.address, acct2.address, transferAmount))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
        .withArgs(acct1.address, allowance, transferAmount);
    });

    it("should revert if approver is the zero address", async function () {
      const { token, acct1 } = await loadFixture(deployMyTokenFixture);
      const signerZero = await getSignerZero();

      await expect(token.connect(signerZero).approve(acct1.address, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "ERC20InvalidApprover")
        .withArgs(ZERO_ADDRESS);
    });

    it("should revert if spender is the zero address", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).approve(ZERO_ADDRESS, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "ERC20InvalidSpender")
        .withArgs(ZERO_ADDRESS);
    });

    it("should emit Approval event", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).approve(acct1.address, TEST_AMOUNT))
        .to.emit(token, "Approval")
        .withArgs(owner.address, acct1.address, TEST_AMOUNT);
    });
  });

  describe("Minting", function () {
    it("should mint new tokens to an account and increase total supply and balance", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).mint(acct1.address, TEST_AMOUNT))
        .to.changeTokenBalance(token, acct1.address, TEST_AMOUNT);

      expect(await token.totalSupply()).to.equal(INIT_SUPPLY_BIGINT + BigInt(TEST_AMOUNT));
    });

    it("should revert when not called by owner", async function () {
      const { token, acct1 } = await loadFixture(deployMyTokenFixture);
      await expect(token.connect(acct1).mint(acct1.address, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(acct1.address);
    });

    it("should emit Transfer event", async function () {
      const { token, owner, acct1 } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).mint(acct1.address, TEST_AMOUNT))
        .to.emit(token, "Transfer")
        .withArgs(ZERO_ADDRESS, acct1.address, TEST_AMOUNT);
    });
  });

  describe("Burning", function () {
    it("should burn tokens from an account and reduce total supply and balance", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).burn(TEST_AMOUNT))
        .to.changeTokenBalance(token, owner.address, -TEST_AMOUNT);

      expect(await token.totalSupply()).to.equal(INIT_SUPPLY_BIGINT - BigInt(TEST_AMOUNT));
    });

    it("should revert when trying to burn more tokens than the account balance", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);
      const ownerBalance = await token.balanceOf(owner.address);
      const burnAmount = ownerBalance + BigInt(TEST_AMOUNT);

      await expect(token.connect(owner).burn(burnAmount))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
        .withArgs(owner.address, ownerBalance, burnAmount);
    });

    it("should emit Transfer event", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);

      await expect(token.connect(owner).burn(TEST_AMOUNT))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, ZERO_ADDRESS, TEST_AMOUNT);
    });
  });

  describe("Pausing and Unpausing", function () {
    it("should pause and unpause the contract by the owner", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);
      await token.connect(owner).pause();
      expect(await token.paused()).to.be.true;

      await token.connect(owner).unpause();
      expect(await token.paused()).to.be.false;
    });

    it("should allow all kinds of transfers when unpaused", async function () {
      const { token, owner, acct1, acct2 } = await loadFixture(deployMyTokenFixture);
      await token.connect(owner).pause();
      await token.connect(owner).unpause();
      await token.connect(owner).approve(acct1.address, TEST_AMOUNT * 2);

      await expect(token.connect(owner).mint(acct1.address, TEST_AMOUNT))
        .to.not.be.reverted;
      await expect(token.connect(owner).burn(TEST_AMOUNT))
        .to.not.be.reverted;
      await expect(token.connect(acct1).burnFrom(owner.address, TEST_AMOUNT))
        .to.not.be.reverted;
      await expect(token.connect(owner).transfer(acct1.address, TEST_AMOUNT))
        .to.not.be.reverted;
      await expect(token.connect(acct1).transferFrom(owner.address, acct2.address, TEST_AMOUNT))
        .to.not.be.reverted;
    });

    it("should revert all kinds of transfers when paused", async function () {
      const { token, owner, acct1, acct2 } = await loadFixture(deployMyTokenFixture);
      await token.connect(owner).pause();
      await token.connect(owner).approve(acct1.address, TEST_AMOUNT);

      await expect(token.connect(owner).mint(acct1.address, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "EnforcedPause");
      await expect(token.connect(owner).burn(TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "EnforcedPause");
      await expect(token.connect(acct1).burnFrom(owner.address, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "EnforcedPause");
      await expect(token.connect(owner).transfer(acct1.address, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "EnforcedPause");
      await expect(token.connect(acct1).transferFrom(owner.address, acct2.address, TEST_AMOUNT))
        .to.be.revertedWithCustomError(token, "EnforcedPause");

      await token.connect(owner).unpause();
    });

    it("should revert when expected to be paused or unpaused", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);

      await token.connect(owner).pause();
      await expect(token.connect(owner).pause())
        .to.be.revertedWithCustomError(token, "EnforcedPause");

      await token.connect(owner).unpause();
      await expect(token.connect(owner).unpause())
        .to.be.revertedWithCustomError(token, "ExpectedPause");
    });

    it("should revert when not called by owner", async function () {
      const { token, acct1 } = await loadFixture(deployMyTokenFixture);
      await expect(token.connect(acct1).pause())
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(acct1.address);
      await expect(token.connect(acct1).unpause())
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(acct1.address);
    });

    it("should emit Paused and Unpaused events", async function () {
      const { token, owner } = await loadFixture(deployMyTokenFixture);
      await expect(token.connect(owner).pause())
        .to.emit(token, "Paused").withArgs(owner.address);
      await expect(token.connect(owner).unpause())
        .to.emit(token, "Unpaused").withArgs(owner.address);
    });
  });
});
