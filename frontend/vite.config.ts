import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { loadEnv } from 'vite';

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue()],
    define: {
      'import.meta.env.VITE_ARC_CHAIN_ID': JSON.stringify(env.VITE_ARC_CHAIN_ID),
      'import.meta.env.VITE_ARC_CHAIN_NAME': JSON.stringify(env.VITE_ARC_CHAIN_NAME),
      'import.meta.env.VITE_ARC_RPC_URL': JSON.stringify(env.VITE_ARC_RPC_URL),
      'import.meta.env.VITE_USDC_ADDRESS': JSON.stringify(env.VITE_USDC_ADDRESS),
      'import.meta.env.VITE_GAME_CONTRACT_ADDRESS': JSON.stringify(env.VITE_GAME_CONTRACT_ADDRESS),
      'import.meta.env.VITE_OWNER_ADDRESS': JSON.stringify(env.VITE_OWNER_ADDRESS)
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT) || 3000,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true
        }
      }
    }
  };
};
