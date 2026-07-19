// Tower Archer - UI Controller
class GameUI {
    constructor() {
        this.screens = {
            start: document.getElementById('start-screen'),
            howToPlay: document.getElementById('how-to-play-screen'),
            game: document.getElementById('game-screen'),
            stageComplete: document.getElementById('stage-complete-screen'),
            gameOver: document.getElementById('gameover-screen')
        };
        this.overlays = {
            pause: document.getElementById('pause-overlay')
        };
        this.speedLevels = [1, 2, 3];
        this.currentSpeedIndex = 0;
        this.init();
    }

    init() {
        // Navigation
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('how-to-play-btn').addEventListener('click', () => this.showScreen('howToPlay'));
        document.getElementById('back-from-howto-btn').addEventListener('click', () => this.showScreen('start'));
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('quit-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('next-stage-btn').addEventListener('click', () => this.nextStage());
        document.getElementById('menu-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('retry-btn').addEventListener('click', () => this.retry());
        document.getElementById('menu-from-gameover-btn').addEventListener('click', () => this.quitToMenu());
        this.setupSpeedButton();
    }

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    togglePause() {
        this.overlays.pause.classList.toggle('hidden');
        return !this.overlays.pause.classList.contains('hidden');
    }

    quitToMenu() {
        this.overlays.pause.classList.add('hidden');
        this.showScreen('start');
        if (window.game) window.game.destroy();
    }

    retry() {
        this.overlays.pause.classList.add('hidden');
        this.showScreen('game');
        if (window.game) window.game.restart();
    }

    nextStage() {
        this.overlays.pause.classList.add('hidden');
        this.showScreen('game');
        if (window.game) window.game.nextStage();
    }

    setupSpeedButton() {
        const btn = document.getElementById('speed-btn');
        btn.addEventListener('click', () => {
            this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedLevels.length;
            btn.textContent = this.speedLevels[this.currentSpeedIndex] + 'x';
            if (window.game) window.game.setSpeed(this.speedLevels[this.currentSpeedIndex]);
        });
    }

    updateHUD(data) {
        document.getElementById('stage-number').textContent = data.stage;
        document.getElementById('wave-number').textContent = data.wave;
        document.getElementById('score-value').textContent = data.score;
        document.getElementById('lives-value').textContent = '❤️ ' + data.lives;
        this.updateTimer(data.timeRemaining, data.stageTime);
    }

    updateTimer(remaining, total) {
        const fill = document.getElementById('timer-fill');
        const text = document.getElementById('timer-text');
        const pct = Math.max(0, (remaining / total) * 100);
        fill.style.width = pct + '%';
        const mins = Math.floor(Math.max(0, remaining) / 60);
        const secs = Math.floor(Math.max(0, remaining) % 60);
        text.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
        // Color: green > yellow > red
        if (pct > 50) fill.className = 'timer-fill';
        else if (pct > 25) fill.className = 'timer-fill timer-warning';
        else fill.className = 'timer-fill timer-danger';
    }

    showStageComplete(data) {
        document.getElementById('final-score').textContent = data.score;
        document.getElementById('enemies-defeated').textContent = data.enemiesDefeated;
        document.getElementById('time-bonus').textContent = data.timeBonus;
        document.getElementById('completed-stage').textContent = data.stage;
        this.showScreen('stageComplete');
    }

    showGameOver(data) {
        document.getElementById('gameover-score').textContent = data.score;
        document.getElementById('gameover-stage').textContent = data.stage;
        document.getElementById('gameover-enemies').textContent = data.enemiesDefeated;
        this.showScreen('gameOver');
    }

    showNotification(text, duration = 2500) {
        const el = document.getElementById('notification');
        document.getElementById('notification-text').textContent = text;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), duration);
    }

    startGame() {
        this.showScreen('game');
        if (!window.game) {
            window.game = new TowerArcherGame(document.getElementById('game-canvas'));
        }
        window.game.start();
    }
}

// Upgrade buttons
function initApp() {
    window.ui = new GameUI();
    setupUpgradeButtons();
    setupWallet();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function setupUpgradeButtons() {
    const types = ['speed', 'power', 'pierce', 'multi', 'extra_arrow', 'energy', 'life'];
    types.forEach(type => {
        const suffix = type === 'extra_arrow' ? 'extra-arrow' : type;
        const btn = document.getElementById('upgrade-' + suffix + '-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (!window.game) return;
            const success = window.game.purchaseUpgrade(type);
            if (success) {
                window.ui.showNotification('Upgrade purchased!');
            } else {
                window.ui.showNotification('Not enough USDC or max level!');
            }
        });
    });
}
