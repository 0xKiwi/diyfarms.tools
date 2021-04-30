pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./utils/Clones.sol";
import "./utils/SafeERC20.sol";
import "./utils/Ownable.sol";
import "./DIYFarm.sol";

contract DIYFarmFactory is Ownable {
  using SafeERC20 for IERC20;

  address public farmImpl;
  address public treasury;

  uint256 public fee;
  uint256 public constant MAX_FEE = 0.05 ether;

  mapping(address => bool) public deployedFarms;
  event DeployFarm(address newFarm, address stakingToken, address rewardToken);

  constructor(address _treasury) {
    treasury = _treasury;
    fee = 0.0005 ether;
    farmImpl = address(new DIYFarm());
  }

  function deployFarm(
    IERC20 _stakingToken, 
    IERC20 _rewardToken, 
    uint256 _rewardAmount, 
    uint256 _duration,
    bool fee
  ) external returns (address) {
    address newFarm = Clones.clone(farmImpl);
    deployedFarms[newFarm] = true;
    uint256 _fee = fee ? (_rewardAmount*fee)/1 ether : 0;
    if (fee) {
      _rewardToken.safeTransferFrom(msg.sender, treasury, _fee);
    }
    _rewardToken.safeTransferFrom(msg.sender, newFarm, _rewardAmount - _fee);
    DIYFarm(newFarm).__DIYFarm_init(msg.sender, _stakingToken, _rewardToken, _rewardAmount - _fee, _duration);
    emit DeployFarm(newFarm, address(_stakingToken), address(_rewardToken));
    return newFarm;
  }

  function blockTimestamp() external view returns (uint256) {
    return block.timestamp;
  }

  function setFee(uint256 newFee) external onlyOwner {
    require(fee < MAX_FEE);
    fee = newFee;
  }

  function setTreasury(address newTreasury) external onlyOwner {
    treasury = newTreasury;
  }
 }