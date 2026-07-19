// Tower Archer - Wallet Connect (robust multi-wallet)
window.availableWallets = [];

async function detectWallets() {
    const wallets = [];
    const addIfPresent = (name, provider) => {
        if (provider && !wallets.some(w => w.provider === provider)) {
            wallets.push({ name, provider });
        }
    };

    addIfPresent('Injected Wallet', window.ethereum);
    addIfPresent('Rabby', window.rabby);
    addIfPresent('Trust Wallet', window.trustwallet);
    addIfPresent('Exodus', window.exodus);
    addIfPresent('Tokenary', window.tokenary);
    addIfPresent('Coinbase', window.coinbaseWalletExtension);

    // Coinbase Smart Wallet / WalletLink sometimes sits on ethereum with isCoinbaseWallet
    if (window.ethereum && window.ethereum.isCoinbaseWallet && !wallets.some(w => w.name === 'Coinbase')) {
        wallets.push({ name: 'Coinbase', provider: window.ethereum });
    }

    window.availableWallets = wallets;
    return wallets;
}

async function resolveProvider(walletIndex = 0) {
    // Direct check first
    if (window.ethereum && walletIndex === 0) return window.ethereum;

    // Wait for initialization event
    await new Promise((resolve) => {
        let done = false;
        const finish = (p) => {
            if (!done) { done = true; cleanup(); resolve(p); }
        };
        const cleanup = () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('ethereum#initialized', onInit);
        };
        const onInit = () => finish(window.ethereum);
        window.addEventListener('ethereum#initialized', onInit, { once: true });
        const interval = setInterval(() => {
            if (window.ethereum) finish(window.ethereum);
        }, 80);
        const timer = setTimeout(() => { cleanup(); resolve(null); }, 4000);
    });

    if (walletIndex === 0) return window.ethereum || null;
    return window.availableWallets[walletIndex - 1]?.provider || null;
}

async function connectWallet(walletIndex = 0) {
    let provider = await resolveProvider(walletIndex);
    let targetProvider = provider;

    if (!targetProvider) {
        const wallets = await detectWallets();
        if (!wallets.length) {
            window.ui?.showNotification('Cüzdan bulunamadı! MetaMask/Rabby kurun.', 4000);
            return;
        }
        // Use first detected wallet
        targetProvider = wallets[0].provider;
        window.ui?.showNotification(wallets[0].name + ' tespit edildi, bağlanıyor...');
    }

    if (!targetProvider?.request) {
        window.ui?.showNotification('Seçilen cüzdan istek yöntemini desteklemiyor.', 4000);
        return;
    }

    try {
        const accounts = await targetProvider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        WALLET_STATE.connected = true;
        WALLET_STATE.address = address;
        WALLET_STATE.provider = targetProvider;
        updateWalletUI();
        window.ui?.showNotification('Cüzdan bağlandı: ' + address.slice(0, 6) + '...' + address.slice(-4));
        if (window.game) window.game.updateUpgradeButtons();
    } catch (err) {
        console.error('Wallet connection failed:', err);
        if (err?.code === 4001) {
            window.ui?.showNotification('Bağlantı reddedildi', 3000);
        } else if (err?.message?.toLowerCase().includes('user rejected')) {
            window.ui?.showNotification('Bağlantı reddedildi', 3000);
        } else {
            window.ui?.showNotification('Cüzdan bağlantısı başarısız', 4000);
        }
    }
}

async function updateUSDCBalance(provider) {
    if (!provider || !WALLET_STATE.connected || !WALLET_STATE.address) return;
    
    const addr = WALLET_STATE.address;
    if (typeof addr === 'string' && addr.startsWith('0x')) {
        try {
            const baseUrl = (typeof ARC_CONFIG !== 'undefined' && ARC_CONFIG.backend?.baseUrl) ? ARC_CONFIG.backend.baseUrl : 'http://localhost:3001';
            const backendRes = await fetch(`${baseUrl}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: addr })
            });
            if (backendRes.ok) {
                const backendData = await backendRes.json();
                if (backendData && typeof backendData.available === 'number') {
                    WALLET_STATE.usdcBalance = Math.max(0, backendData.available);
                    updateWalletUI();
                    return;
                }
            }
        } catch (err) {
            console.error('Backend sync failed:', err);
        }
    }
    
    try {
        const code = await provider.request({
            method: 'eth_getCode',
            params: [ARC_CONFIG.contracts.usdc, 'latest']
        });
        if (!code || code === '0x') {
            const raw = await provider.request({
                method: 'eth_getBalance',
                params: [WALLET_STATE.address, 'latest']
            });
            if (raw && raw !== '0x0') {
                const rawNum = BigInt(raw);
                WALLET_STATE.usdcBalance = Number(rawNum) / 1e6;
                updateWalletUI();
                return;
            }
        }

        const addressHex = '0x' + WALLET_STATE.address.slice(2).padStart(64, '0');
        const abiEncoded = '0x70a08231' + addressHex.slice(2).padStart(64, '0');
        const result = await provider.request({
            method: 'eth_call',
            params: [{ to: ARC_CONFIG.contracts.usdc, data: abiEncoded }, 'latest']
        });

        if (result && result !== '0x0') {
            const rawNum = BigInt(result);
            WALLET_STATE.usdcBalance = Number(rawNum) / 1e6;
        } else {
            WALLET_STATE.usdcBalance = 0;
        }
    } catch (err) {
        console.error('Balance fetch failed:', err);
    }
    updateWalletUI();
}

function updateWalletUI() {
    const btn = document.getElementById('connect-wallet-btn');
    const addrEl = document.getElementById('wallet-address');
    const balanceEl = document.getElementById('usdc-balance');
    if (!btn || !addrEl || !balanceEl) return;

    if (WALLET_STATE.connected) {
        btn.textContent = 'Disconnect';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        addrEl.textContent = WALLET_STATE.address.slice(0, 6) + '...' + WALLET_STATE.address.slice(-4);
        addrEl.style.color = '#34c759';
        balanceEl.textContent = Number(WALLET_STATE.usdcBalance || 0).toFixed(2);
    } else {
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        addrEl.textContent = 'Not Connected';
        addrEl.style.color = '#8a96a3';
        balanceEl.textContent = '0.00';
    }
}

function setupWallet() {
    const btn = document.getElementById('connect-wallet-btn');
    const picker = document.getElementById('wallet-picker');
    const list = document.getElementById('wallet-list');
    const closeBtn = document.getElementById('wallet-picker-close');
    if (!btn) return;

    const renderPicker = (wallets) => {
        if (!list) return;
        list.innerHTML = '';
        if (!wallets.length) {
            list.innerHTML = '<div style="color:#8a96a3;font-size:13px;">No injected wallets detected.<br>Install MetaMask, Rabby, or Trust Wallet and reload.</div>';
            return;
        }
        wallets.forEach((w, idx) => {
            const item = document.createElement('div');
            item.className = 'wallet-option';
            item.innerHTML = `<div class="wo-name">${w.name}</div><div class="wo-meta">Click to connect</div>`;
            item.addEventListener('click', async () => {
                picker.classList.add('hidden');
                await connectWallet(idx);
            });
            list.appendChild(item);
        });
    };

    btn.addEventListener('click', async () => {
        if (WALLET_STATE.connected) {
            WALLET_STATE.connected = false;
            WALLET_STATE.address = null;
            WALLET_STATE.usdcBalance = 0;
            WALLET_STATE.provider = null;
            updateWalletUI();
            if (window.game) window.game.updateUpgradeButtons();
            window.ui?.showNotification('Cüzdan bağlantısı kesildi');
            return;
        }

        const wallets = await detectWallets();
        if (!wallets.length) {
            window.ui?.showNotification('Cüzdan bulunamadı! MetaMask/Rabby kurun.', 4000);
            return;
        }

        if (wallets.length === 1) {
            await connectWallet(0);
        } else if (picker && list) {
            renderPicker(wallets);
            picker.classList.remove('hidden');
        } else {
            await connectWallet(0);
        }
    });

    if (closeBtn && picker) {
        closeBtn.addEventListener('click', () => picker.classList.add('hidden'));
    }

    if (window.ethereum) {
        window.ethereum.on && window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts && accounts[0]) {
                WALLET_STATE.address = accounts[0];
                updateWalletUI();
            } else {
                WALLET_STATE.connected = false;
                WALLET_STATE.address = null;
                updateWalletUI();
            }
        });
        window.ethereum.on && window.ethereum.on('chainChanged', () => {
            if (WALLET_STATE.connected && WALLET_STATE.provider) {
                updateUSDCBalance(WALLET_STATE.provider);
            }
        });
    }

    setInterval(async () => {
        if (WALLET_STATE.connected && window.game && WALLET_STATE.provider) {
            await updateUSDCBalance(WALLET_STATE.provider);
        }
    }, 15000);
}

window.addEventListener('load', async () => {
    await detectWallets();
});
