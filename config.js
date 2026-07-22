// Arc Testnet Configuration
// Override these via window.TOWER_ARCHER_ENV before this script runs.
window.TOWER_ARCHER_ENV = window.TOWER_ARCHER_ENV || {};

const ENV = window.TOWER_ARCHER_ENV;

window.ARC_CONFIG = {
    chainId: ENV.chainId || '0x4cef52',
    chainName: ENV.chainName || 'Arc Testnet',
    nativeCurrency: {
        name: 'USDC',
        symbol: 'USDC',
        decimals: 6,
        address: ENV.usdcAddress || '0x3600000000000000000000000000000000000000'
    },
    rpcUrls: ENV.rpcUrls ? (Array.isArray(ENV.rpcUrls) ? ENV.rpcUrls : [ENV.rpcUrls]) : ['https://rpc.testnet.arc.network'],
    blockExplorerUrls: ENV.blockExplorerUrls ? (Array.isArray(ENV.blockExplorerUrls) ? ENV.blockExplorerUrls : [ENV.blockExplorerUrls]) : ['https://testnet.arcscan.app'],
    contracts: {
        usdc: ENV.usdcAddress || '0x3600000000000000000000000000000000000000',
        treasury: ENV.gameContractAddress || '0x5e64560d62AaE298381B19d39c1B48b759A278Fd',
        gameContractAddress: ENV.gameContractAddress || '0x5e64560d62AaE298381B19d39c1B48b759A278Fd',
        ownerAddress: ENV.ownerAddress || '0x0000000000000000000000000000000000000000'
    },
    backend: {
        baseUrl: ENV.backendBaseUrl || '/api',
        upgradeEndpoint: '/api/upgrade',
        balanceEndpoint: '/api/balance',
        syncEndpoint: '/api/sync'
    },
    // Gameplay constants
    gameplay: {
        baseArrowSpeed: 12,
        baseFireRate: 400,
        baseDamage: 1,
        baseLives: 5,
        maxLives: 10,
        baseArrowCount: 1,
        maxStage: 50,
        baseStageTime: 90,
        minStageTime: 30,
        stageTimeDecrease: 2,
        baseEnemySpeed: 1.2,
        enemySpeedIncrease: 0.08,
        baseEnemyHp: 1,
        enemyHpIncrease: 0.5,
        baseEnemySpawnInterval: 1800,
        spawnIntervalDecrease: 40,
        minSpawnInterval: 350,
        scorePerEnemy: 10,
        timeBonusMultiplier: 5,
        bonusDropChance: 0.15
    },
    upgrades: {
        speed: { name: 'Faster Bow', cost: 5, effect: 'fireRate', value: -30, maxLevel: 5 },
        power: { name: 'Power Arrows', cost: 10, effect: 'damage', value: 1, maxLevel: 5 },
        pierce: { name: 'Piercing Arrow', cost: 12, effect: 'pierce', value: 1, maxLevel: 3 },
        multi: { name: 'Fire Arrows', cost: 15, effect: 'arrowCount', value: 1, maxLevel: 3 },
        extra_arrow: { name: 'Extra Arrow', cost: 8, effect: 'arrowCount', value: 1, maxLevel: 4 },
        energy: { name: 'Energy Charge', cost: 20, effect: 'energy', value: 1, maxLevel: 3 },
        life: { name: 'Extra Life', cost: 8, effect: 'lives', value: 1, maxLevel: 5 }
    },
    enemyTypes: [
        { name: 'Scrap', hp: 1, speed: 1.0, score: 10, color: '#8B4513', size: 18, sprite: 'scrap' },
        { name: 'Rusty', hp: 2, speed: 1.3, score: 20, color: '#A0522D', size: 20, sprite: 'rusty' },
        { name: 'Cog', hp: 3, speed: 0.9, score: 30, color: '#696969', size: 22, sprite: 'cog' },
        { name: 'Drone', hp: 4, speed: 2.0, score: 50, color: '#00FF7F', size: 16, sprite: 'drone' },
        { name: 'Runner', hp: 1, speed: 2.8, score: 40, color: '#c97c2a', size: 16, sprite: 'runner' },
        { name: 'Tank', hp: 20, speed: 0.55, score: 120, color: '#2c5f2a', size: 32, sprite: 'tank' },
        { name: 'Split', hp: 3, speed: 1.1, score: 35, color: '#594a4a', size: 22, sprite: 'split' },
        { name: 'Shield', hp: 5, speed: 0.9, score: 70, color: '#446688', size: 24, sprite: 'shield' },
        { name: 'Boss', hp: 35, speed: 0.6, score: 400, color: '#FF4500', size: 46, sprite: 'boss' }
    ],
    particles: {
        blood: { count: 6, life: 400, speed: 3, color: '#FF0000' },
        fire: { count: 8, life: 600, speed: 2, color: '#FFA500' },
        spark: { count: 4, life: 300, speed: 4, color: '#FFFF00' },
        coin: { count: 1, life: 1000, speed: 1, color: '#FFD700' }
    }
};

// Wallet state
window.WALLET_STATE = {
    connected: false,
    address: null,
    usdcBalance: 0,
    allowance: 0,
    provider: null,
    signer: null,
    chainId: null
};
