/* Tower Archer - Arc Testnet Tower Defense */

class TowerArcherGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.running = false;
        this.paused = false;
        this.speed = 1;
        this.lastTime = 0;
        this.stage = 1;
        this.wave = 1;
        this.score = 0;
        this.lives = ARC_CONFIG.gameplay.baseLives;
        this.timeRemaining = ARC_CONFIG.gameplay.baseStageTime;
        this.enemies = [];
        this.arrows = [];
        this.particles = [];
        this.pickups = [];
        this.enemySpawnTimer = 0;
        this.waveEnemiesRemaining = 0;
        this.waveActive = false;
        this.stageActive = false;
        this.arrowsInFlight = 0;
        this.gameOver = false;
        this.stageComplete = false;
        this.enemiesDefeated = 0;
        this.totalEnemiesInStage = 0;
        this.fireRate = ARC_CONFIG.gameplay.baseFireRate;
        this.damage = ARC_CONFIG.gameplay.baseDamage;
        this.arrowCount = ARC_CONFIG.gameplay.baseArrowCount;
        this.pierceCount = 0;
        this.energy = 0;
        this.maxEnergy = 3;
        this.activeAbility = null;
        this.abilityDuration = 0;
        this.upgrades = { speed: 0, power: 0, pierce: 0, multi: 0, extra_arrow: 0, energy: 0, life: 0 };
        this.mouseX = 0;
        this.mouseY = 0;
        this.recoil = 0;
        this.cameraShake = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.bossWarning = 0;
        
        this.tower = { x: 0, y: 0, width: 120, height: 200 };
        this.player = { x: 0, y: 0, angle: 0 };
        
        this.resize();
        this.setupInput();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth || 800;
        this.canvas.height = container.clientHeight || 500;
        this.tower.x = 60;
        this.tower.y = this.canvas.height - this.tower.height;
        this.player.x = this.tower.x + 40;
        this.player.y = this.tower.y - 30;
    }

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.updatePlayerAngle();
        });
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.shoot();
        });
        // Spacebar for rapid fire
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.running && !this.paused && !this.gameOver) {
                this.shoot();
            }
            // Ability keys 1-4
            if (e.key >= '1' && e.key <= '4' && this.running && !this.paused && !this.gameOver) {
                const idx = parseInt(e.key) - 1;
                this.activateAbility(idx);
            }
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this.mouseX = t.clientX - rect.left;
            this.mouseY = t.clientY - rect.top;
            this.updatePlayerAngle();
        }, { passive: false });
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
    }

    updatePlayerAngle() {
        const dx = this.mouseX - this.player.x;
        const dy = this.mouseY - this.player.y;
        this.player.angle = Math.atan2(dy, dx);
    }

    start() {
        this.running = true;
        this.paused = false;
        this.gameOver = false;
        this.stageComplete = false;
        this.stage = 1;
        this.wave = 1;
        this.score = 0;
        this.lives = ARC_CONFIG.gameplay.baseLives;
        this.upgrades = { speed: 0, power: 0, pierce: 0, multi: 0, extra_arrow: 0, energy: 0, life: 0 };
        this.pierceCount = 0;
        this.energy = 0;
        this.maxEnergy = 3;
        this.activeAbility = null;
        this.abilityDuration = 0;
        this.enemies = [];
        this.arrows = [];
        this.particles = [];
        this.pickups = [];
        this.combo = 0;
        this.lastTime = performance.now();
        this.startStage();
        window.ui.updateSpeedButton && window.ui.updateSpeedButton(1);
        this.loop(performance.now());
    }

    restart() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.start();
    }

    nextStage() {
        this.stage++;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.running = true;
        this.paused = false;
        this.stageComplete = false;
        this.enemies = [];
        this.arrows = [];
        this.particles = [];
        this.pickups = [];
        this.combo = 0;
        this.lastTime = performance.now();
        this.startStage();
        this.loop(performance.now());
    }

    startStage() {
        this.stageActive = true;
        this.timeRemaining = Math.max(
            ARC_CONFIG.gameplay.minStageTime,
            ARC_CONFIG.gameplay.baseStageTime - (this.stage - 1) * ARC_CONFIG.gameplay.stageTimeDecrease
        );
        this.wave = 1;
        this.waveActive = true;
        this.waveEnemiesRemaining = this.getWaveEnemyCount();
        this.totalEnemiesInStage = this.waveEnemiesRemaining;
        this.enemies = [];
        this.arrows = [];
        this.particles = [];
        this.pickups = [];
        this.enemySpawnTimer = 0;
        this.arrowsInFlight = 0;
        this.enemiesDefeated = 0;
        this.bossWarning = 0;
    }

    getWaveEnemyCount() {
        const base = 5 + this.stage * 2;
        return base + Math.floor(this.wave * 1.3);
    }

    getEnemyType() {
        const cfg = ARC_CONFIG.enemyTypes;
        const idx = Math.min(this.stage - 1, cfg.length - 1);
        const roll = Math.random();
        if (this.wave % 5 === 0) return cfg[cfg.length - 1];
        if (roll < 0.6 && idx > 0) return cfg[Math.max(0, idx - 1)];
        if (roll < 0.85 && idx > 1) return cfg[Math.max(0, idx - 2)];
        return cfg[0];
    }

    spawnEnemy() {
        const type = this.getEnemyType();
        const cfg = ARC_CONFIG.gameplay;
        const stageMultiplier = 1 + (this.stage - 1) * 0.5;
        const enemy = {
            x: this.canvas.width + 40,
            y: this.tower.y - 30,
            hp: type.hp * stageMultiplier,
            maxHp: type.hp * stageMultiplier,
            speed: type.speed * (cfg.baseEnemySpeed + (this.stage - 1) * cfg.enemySpeedIncrease),
            score: type.score,
            color: type.color,
            size: type.size + this.stage * 0.6,
            name: type.name,
            sprite: type.sprite,
            frozen: 0,
            angle: 0,
            shield: type.sprite === 'shield' ? Math.min(this.stage, 5) : 0,
            slowed: 0
        };
        this.enemies.push(enemy);
        this.waveEnemiesRemaining--;
    }

    shoot() {
        if (!this.running || this.paused || this.gameOver) return;
        const now = performance.now();
        const rate = this.activeAbility === 'rapid' ? this.fireRate * 0.4 : this.fireRate;
        if (now - (this._lastShot || 0) < rate) return;
        this._lastShot = now;
        
        this.recoil = 6;
        this.cameraShake = 2;
        
        const count = this.arrowCount;
        const baseAngle = this.player.angle;
        const spread = Math.PI / 24;
        
        for (let i = 0; i < count; i++) {
            let angle = baseAngle;
            if (count > 1) {
                angle = baseAngle + (i - (count - 1) / 2) * spread;
            }
            const dmg = this.damage;
            const arrow = {
                x: this.player.x + Math.cos(angle) * 20,
                y: this.player.y + Math.sin(angle) * 20,
                vx: Math.cos(angle) * ARC_CONFIG.gameplay.baseArrowSpeed,
                vy: Math.sin(angle) * ARC_CONFIG.gameplay.baseArrowSpeed,
                damage: dmg,
                pierce: this.pierceCount,
                hits: 0,
                angle: angle,
                trail: [],
                life: 0,
                isFire: this.activeAbility === 'fire'
            };
            this.arrows.push(arrow);
        }
        this.arrowsInFlight += count;
        this.spawnParticles(this.player.x + Math.cos(baseAngle) * 30, this.player.y + Math.sin(baseAngle) * 30, ARC_CONFIG.particles.spark);
    }

    activateAbility(index) {
        const abilities = [
            { key: 'rapid', cost: 1, duration: 8000 },
            { key: 'fire', cost: 2, duration: 10000 },
            { key: 'shield', cost: 2, duration: 8000 },
            { key: 'slow', cost: 1, duration: 6000 }
        ];
        const ability = abilities[index];
        if (!ability || this.energy < ability.cost) return;
        this.energy -= ability.cost;
        this.activeAbility = ability.key;
        this.abilityDuration = ability.duration;
        const names = { rapid: 'Rapid Fire', fire: 'Fire Storm', shield: 'Tower Shield', slow: 'Time Slow' };
        window.ui.showNotification(names[ability.key] + ' activated!');
        if (ability.key === 'shield') {
            this.lives = Math.min(ARC_CONFIG.gameplay.maxLives, this.lives + 1);
        }
        if (ability.key === 'slow') {
            for (const e of this.enemies) e.slowed = 4000;
        }
        if (ability.key === 'fire') {
            this.cameraShake = 10;
            for (const e of this.enemies) {
                if (Math.abs(e.x - this.canvas.width / 2) < 250) {
                    e.hp -= 15;
                }
            }
            this.spawnParticles(this.canvas.width / 2, this.canvas.height / 2, ARC_CONFIG.particles.fire);
        }
    }

    spawnParticles(x, y, type) {
        const { count, life, speed, color } = type;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.5 + Math.random() * 0.8);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: life * (0.6 + Math.random() * 0.4),
                maxLife: life,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }

    spawnPickup(x, y) {
        if (Math.random() > ARC_CONFIG.gameplay.bonusDropChance) return;
        const type = Math.random() < 0.75 ? 'coin' : (Math.random() < 0.5 ? 'arrow' : 'energy');
        this.pickups.push({ x, y, type, vy: -1.2, life: 900 });
    }

    checkCollisions() {
        const arrowsToRemove = [];
        const enemiesToRemove = [];
        const hitFlags = new Set();
        
        for (let i = 0; i < this.arrows.length; i++) {
            const a = this.arrows[i];
            let arrowRemoved = false;
            
            for (let j = 0; j < this.enemies.length; j++) {
                if (enemiesToRemove.includes(j) || hitFlags.has(j)) continue;
                const e = this.enemies[j];
                const dx = a.x - e.x;
                const dy = a.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < e.size + 6) {
                    const dmg = a.damage;
                    let blockedDmg = 0;
                    if (e.shield > 0 && a.angle > Math.PI * 1.2 && a.angle < Math.PI * 1.8) {
                        blockedDmg = Math.floor(dmg * (e.shield / (e.shield + 1)));
                        e.shield--;
                        this.spawnParticles(e.x + 10, e.y - 5, ARC_CONFIG.particles.spark);
                    }
                    e.hp -= (dmg - blockedDmg);
                    a.hits++;
                    
                    if (!arrowRemoved) {
                        this.spawnParticles(a.x, a.y, ARC_CONFIG.particles.blood);
                        // Knockback
                        const kx = (a.x - e.x) / (dist || 1);
                        const ky = (a.y - e.y) / (dist || 1);
                        e.x += kx * 4;
                        e.y += ky * 2;
                    }
                    
                    if (a.pierce > 0 && a.hits > a.pierce) {
                        arrowRemoved = true;
                    }
                    
                    if (e.hp <= 0) {
                        enemiesToRemove.push(j);
                        this.onEnemyKilled(e);
                    }
                    
                    if (arrowRemoved) break;
                    hitFlags.add(j);
                }
            }
            
            if (arrowRemoved) arrowsToRemove.push(i);
        }

        this.arrows = this.arrows.filter((_, i) => !arrowsToRemove.includes(i));
        this.enemies = this.enemies.filter((e, i) => !enemiesToRemove.includes(i));

        for (const e of this.enemies) {
            if (e.x < this.tower.x + e.size) {
                if (this.activeAbility === 'shield') {
                    e.x = this.canvas.width + 50;
                    this.spawnParticles(this.tower.x + 20, this.tower.y + 40, ARC_CONFIG.particles.spark);
                    this.lives = Math.min(ARC_CONFIG.gameplay.maxLives, this.lives - 0);
                } else {
                    this.lives--;
                    e.x = this.canvas.width + 50;
                    this.spawnParticles(this.tower.x, this.tower.y + this.tower.height / 2, ARC_CONFIG.particles.blood);
                    this.cameraShake = 8;
                    this.combo = 0;
                }
            }
        }
    }

    onEnemyKilled(enemy) {
        this.score += enemy.score + Math.floor(this.combo * 2);
        this.enemiesDefeated++;
        this.combo++;
        this.comboTimer = 2000;
        this.spawnParticles(enemy.x, enemy.y, ARC_CONFIG.particles.blood);
        if (enemy.sprite === 'boss') {
            this.spawnParticles(enemy.x, enemy.y, ARC_CONFIG.particles.fire);
            this.cameraShake = 6;
        }
        
        // Split enemies on death
        if (enemy.sprite === 'split' && this.stage < 10) {
            for (let s = 0; s < 2; s++) {
                const baby = {
                    x: enemy.x + (s === 0 ? -15 : 15),
                    y: enemy.y,
                    hp: 1,
                    maxHp: 1,
                    speed: enemy.speed * 1.4,
                    score: 5,
                    color: '#555',
                    size: 10,
                    name: 'Baby',
                    sprite: 'scrap',
                    frozen: 0,
                    angle: 0,
                    shield: 0,
                    slowed: 0
                };
                this.enemies.push(baby);
            }
        }
        
        this.spawnPickup(enemy.x, enemy.y);
    }

    updatePickups(dt) {
        for (const p of this.pickups) {
            p.y += p.vy * (dt / 16);
            p.vy += 0.05;
            
            const dx = p.x - this.player.x;
            const dy = p.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 40) {
                if (p.type === 'coin') {
                    this.score += 5;
                    this.spawnParticles(p.x, p.y, ARC_CONFIG.particles.coin);
                } else if (p.type === 'arrow') {
                    this.arrowsInFlight = Math.max(0, this.arrowsInFlight - 1);
                    this.spawnParticles(p.x, p.y, ARC_CONFIG.particles.spark);
                } else if (p.type === 'energy') {
                    this.energy = Math.min(this.maxEnergy, this.energy + 1);
                    this.spawnParticles(p.x, p.y, ARC_CONFIG.particles.coin);
                    window.ui && window.ui.showNotification('Energy Orbe +1');
                }
                p.life = 0;
            }
        }
        this.pickups = this.pickups.filter(p => p.life > 0);
    }

    update(dt) {
        if (this.paused || this.gameOver || this.stageComplete) return;
        
        const cfg = ARC_CONFIG.gameplay;
        const effectiveDt = dt * this.speed;

        this.timeRemaining -= effectiveDt / 1000;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.endStage();
            return;
        }

        this.comboTimer -= effectiveDt;
        if (this.comboTimer <= 0) this.combo = 0;

        this.cameraShake *= 0.9;
        if (this.cameraShake < 0.1) this.cameraShake = 0;
        this.recoil *= 0.85;

        if (this.waveActive || this.waveEnemiesRemaining > 0) {
            this.enemySpawnTimer -= effectiveDt;
            const spawnInterval = Math.max(
                ARC_CONFIG.gameplay.minSpawnInterval,
                cfg.baseEnemySpawnInterval - (this.stage - 1) * ARC_CONFIG.gameplay.spawnIntervalDecrease
            );
            if (this.enemySpawnTimer <= 0 && this.waveEnemiesRemaining > 0) {
                this.spawnEnemy();
                this.enemySpawnTimer = spawnInterval * (0.7 + Math.random() * 0.5);
            }
        }

        for (const e of this.enemies) {
            if (e.frozen > 0) e.frozen -= effectiveDt;
            if (e.slowed > 0) e.slowed -= effectiveDt;
            const effSpeed = (e.slowed > 0 ? e.speed * 0.4 : e.speed) * (e.frozen > 0 ? 0.3 : 1);
            e.x -= effSpeed * (effectiveDt / 16);
            e.angle = Math.sin(performance.now() / 400 + e.x) * 0.1;
        }

        for (const a of this.arrows) {
            a.x += a.vx * (effectiveDt / 16);
            a.y += a.vy * (effectiveDt / 16);
            a.life++;
            a.trail.push({ x: a.x, y: a.y });
            if (a.trail.length > 8) a.trail.shift();
            a.vy += 0.06 * (effectiveDt / 16);
        }
        this.arrowsInFlight = this.arrows.length;
        this.arrows = this.arrows.filter(a => a.x > -50 && a.x < this.canvas.width + 50 && a.y > -50 && a.y < this.canvas.height + 50);

        for (const p of this.particles) {
            p.x += p.vx * (effectiveDt / 16);
            p.y += p.vy * (effectiveDt / 16);
            p.vy += 0.03 * (effectiveDt / 16);
            p.life -= effectiveDt;
        }
        this.particles = this.particles.filter(p => p.life > 0);

        this.updatePickups(effectiveDt);

        if (this.abilityDuration > 0) {
            this.abilityDuration -= effectiveDt;
            if (this.abilityDuration <= 0) {
                const dur = this.abilityDuration;
                window.ui.showNotification(this.activeAbility + ' ended');
                this.activeAbility = null;
                this.abilityDuration = 0;
            }
        }

        if (this.wave % 5 === 0 && this.bossWarning > 0) {
            this.bossWarning -= effectiveDt;
        }

        this.checkCollisions();

        if (this.waveEnemiesRemaining <= 0 && this.enemies.length === 0 && this.waveActive) {
            this.waveActive = false;
            if (this.wave % 5 === 0) {
                this.score += this.stage * 100;
                window.ui.showNotification('Boss Wave Complete! + Stage Bonus!');
            }
            if (this.wave >= 3 + this.stage) {
                this.endStage();
            } else {
                setTimeout(() => {
                    if (this.running && !this.gameOver) {
                        this.wave++;
                        this.waveActive = true;
                        this.waveEnemiesRemaining = this.getWaveEnemyCount();
                        this.enemySpawnTimer = 1200;
                        this.totalEnemiesInStage += this.waveEnemiesRemaining;
                        window.ui.showNotification('Wave ' + this.wave + ' - Get Ready!');
                    }
                }, 2000 / this.speed);
                this.waveActive = false;
                this.waveEnemiesRemaining = 0;
            }
        }

        if (this.lives <= 0 && !this.gameOver) {
            this.gameOver = true;
            setTimeout(() => {
                window.ui.showGameOver({ score: this.score, stage: this.stage, enemiesDefeated: this.enemiesDefeated });
            }, 800);
        }

        window.ui.updateHUD({
            stage: this.stage,
            wave: this.waveActive ? this.wave : this.wave + ' (cleared)',
            score: this.score,
            lives: this.lives,
            timeRemaining: this.timeRemaining,
            stageTime: Math.max(ARC_CONFIG.gameplay.minStageTime, ARC_CONFIG.gameplay.baseStageTime - (this.stage - 1) * ARC_CONFIG.gameplay.stageTimeDecrease),
            energy: this.energy,
            maxEnergy: this.maxEnergy,
            ability: this.activeAbility,
            abilityTime: this.abilityDuration
        });
    }

    endStage() {
        if (this.stageComplete) return;
        this.stageComplete = true;
        const timeBonus = Math.floor(this.timeRemaining * ARC_CONFIG.gameplay.timeBonusMultiplier);
        this.score += timeBonus;
        const timeLabel = this.timeRemaining > 0 ? ' ⏱️ Time Bonus: +' + timeBonus : '';
        window.ui.showNotification('Stage ' + this.stage + ' Complete!' + timeLabel, 3000);
        setTimeout(() => {
            window.ui.showStageComplete({
                score: this.score,
                enemiesDefeated: this.enemiesDefeated,
                timeBonus: timeBonus,
                stage: this.stage
            });
        }, 1200);
    }

    setSpeed(s) {
        this.speed = s;
    }

    purchaseUpgrade(type) {
        const cfg = ARC_CONFIG.upgrades;
        const upg = cfg[type];
        if (!upg) return false;
        const currentLevel = this.upgrades[type] || 0;
        if (currentLevel >= upg.maxLevel) {
            window.ui.showNotification('Max level reached!');
            return false;
        }
        const cost = upg.cost * (currentLevel + 1);
        if (WALLET_STATE.usdcBalance < cost) {
            return false;
        }

        this.recordUpgradeOnBackend(type, currentLevel + 1, cost);

        WALLET_STATE.usdcBalance -= cost;
        this.upgrades[type] = currentLevel + 1;

        switch (upg.effect) {
            case 'fireRate': this.fireRate += upg.value; break;
            case 'damage': this.damage += upg.value; break;
            case 'pierce': this.pierceCount = Math.min(5, this.pierceCount + upg.value); break;
            case 'arrowCount': this.arrowCount += upg.value; break;
            case 'lives':
                this.lives = Math.min(ARC_CONFIG.gameplay.maxLives, this.lives + upg.value);
                break;
            case 'energy':
                this.maxEnergy += upg.value;
                this.energy = Math.min(this.energy + 1, this.maxEnergy);
                break;
        }

        if (WALLET_STATE.provider) {
            updateUSDCBalance(WALLET_STATE.provider);
        }

        updateWalletUI();
        this.updateUpgradeButtons();
        return true;
    }

    async recordUpgradeOnBackend(type, level, cost) {
        if (!WALLET_STATE.address) return;

        const baseUrl = (typeof ARC_CONFIG !== 'undefined' && ARC_CONFIG.backend?.baseUrl) ? ARC_CONFIG.backend.baseUrl : 'http://localhost:3001';

        try {
            const response = await fetch(`${baseUrl}/api/upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: WALLET_STATE.address,
                    upgradeType: type,
                    level: level,
                    cost: cost
                })
            });

            if (response.ok) {
                console.log(`[BACKEND] Recorded upgrade: ${type} lvl${level} -${cost} USDC`);
            }
        } catch (err) {
            console.error('Failed to record upgrade on backend:', err);
        }
    }

    updateUpgradeButtons() {
        const types = ['speed', 'power', 'pierce', 'multi', 'extra_arrow', 'energy', 'life'];
        types.forEach(type => {
            const suffix = type === 'extra_arrow' ? 'extra-arrow' : type;
            const btn = document.getElementById('upgrade-' + suffix + '-btn');
            if (!btn) return;
            const cfg = ARC_CONFIG.upgrades[type];
            const level = this.upgrades[type] || 0;
            const cost = cfg.cost * (level + 1);
            btn.querySelector('.upgrade-cost').textContent = (level >= cfg.maxLevel ? 'MAX' : cost + ' USDC');
            if (level >= cfg.maxLevel) btn.disabled = true;
        });
    }

    destroy() {
        this.running = false;
        this.paused = false;
        this.activeAbility = null;
        this.abilityDuration = 0;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    loop(timestamp) {
        if (!this.running) return;
        const dt = Math.min(timestamp - this.lastTime, 100);
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        this.drawBackground(ctx, w, h);
        
        let shakeX = 0, shakeY = 0;
        if (this.cameraShake > 0.5) {
            shakeX = (Math.random() - 0.5) * this.cameraShake * 2;
            shakeY = (Math.random() - 0.5) * this.cameraShake * 2;
        }
        ctx.save();
        ctx.translate(shakeX, shakeY);

        this.drawTower(ctx);
        this.drawPlayer(ctx);
        for (const e of this.enemies) this.drawEnemy(ctx, e);
        for (const a of this.arrows) this.drawArrow(ctx, a);
        for (const p of this.pickups) this.drawPickup(ctx, p);
        for (const p of this.particles) this.drawParticle(ctx, p);
        
        ctx.restore();
        
        if (this.combo > 1) {
            ctx.fillStyle = '#f5a623';
            ctx.font = '700 20px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.combo + 'x COMBO!', w - 60, 30);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
        }
        
        if (this.wave % 5 === 0 && this.waveActive && this.bossWarning > 0) {
            ctx.fillStyle = '#ff3b30';
            ctx.font = 'bold 24px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ BOSS WAVE ⚡', w / 2, h / 2);
            ctx.font = '14px Inter';
            ctx.fillStyle = '#fff';
            ctx.fillText('Survive the boss!', w / 2, h / 2 + 30);
        }
        
        // Special ability indicator
        if (this.activeAbility) {
            ctx.fillStyle = this.activeAbility === 'fire' ? '#ff4500' : 
                           this.activeAbility === 'shield' ? '#3b82f6' :
                           this.activeAbility === 'slow' ? '#06b6d4' : '#f5a623';
            ctx.font = 'bold 14px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText('⚡ ' + (this.activeAbility || '').toUpperCase(), 10, 30);
        }
        
        // Energy bar
        ctx.fillStyle = '#3b82f6';
        const energyWidth = 60;
        ctx.fillRect(10, h - 24, energyWidth, 12);
        ctx.strokeStyle = '#1f2b3a';
        ctx.strokeRect(10, h - 24, energyWidth, 12);
        ctx.fillStyle = '#f5a623';
        const ePct = this.energy / this.maxEnergy;
        ctx.fillRect(12, h - 22, (energyWidth - 4) * ePct, 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(this.energy + '/' + this.maxEnergy, 10 + energyWidth / 2, h - 14);
        ctx.fillStyle = '#8a96a3';
        ctx.font = '10px Inter';
        ctx.fillText('ENERGY (1-4)', 10 + energyWidth / 2, h - 7);
    }

    drawBackground(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1f2e');
        grad.addColorStop(0.5, '#0f131d');
        grad.addColorStop(1, '#07090e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
        const t = performance.now();
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 40; i++) {
            const sx = (i * 123 + 10) % w;
            const sy = (i * 57 + 20) % (h * 0.5);
            const blink = 0.4 + 0.6 * Math.abs(Math.sin(t / 800 + i));
            ctx.globalAlpha = blink * 0.7;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        const groundY = this.tower.y + this.tower.height - 2;
        ctx.fillStyle = '#0d1218';
        ctx.fillRect(0, groundY, w, h - groundY);
        ctx.fillStyle = '#1f2b3a';
        ctx.fillRect(0, groundY - 1, w, 2);
    }

    drawTower(ctx) {
        const t = this.tower;
        ctx.fillStyle = '#05070a';
        ctx.fillRect(t.x - 10, t.y + 10, t.width + 20, t.height);
        
        const wallGrad = ctx.createLinearGradient(t.x, 0, t.x + t.width, 0);
        wallGrad.addColorStop(0, '#4a4a4a');
        wallGrad.addColorStop(0.3, '#6e6e6e');
        wallGrad.addColorStop(0.6, '#5a5a5a');
        wallGrad.addColorStop(1, '#3a3a3a');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(t.x, t.y, t.width, t.height);
        
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        for (let row = 0; row < 8; row++) {
            const y = t.y + row * 25;
            ctx.beginPath();
            ctx.moveTo(t.x, y);
            ctx.lineTo(t.x + t.width, y);
            ctx.stroke();
            const offset = (row % 2) * 20;
            for (let col = 0; col < 4; col++) {
                const x = t.x + offset + col * 40;
                if (x > t.x + 10 && x < t.x + t.width - 10) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + 25);
                    ctx.stroke();
                }
            }
        }
        
        ctx.fillStyle = '#3d3d3d';
        ctx.fillRect(t.x - 6, t.y - 12, t.width + 12, 14);
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(t.x + i * 26, t.y - 20, 20, 10);
        }
        
        const flagY = t.y - 35;
        ctx.strokeStyle = '#888';
        ctx.beginPath(); ctx.moveTo(t.x + 10, t.y); ctx.lineTo(t.x + 10, flagY); ctx.stroke();
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.moveTo(t.x + 10, flagY);
        ctx.lineTo(t.x + 40, flagY + 8);
        ctx.lineTo(t.x + 10, flagY + 16);
        ctx.fill();
        
        ctx.fillStyle = '#111';
        ctx.fillRect(t.x + 28, this.player.y + 20, 24, 40);
        
        if (this.lives <= 2) {
            ctx.strokeStyle = 'rgba(255, 59, 48, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(t.x + 20, t.y + 30);
            ctx.lineTo(t.x + 50, t.y + 70);
            ctx.moveTo(t.x + 70, t.y + 40);
            ctx.lineTo(t.x + 90, t.y + 90);
            ctx.stroke();
        }
        
        if (this.activeAbility === 'shield') {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y + 10, 30, 0, Math.PI, true);
            ctx.stroke();
        }
    }

    drawPlayer(ctx) {
        const p = this.player;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, this.tower.y + this.tower.height - 6, 20, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow when shielded
        if (this.activeAbility === 'shield') {
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 12;
        }
        
        // Body
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f5a623';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Head
        ctx.fillStyle = '#f4c29a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Eyes
        const eyeOffX = Math.cos(p.angle) * 2;
        const eyeOffY = Math.sin(p.angle) * 2;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(p.x - 3 + eyeOffX, p.y - 10 + eyeOffY, 1.5, 0, Math.PI * 2);
        ctx.arc(p.x + 3 + eyeOffX, p.y - 10 + eyeOffY, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        const recoilX = -Math.cos(p.angle) * this.recoil;
        const recoilY = -Math.sin(p.angle) * this.recoil;
        const baseX = p.x + recoilX;
        const baseY = p.y - 5 + recoilY;
        const bowLen = 32;
        const bx = baseX + Math.cos(p.angle) * bowLen;
        const by = baseY + Math.sin(p.angle) * bowLen;
        
        ctx.strokeStyle = this.activeAbility === 'fire' ? '#ff4500' : '#d4a373';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(bx, by);
        ctx.stroke();
        
        const perpX = -Math.sin(p.angle) * 12;
        const perpY = Math.cos(p.angle) * 12;
        ctx.strokeStyle = this.activeAbility === 'fire' ? '#ff6b35' : '#c49a6c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(baseX + perpX, baseY + perpY);
        ctx.quadraticCurveTo(baseX, baseY + 8, baseX - perpX, baseY - perpY);
        ctx.stroke();
        
        if (this.recoil < 3) {
            ctx.strokeStyle = '#ffffff88';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(baseX + perpX * 0.6, baseY + perpY * 0.6);
            ctx.lineTo(baseX - perpX * 0.6, baseY - perpY * 0.6);
            ctx.stroke();
        }
    }

    drawArrow(ctx, a) {
        if (a.trail.length > 1) {
            ctx.strokeStyle = a.isFire ? 'rgba(255, 69, 0, 0.5)' : 'rgba(255, 170, 100, 0.3)';
            ctx.lineWidth = a.isFire ? 2 : 1.5;
            ctx.beginPath();
            ctx.moveTo(a.trail[0].x, a.trail[0].y);
            for (let i = 1; i < a.trail.length; i++) {
                ctx.lineTo(a.trail[i].x, a.trail[i].y);
            }
            ctx.stroke();
        }
        
        const headX = a.x + Math.cos(a.angle) * 8;
        const headY = a.y + Math.sin(a.angle) * 8;
        const tailX = a.x - Math.cos(a.angle) * 6;
        const tailY = a.y - Math.sin(a.angle) * 6;
        
        ctx.strokeStyle = a.isFire ? '#ff4500' : '#e8d5b7';
        ctx.lineWidth = a.isFire ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
        
        ctx.fillStyle = a.isFire ? '#ffcc02' : '#a8a8a8';
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX - Math.cos(a.angle - 0.3) * 6, headY - Math.sin(a.angle - 0.3) * 6);
        ctx.lineTo(headX - Math.cos(a.angle + 0.3) * 6, headY - Math.sin(a.angle + 0.3) * 6);
        ctx.closePath();
        ctx.fill();
    }

    drawEnemy(ctx, e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle || 0);
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, e.size * 0.8, e.size * 0.7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = e.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        if (e.slowed > 0) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(0, 0, e.size + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = e.color;
            ctx.globalAlpha = 1;
        }
        
        switch (e.sprite) {
            case 'scrap':
                ctx.rect(-e.size / 2, -e.size / 2, e.size, e.size);
                ctx.fill(); ctx.stroke();
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -e.size / 2);
                ctx.lineTo(0, -e.size / 1.2);
                ctx.stroke();
                ctx.fillStyle = '#ff3333';
                ctx.beginPath(); ctx.arc(0, -e.size / 1.2, 2, 0, Math.PI * 2); ctx.fill();
                break;
            case 'rusty':
                ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#ff3333';
                ctx.beginPath(); ctx.arc(2, -2, 3, 0, Math.PI * 2); ctx.fill();
                break;
            case 'cog':
                ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(0, 0, e.size / 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = e.color;
                for (let i = 0; i < 6; i++) {
                    const ang = (i / 6) * Math.PI * 2;
                    ctx.fillRect(Math.cos(ang) * e.size / 3 - 2, Math.sin(ang) * e.size / 3 - 2, 4, 4);
                }
                break;
            case 'drone':
                ctx.ellipse(0, 0, e.size / 2, e.size / 3, 0, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI * 2); ctx.arc(4, 0, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#00ffaa';
                ctx.beginPath(); ctx.arc(-4, 0, 1, 0, Math.PI * 2); ctx.arc(4, 0, 1, 0, Math.PI * 2); ctx.fill();
                break;
            case 'boss':
                ctx.ellipse(0, 2, e.size / 2, e.size / 3, 0, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#ff2200';
                ctx.beginPath(); ctx.arc(0, -2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(0, -2, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = e.color;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2 + performance.now() / 500;
                    const rx = Math.cos(a) * e.size / 2;
                    const ry = Math.sin(a) * e.size / 3;
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx + Math.cos(a) * 6, ry + Math.sin(a) * 4);
                    ctx.lineTo(rx - Math.cos(a) * 3, ry - Math.sin(a) * 3);
                    ctx.fill();
                }
                break;
            case 'split':
                ctx.moveTo(0, -e.size);
                ctx.lineTo(e.size * 0.7, 0);
                ctx.lineTo(0, e.size);
                ctx.lineTo(-e.size * 0.7, 0);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                
                if (e.hp < e.maxHp) {
                    ctx.fillStyle = '#ff3333';
                    ctx.beginPath();
                    ctx.arc(e.size * 0.35, -e.size * 0.3, 2, 0, Math.PI * 2);
                    ctx.arc(-e.size * 0.35, -e.size * 0.3, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'tank':
                ctx.fillStyle = '#2c5f2a';
                ctx.fillRect(-e.size * 0.6, -e.size * 0.7, e.size * 1.2, e.size * 1.4);
                ctx.strokeRect(-e.size * 0.6, -e.size * 0.7, e.size * 1.2, e.size * 1.4);
                ctx.fillStyle = '#000';
                ctx.fillRect(-e.size * 0.5, -e.size * 0.1, e.size * 0.4, e.size * 0.2);
                ctx.fillRect(e.size * 0.1, e.size * 0.3, e.size * 0.9, e.size * 0.05);
                break;
            case 'runner':
                ctx.fillStyle = '#c97c2a';
                ctx.beginPath();
                ctx.moveTo(e.size, 0);
                ctx.lineTo(-e.size * 0.4, e.size * 0.6);
                ctx.lineTo(-e.size * 0.5, 0);
                ctx.lineTo(-e.size * 0.4, -e.size * 0.6);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(0, -2, 2, 0, Math.PI * 2); ctx.fill();
                break;
            case 'shield':
                if (e.shield > 0) {
                    ctx.fillStyle = '#4a9eff88';
                    ctx.beginPath();
                    ctx.arc(0, 0, e.size * 0.75, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                break;
            default:
                ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
        }
        
        ctx.restore();
        
        if (e.hp < e.maxHp || (e.shield && e.sprite === 'shield')) {
            const barW = e.size;
            const barH = 3;
            const barX = e.x - barW / 2;
            const barY = e.y - e.size - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            const pct = Math.max(0, e.hp / e.maxHp);
            ctx.fillStyle = e.shield > 0 ? '#4a9eff' : '#ff3b30';
            ctx.fillRect(barX, barY, barW * pct, barH);
        }
    }

    drawPickup(ctx, p) {
        const scale = 1 + Math.abs(Math.sin(performance.now() / 300)) * 0.2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(scale, scale);
        if (p.type === 'coin') {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#b8860b';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
        } else if (p.type === 'arrow') {
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const a2 = a + Math.PI / 5;
                ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
                ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
            }
            ctx.closePath();
            ctx.fill();
        } else if (p.type === 'energy') {
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', 0, 0);
        }
        ctx.restore();
    }

    drawParticle(ctx, p) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
