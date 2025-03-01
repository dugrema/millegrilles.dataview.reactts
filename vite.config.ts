import {defineConfig, UserConfig} from 'vite'
import react from '@vitejs/plugin-react'
// import { comlink } from "vite-plugin-comlink";
import fs from 'fs';

// https://vite.dev/config/
const config = {
    base: '/dataviewer',
    plugins: [
        // comlink(),
        react(),
    ]
} as UserConfig;

// if env DEV
if (process.env.NODE_ENV === 'development') {
    config.server = {
        https: {
            key: fs.readFileSync('/var/opt/millegrilles/secrets/pki.nginx.key'),
            cert: fs.readFileSync('/var/opt/millegrilles/secrets/pki.nginx.cert'),
        },
        host: '0.0.0.0',
        allowedHosts: true
    }
}

export default defineConfig(config);
