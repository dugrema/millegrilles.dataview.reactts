import {defineConfig, UserConfig} from 'vite'
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

export default defineConfig(({command})=> {
    // https://vite.dev/config/
    const config = {
        base: '/dataviewer',
        plugins: [
            // comlink(),
            nodePolyfills({ include: [
                // For libsodium
                'crypto', 'stream', 'vm',
                // For solana
                'process',
                ] }),
            // solanaInstallPlugin(),
            tailwindcss(),
            react(),
        ]
    } as UserConfig;

    // if env is development
    if(command === 'serve') {
        config.server = {
            https: {
                key: fs.readFileSync('/var/opt/millegrilles/secrets/pki.nginx.key'),
                cert: fs.readFileSync('/var/opt/millegrilles/secrets/pki.nginx.cert'),
            },
            host: '0.0.0.0',
            allowedHosts: true
        }
    }

    return config;
});
