// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TowerArcher is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    address public immutable USDC;
    uint256 public constant COOLDOWN_PER_PURCHASE = 10 seconds;

    struct PlayerState {
        uint256 upgradeLevels;
        uint256 extraLives;
        uint256 energyCharges;
        uint256 lastPurchaseTimestamp;
        uint256 purchaseCount;
    }

    struct UpgradeConfig {
        uint256 baseCost;
        uint256 maxLevel;
        uint256 increment;
        bool active;
    }

    mapping(address => PlayerState) public players;
    mapping(uint256 => UpgradeConfig) public upgrades;
    
    uint256 public totalUpgrades;
    uint256 public totalGamesCompleted;
    uint256 public totalTreasury;

    event UpgradePurchased(
        address indexed player,
        uint256 upgradeIndex,
        uint256 newLevel,
        uint256 cost
    );
    event LifePurchased(address indexed player, uint256 lives);
    event EnergyPurchased(address indexed player, uint256 energy);
    event TreasuryWithdrawn(address indexed owner, uint256 amount);
    event GameStarted(address indexed player, uint256 stage);
    event GameFinished(address indexed player, uint256 score);
    event RewardClaimed(address indexed player, uint256 amount);

    modifier notPaused() {
        require(!paused(), "Game is paused");
        _;
    }

    constructor(
        address _usdc,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_usdc != address(0), "Invalid USDC address");
        USDC = _usdc;
        
        upgrades[0] = UpgradeConfig(5e5, 5, 5e5, true);  // Faster Bow
        upgrades[1] = UpgradeConfig(10e5, 5, 10e5, true); // Power Arrows
        upgrades[2] = UpgradeConfig(12e5, 3, 12e5, true); // Piercing
        upgrades[3] = UpgradeConfig(15e5, 3, 15e5, true); // Multi Arrow
        upgrades[4] = UpgradeConfig(8e5, 4, 8e5, true);   // Extra Arrow
        upgrades[5] = UpgradeConfig(20e5, 3, 20e5, true); // Energy Charge
    }

    function getPlayer(address player) external view returns (PlayerState memory) {
        return players[player];
    }

    function getUpgradeLevels(address player) external view returns (uint256) {
        return players[player].upgradeLevels;
    }

    function _getUpgradeCost(uint256 upgradeIndex, uint256 currentLevel) internal view returns (uint256) {
        require(upgradeIndex < 6, "Invalid upgrade");
        require(upgrades[upgradeIndex].active, "Upgrade inactive");
        require(currentLevel < upgrades[upgradeIndex].maxLevel, "Max level reached");
        return upgrades[upgradeIndex].baseCost + (upgrades[upgradeIndex].increment * currentLevel);
    }

    function _validatePurchase(address player) internal view {
        require(player != address(0), "Invalid player");
        require(block.timestamp >= players[player].lastPurchaseTimestamp + COOLDOWN_PER_PURCHASE, "Cooldown active");
    }

    function getUpgradeLevel(address player, uint256 upgradeIndex) external view returns (uint256) {
        require(upgradeIndex < 6, "Invalid upgrade");
        return (players[player].upgradeLevels >> (upgradeIndex * 4)) & 0xF;
    }

    function buyUpgrade(
        uint256 upgradeIndex,
        uint256 extraLivesAmount,
        uint256 energyAmount
    ) external nonReentrant whenNotPaused {
        address player = msg.sender;
        require(player != address(0), "Invalid player");
        require(block.timestamp >= players[player].lastPurchaseTimestamp + COOLDOWN_PER_PURCHASE, "Cooldown active");
        
        PlayerState storage state = players[player];
        uint256 totalCost = 0;
        uint256 newLevel = 0;
        
        if (upgradeIndex < 6) {
            uint256 currentLevel = (state.upgradeLevels >> (upgradeIndex * 4)) & 0xF;
            require(currentLevel < upgrades[upgradeIndex].maxLevel, "Max level reached");
            uint256 cost = _getUpgradeCost(upgradeIndex, currentLevel);
            require(cost > 0, "Invalid cost");
            totalCost += cost;
            newLevel = currentLevel + 1;
        }
        
        require(extraLivesAmount <= 5, "Too many lives");
        require(energyAmount <= 5, "Too much energy");
        
        totalCost += extraLivesAmount * 8e5;
        totalCost += energyAmount * 20e5;
        
        require(totalCost > 0, "No purchase");
        
        IERC20(USDC).safeTransferFrom(player, address(this), totalCost);
        
        if (upgradeIndex < 6) {
            uint256 currentLevel = (state.upgradeLevels >> (upgradeIndex * 4)) & 0xF;
            require(currentLevel < upgrades[upgradeIndex].maxLevel, "Max level reached");
            state.upgradeLevels += (currentLevel + 1) << (upgradeIndex * 4);
            emit UpgradePurchased(player, upgradeIndex, currentLevel + 1, totalCost);
        }
        
        if (extraLivesAmount > 0) {
            state.extraLives += extraLivesAmount;
            emit LifePurchased(player, extraLivesAmount);
        }
        
        if (energyAmount > 0) {
            state.energyCharges += energyAmount;
            emit EnergyPurchased(player, energyAmount);
        }
        
        state.lastPurchaseTimestamp = block.timestamp;
        totalTreasury += totalCost;
        totalUpgrades++;
    }

    function withdrawTreasury() external onlyOwner {
        uint256 amount = IERC20(USDC).balanceOf(address(this));
        require(amount > 0, "No treasury");
        IERC20(USDC).safeTransfer(owner(), amount);
        emit TreasuryWithdrawn(owner(), amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token) external onlyOwner {
        require(token != USDC, "Use withdrawTreasury");
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }
}
