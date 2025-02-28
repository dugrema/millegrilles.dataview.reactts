import {Dispatch, useEffect, useMemo, useState} from "react";
import {proxy, Remote, wrap} from "comlink";
import {certificates} from "millegrilles.cryptography";
import {AppsConnectionWorker} from "./connection.worker.ts";
import {ConnectionCallbackParameters} from "millegrilles.reactdeps.typescript";

export type AppWorkers = {
    connection: Remote<AppsConnectionWorker>
};

const SOCKETIO_PATH = '/millegrilles/socket.io';

function useWorkers() {
    const [workers, setWorkers] = useState<AppWorkers | null>(null);
    const [connectionCallbackParams, setConnectionCallbackParams] = useState<ConnectionCallbackParameters | null>(null);

    const ready = useMemo(()=>{
        console.debug("connectionCallbackParams", connectionCallbackParams);
        if(!connectionCallbackParams) return false;
        return connectionCallbackParams?.connected && connectionCallbackParams?.authenticated;
    }, [connectionCallbackParams])

    useEffect(() => {
        console.debug("Initializing workers? (workers; %O)", workers);
        if(workers) return;  // Already loaded
        console.info("Initializing workers!");
        initializeWorkers(setConnectionCallbackParams).then(async result => {
            console.info("Initializing workers result", result);
            setWorkers(result.workers);
            const response = await result.workers.connection.connect();
            console.info("Connection response", response);
        })
        .catch(err=>console.error("Error connecting to server", err));
    }, [workers, setWorkers]);

    return [workers, ready, connectionCallbackParams];
}

export default useWorkers;

export type InitWorkersResult = {
    fiche: LoadFicheResult,
    workers: AppWorkers,
}

async function initializeWorkers(setConnectionCallbackParams: Dispatch<ConnectionCallbackParameters>): Promise<InitWorkersResult> {
    const fiche = await loadFiche();

    const connectionWorker = new Worker(new URL('./connection.worker.ts', import.meta.url));
    const connection = wrap(connectionWorker) as Remote<AppsConnectionWorker>;

    // Set-up the workers
    const serverUrl = new URL(window.location.href);
    // serverUrl.protocol = "https:";
    // serverUrl.hostname = "bureau1.maple.maceroc.com";
    serverUrl.port = '443';
    serverUrl.pathname = SOCKETIO_PATH;
    console.debug("Connect to server url ", serverUrl);
    const setConnectionProxy = proxy(setConnectionCallbackParams);
    const response = await connection.initialize(serverUrl.href, fiche.ca, setConnectionProxy, {reconnectionDelay: 7500});
    console.debug("Connected to server:", response);

    const workers = {connection};

    return {fiche, workers};
}

type LoadFicheResult = {
    ca: string,
    idmg: string,
    chiffrage: Array<Array<string>>,
}

async function loadFiche(): Promise<LoadFicheResult> {

    const ficheUrl = new URL(window.location.href);
    ficheUrl.protocol = "https:";
    ficheUrl.host = 'bureau1.maple.maceroc.com';
    ficheUrl.pathname = '/fiche.json';
    ficheUrl.port = '443';

    const ficheResponse = await fetch(ficheUrl);
    if(ficheResponse.status !== 200) {
        throw new Error(`Loading fiche.json, invalid response (${ficheResponse.status})`)
    }
    const fiche = await ficheResponse.json();
    console.debug('Fiche text ', fiche);

    const content = JSON.parse(fiche['contenu']);
    const {idmg, ca, chiffrage} = content;

    // Verify IDMG with CA
    const idmgVerif = await certificates.getIdmg(ca);
    if(idmgVerif !== idmg) throw new Error("Mismatch IDMG/CA certificate");

    console.info("IDMG: ", idmg);

    // Verify the signature.
    const store = new certificates.CertificateStore(ca);
    if(! await store.verifyMessage(fiche)) throw new Error('While loading fiche.json: signature was rejected.');  // Throws Error if invalid

    // Return the content
    return {idmg, ca, chiffrage};
}
