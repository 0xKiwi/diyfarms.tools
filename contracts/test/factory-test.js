const { expect } = require("chai");

const { BigNumber } = require("@ethersproject/bignumber");

const BASE = BigNumber.from(10).pow(18);
const balance = BASE.mul(1000000);
let primary, alice, bob;

let factory;
let testStakeToken;
let testRewardToken;
let farm;

const expectException = async (promise, expectedError) => {
  try {
    await promise;
  } catch (error) {
    if (error.message.indexOf(expectedError) === -1) {
      const actualError = error.message.replace(
        "Returned error: VM Exception while processing transaction: ",
        ""
      );
      fail(actualError); // , expectedError, 'Wrong kind of exception received');
    }
    return;
  }

  fail("Expected an exception but none was received");
};

const expectRevert = async (promise) => {
  await expectException(promise, "revert");
};

describe("DIYFarmFactory", function() {
  before(async function () {
    let signers = await ethers.getSigners();
    primary = signers[0];
    alice = signers[1];
    bob = signers[2];
    const Factory = await ethers.getContractFactory("DIYFarmFactory");
    factory = await Factory.deploy(alice.address);

    const Token = await ethers.getContractFactory("TestERC20");
    testStakeToken = await Token.deploy();
    testStakeToken.__ERC20_init("stake", "stake");
    testStakeToken.mint(primary.address, balance);
    testRewardToken = await Token.deploy();
    testRewardToken.__ERC20_init("reward", "reward");
    testRewardToken.mint(primary.address, balance);
  });

  it("Should deploy pools", async function() {
    let bal = await testRewardToken.balanceOf(primary.address);
    await testRewardToken.approve(factory.address, bal);
    let blockTimestamp = await factory.blockTimestamp(); 
    let tx = await factory.deployFarm(
      testStakeToken.address,
      testRewardToken.address,
      bal,
      blockTimestamp.add(5),
      1000,
    )
    let waited = await tx.wait()
    for (let i = 0; i < waited.events.length; i++) {
      let event = waited.events[i];
      if (event.eventSignature == "DeployFarm(address,address,address)") {
        farm = await ethers.getContractAt("DIYFarm", event.args.newFarm);
      }
    }
    let farmBal = await testRewardToken.balanceOf(farm.address);
    let feePerc = await factory.fee();
    let fee = balance.mul(feePerc).div(BASE)
    expect(farmBal).to.equal(bal.sub(fee));
  });

  it("Should not stake in pool before start", async function () {
    let bal = await testStakeToken.balanceOf(primary.address);
    await testStakeToken.approve(farm.address, bal);
    await expectRevert(farm.stake(bal), "not started");
  });

  it("Should stake in pool", async function () {
    let bal = await testStakeToken.balanceOf(primary.address);
    await testStakeToken.approve(farm.address, bal);
    await farm.stake(bal);
    let diyBal = await farm.balanceOf(primary.address);
    expect(diyBal).to.equal(bal);
  });

  it("Should pass the time", async function () {
    await network.provider.send("evm_increaseTime", [5])
    await network.provider.send("evm_mine")
  });

  let earned;
  it("Should accumulate rewards afer 5 seconds", async function() {
    earned = await farm.earned(primary.address);
    console.log(earned.toString())
    expect(earned.toString()).to.not.equal("0");
  });

  it("Should pass the time", async function () {
    await network.provider.send("evm_increaseTime", [5])
    await network.provider.send("evm_mine")
  });

  it("Should accumulate rewards after 11 seconds", async function() {
    let newEarned = await farm.earned(primary.address);
    expect(newEarned.toString()).to.be.equal(earned.mul(2));
  });

  it("Should pass the time", async function () {
    await network.provider.send("evm_increaseTime", [40])
    await network.provider.send("evm_mine")
  });

  it("Should accumulate rewards after 50 seconds", async function() {
    let newEarned = await farm.earned(primary.address);
    expect(newEarned.toString()).to.be.equal(earned.mul(10));
  });

  it("Should pass the time", async function () {
    await network.provider.send("evm_increaseTime", [50])
    await network.provider.send("evm_mine")
  });

  it("Should accumulate rewards after 100 seconds", async function() {
    let newEarned = await farm.earned(primary.address);
    expect(newEarned.toString()).to.be.equal(earned.mul(20));
  });

  it("Should pass the time", async function () {
    await network.provider.send("evm_increaseTime", [900])
    await network.provider.send("evm_mine")
  });

  it("Should accumulate rewards after 1000 seconds", async function() {
    let newEarned = await farm.earned(primary.address);
    expect(newEarned.toString()).to.be.equal(earned.mul(200));
  });

  it("Should pass the time", async function () {
    await network.provider.send("evm_increaseTime", [500])
    await network.provider.send("evm_mine")
  });

  it("Should not accumulate rewards after finishing", async function() {
    let newEarned = await farm.earned(primary.address);
    expect(newEarned.toString()).to.be.equal(earned.mul(200));
  });

  it("Should let you withdraw from pool", async function () {
    let diyBal = await farm.balanceOf(primary.address);
    await farm.approve(farm.address, diyBal);
    await farm.withdraw(diyBal);
    let bal = await testStakeToken.balanceOf(primary.address);
    expect(bal).to.equal(diyBal);
  });

  it("Should stake in pool after end", async function () {
    let bal = await testStakeToken.balanceOf(primary.address);
    await testStakeToken.approve(farm.address, bal);
    await farm.stake(bal);
    let diyBal = await farm.balanceOf(primary.address);
    expect(diyBal).to.equal(bal);
  });

  it("Should let you exit from pool", async function () {
    let rewardFarmBal = await testRewardToken.balanceOf(farm.address);
    let diyBal = await farm.balanceOf(primary.address);
    await farm.approve(farm.address, diyBal);
    await farm.exit();
    let newBal = await testStakeToken.balanceOf(primary.address);
    expect(newBal).to.equal(diyBal);
    let rewardBal = await testRewardToken.balanceOf(primary.address);
    expect(rewardBal).to.equal(rewardFarmBal);
  });

  it("Should stake in pool after no rewards", async function () {
    let bal = await testStakeToken.balanceOf(primary.address);
    await testStakeToken.approve(farm.address, bal);
    await farm.stake(bal);
    let diyBal = await farm.balanceOf(primary.address);
    expect(diyBal).to.equal(bal);
  });

  it("Should let you exit from pool after no rewards", async function () {
    let diyBal = await farm.balanceOf(primary.address);
    await farm.approve(farm.address, diyBal);
    await farm.exit();
    let newBal = await testStakeToken.balanceOf(primary.address);
    expect(newBal).to.equal(diyBal);
  });
});