import { expose } from 'comlink';

import {ConnectionWorker} from "millegrilles.reactdeps.typescript";

import apiMapping from './apiMapping.json';

// import {install as solanaInstall} from '@solana/webcrypto-ed25519-polyfill';
// solanaInstall();

export class AppsConnectionWorker extends ConnectionWorker {

    async authenticate(reconnect?: boolean): Promise<boolean> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return this.connection.authenticate(apiMapping, reconnect);
    }

}

const WORKER = new AppsConnectionWorker();
expose(WORKER);
