import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig({
    base: '/dataviewer',
    server: {
        https: {
            key: fs.readFileSync('/var/opt/millegrilles/secrets/pki.web.key'),
            cert: fs.readFileSync('/var/opt/millegrilles/secrets/pki.web.cert'),
        },
        host: '0.0.0.0',
        allowedHosts: true
    },
    plugins: [react()],
})
