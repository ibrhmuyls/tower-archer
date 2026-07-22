# Tower Archer - Vercel Deployment (Arc Testnet)

Oyun zaten çalışır halde ve gerçek Arc Testnet kontratıyla bağlı.
Tek yapman gereken: GitHub repo'yu Vercel'e import etmek.

---

## Canonical Arc Testnet Config (kodda sabit, değiştirme)

- Chain ID (hex):  `0x4cef52`
- Chain ID (dec):   `5042002`
- RPC:              `https://rpc.testnet.arc.network`
- Explorer:         `https://testnet.arcscan.app`
- USDC:             `0x3600000000000000000000000000000000000000`
- Contract:         `0x5e64560d62AaE298381B19d39c1B48b759A278Fd`

---

## Vercel'e Deploy Adımları

1. Tarayıcıda aç: https://vercel.com/new
2. GitHub hesabınla giriş yap.
3. `ibrhmuyls/tower-archer` repo'sunu bul ve **Import** et.
4. Framework Preset: **Other** (veya Static)
5. Build Command: boş bırak (statik site)
6. Output Directory: boş bırak (kök dizin)
7. Environment Variables ekle:

   | Key | Value |
   |-----|-------|
   | VITE_ARC_CHAIN_ID | `0x4cef52` |
   | VITE_ARC_CHAIN_NAME | `Arc Testnet` |
   | VITE_ARC_RPC_URL | `https://rpc.testnet.arc.network` |
   | VITE_USDC_ADDRESS | `0x3600000000000000000000000000000000000000` |
   | VITE_GAME_CONTRACT_ADDRESS | `0x5e64560d62AaE298381B19d39c1B48b759A278Fd` |

8. **Deploy** butonuna tıkla.

---

## Başarı Kontrolü

- Vercel `https://tower-archer-xxxx.vercel.app` adresi verir.
- Site açılır, "Connect Wallet" butonu görünür.
- Cüzdanı bağlayınca Arc Testnet'e geçer (değilse ekleme ister).
- USDC bakiyesi blockchain'den okunur.
- Upgrade butonuna basınca MetaMask onayı çıkar, ödeme yapılır.

---

## Sorun Olursa

Hata mesajını aynen gönder. Private key istemez.
