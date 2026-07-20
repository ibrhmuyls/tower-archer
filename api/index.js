const RPC_URL = process.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const USDC = '0x3600000000000000000000000000000000000000';
const state = new Map();

function json(body, status = 200) {
  return { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}

function parseJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const data = await res.json();
  return data.result;
}

async function getUSDCBalance(address) {
  try {
    const addressHex = '0x' + address.slice(2).padStart(64, '0');
    const abiEncoded = '0x70a08231' + addressHex.slice(2).padStart(64, '0');
    const result = await rpc('eth_call', [{ to: USDC, data: abiEncoded }, 'latest']);
    if (result && result !== '0x0') {
      const rawNum = BigInt(result);
      return Number(rawNum) / 1e6;
    }
  } catch (err) {
    console.error('RPC balance fetch failed:', err);
  }
  return 0;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'POST' && pathname === '/api/upgrade') {
      const payload = await parseJson(req);
      const { address, upgradeType, level, cost } = payload;

      if (!address || !upgradeType || Number.isNaN(level) || Number.isNaN(cost)) {
        res.status(400).json({ error: 'address, upgradeType, level, cost required' });
        return;
      }

      if (!state.has(address)) {
        state.set(address, { address, spent: 0, upgrades: {}, baseBalance: 0 });
      }

      const account = state.get(address);
      account.spent += cost;
      account.upgrades[`${upgradeType}#${level}`] = { upgradeType, level, cost, timestamp: Date.now() };

      console.log(`[UPGRADE] ${address.slice(0,6)}...${address.slice(-4)} -> ${upgradeType} lvl${level} -${cost} USDC (total spent: ${account.spent})`);

      res.status(200).json({ ok: true, spent: account.spent, upgrade: account.upgrades[`${upgradeType}#${level}`] });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/sync') {
      const payload = await parseJson(req);
      const { address } = payload;

      if (!address || !address.startsWith('0x')) {
        res.status(400).json({ error: 'valid address required' });
        return;
      }

      const realBalance = await getUSDCBalance(address);

      if (!state.has(address)) {
        state.set(address, { address, spent: 0, upgrades: {}, baseBalance: realBalance });
      } else {
        state.get(address).baseBalance = realBalance;
      }

      const account = state.get(address);
      const available = Math.max(0, account.baseBalance - account.spent);

      console.log(`[SYNC] ${address.slice(0,6)}...${address.slice(-4)} -> real balance: ${realBalance}, spent: ${account.spent}, available: ${available}`);

      res.status(200).json({ address, baseBalance: realBalance, spent: account.spent, available, upgrades: account.upgrades });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/balance/')) {
      const address = decodeURIComponent(pathname.replace('/api/balance/', ''));

      if (!address || !address.startsWith('0x')) {
        res.status(400).json({ error: 'valid address required' });
        return;
      }

      const account = state.get(address) || { address, spent: 0, upgrades: {}, baseBalance: 0 };
      const available = Math.max(0, account.baseBalance - account.spent);

      console.log(`[BALANCE] ${address.slice(0,6)}...${address.slice(-4)} -> base: ${account.baseBalance}, spent: ${account.spent}, available: ${available}`);

      res.status(200).json({ address, baseBalance: account.baseBalance, spent: account.spent, available, upgrades: account.upgrades });
      return;
    }

    res.status(404).json({ error: 'Not Found' });
  } catch (err) {
    console.error('Request error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
