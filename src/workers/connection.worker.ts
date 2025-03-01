// import '@solana/webcrypto-ed25519-polyfill';
import { expose } from 'comlink';

import {ConnectionWorker} from "millegrilles.reactdeps.typescript";

import apiMapping from './apiMapping.json';

export class AppsConnectionWorker extends ConnectionWorker {

    async authenticate(reconnect?: boolean): Promise<boolean> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return this.connection.authenticate(apiMapping, reconnect);
    }

    async waitTest() {
        console.debug("Allo");
        await new Promise(resolve=>{setTimeout(resolve,1000)});
        return 'Toi';
    }

}

const WORKER = new AppsConnectionWorker();
expose(WORKER);
