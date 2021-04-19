/*
   ____            __   __        __   _
  / __/__ __ ___  / /_ / /  ___  / /_ (_)__ __
 _\ \ / // // _ \/ __// _ \/ -_)/ __// / \ \ /
/___/ \_, //_//_/\__//_//_/\__/ \__//_/ /_\_\
     /___/

* Synthetix: DIYFarm.sol
*
* Docs: https://docs.synthetix.io/
*
*
* MIT License
* ===========
*
* Copyright (c) 2020 Synthetix
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
*/
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./token/ERC20.sol";
import "./utils/Initializable.sol";
import "./utils/SafeMath.sol";
import "./utils/SafeERC20.sol";

import "hardhat/console.sol";

contract DIYFarm is Initializable, ERC20 {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IERC20 public stakingToken;
  IERC20 public rewardToken;
  uint256 public duration;

  uint256 public starttime; // 2020-08-11 19:00:00 (UTC UTC +00:00)
  uint256 public periodFinish;
  uint256 public rewardRate;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;

  event RewardAdded(uint256 reward);
  event Staked(address indexed user, uint256 amount);
  event Withdrawn(address indexed user, uint256 amount);
  event RewardPaid(address indexed user, uint256 reward);

  constructor() {
    __ERC20_init("", "");
  }

  function __DIYFarm_init(
    IERC20 _stakingToken, 
    IERC20 _rewardToken, 
    uint256 _rewardAmount, 
    uint256 _starttime, 
    uint256 _duration
  ) public initializer {
    require(_starttime >= block.timestamp);
    require(_duration > 0);
    bytes memory newSymbol = abi.encodePacked("diy", _stakingToken.symbol(), "-", _rewardToken.symbol());
    __ERC20_init(string(newSymbol), string(newSymbol));
    stakingToken = _stakingToken;
    rewardToken = _rewardToken;
    starttime = _starttime;
    duration = _duration;
    notifyRewardAmount(_rewardAmount);
  }

  modifier checkStart(){
    require(block.timestamp >= starttime, "not started");
    _;
  }

  modifier updateReward(address account) {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = lastTimeRewardApplicable();
    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
    _;
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  function rewardPerToken() public view returns (uint256) {
    if (totalSupply() == 0) {
      return rewardPerTokenStored;
    }
    return
      rewardPerTokenStored.add(
        lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).mul(1e18).div(totalSupply())
      );
  }

  function earned(address account) public view returns (uint256) {
    return
      balanceOf(account)
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
  }

  function stake(uint256 amount) external updateReward(msg.sender) checkStart {
    require(amount > 0, "Cannot stake 0");
    stakingToken.safeTransferFrom(msg.sender, address(this), amount);
    _mint(msg.sender, amount);
    emit Staked(msg.sender, amount);
  }

  function withdraw(uint256 amount) public updateReward(msg.sender) checkStart {
    require(amount > 0, "Cannot withdraw 0");
    _burn(msg.sender, amount);
    stakingToken.safeTransfer(msg.sender, amount);
    emit Withdrawn(msg.sender, amount);
  }

  function emergencyWithdraw(uint256 amount) public checkStart {
    require(amount > 0, "Cannot withdraw 0");
    _burn(msg.sender, amount);
    stakingToken.safeTransfer(msg.sender, amount);
    emit Withdrawn(msg.sender, amount);
  }

  function exit() external {
    withdraw(balanceOf(msg.sender));
    getReward();
  }

  function getReward() public updateReward(msg.sender) {
    uint256 reward = earned(msg.sender);
    if (reward > 0) {
      rewards[msg.sender] = 0;
      rewardToken.safeTransfer(msg.sender, reward);
      emit RewardPaid(msg.sender, reward);
    }
  }

  // Modified from original code to only be called once and issue rewards linearly
  // instead of previous halving behavior.
  function notifyRewardAmount(uint256 reward) internal initializer updateReward(address(0)) {
    rewardRate = reward.div(duration);
    lastUpdateTime = block.timestamp;
    periodFinish = starttime.add(duration);
    emit RewardAdded(reward);
  }
}