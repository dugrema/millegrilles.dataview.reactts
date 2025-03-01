import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { comlink } from "vite-plugin-comlink";
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig({
    base: '/dataviewer',
    server: {
        https: {
            key: fs.readFileSync('/var/opt/millegrilles/secrets/pki.nginx.key'),
            cert: fs.readFileSync('/var/opt/millegrilles/secrets/pki.nginx.cert'),
        },
        host: '0.0.0.0',
        allowedHosts: true
    },
    plugins: [
        // comlink(),
        react(),
    ]
    // ,
    // worker: {
    //     plugins: () => [comlink()],
    // }
})
