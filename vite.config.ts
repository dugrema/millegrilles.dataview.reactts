import {defineConfig, UserConfig} from 'vite'
import react from '@vitejs/plugin-react';
// import { comlink } from "vite-plugin-comlink";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

// import {install as solanaInstall} from '@solana/webcrypto-ed25519-polyfill';

// function solanaInstallPlugin() {
//     const plugin: Plugin = {
//         name: 'solana',
//         load() {
//             solanaInstall();
//             crypto.subtle.generateKey('Ed25519', false, ['sign'])
//                 .then(keyPair=>{
//                     console.log("Test keypair", keyPair);
//                 })
//                 .catch(error=>console.error("No subtle ed25519 polyfill", error));
//         }
//     };
//     return plugin;
// }

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
