import {Dispatch, useEffect, useMemo, useState} from "react";
import {proxy, Remote, wrap} from "comlink";

import {certificates} from "millegrilles.cryptography";
import {AppsConnectionWorker} from "./connection.worker.ts";
import {CommonTypes, ConnectionCallbackParameters, userStoreIdb} from "millegrilles.reactdeps.typescript";

export type AppWorkers = {
    connection: Remote<AppsConnectionWorker>
};

export type WorkersState = {
    workers?: AppWorkers | null,
    ready?: boolean,
    username?: string | null,
    connectionState?: ConnectionCallbackParameters | null,
};

const SOCKETIO_PATH = '/millegrilles/socket.io';

let workersOuterTriggered = false;
// let workersOuter: AppWorkers | null = null;

async function initializeOuterWorkers(cb: (params: ConnectionCallbackParameters) => void) {
    // if(workersOuterTriggered) {
    //     console.warn("Subsequent call to initializeOuterWorkers");
    //     return;
    // }
    // workersOuterTriggered = true;

    const username = await verifyAuthentication();
    console.debug("Username %s", username);
    if(!username) {
        throw new Error("User is not authenticated");
    }
    const cbProxy = proxy(cb);
    const result = await initializeWorkers(cbProxy);
    // workersOuter = result.workers;

    console.debug("Connecting...");
    const response = await result.workers.connection.connect();
    console.info("Connection response", response);

    return {username, result};
}

function useWorkers() {
    const [workers, setWorkers] = useState<AppWorkers | null>(null);
    const [connectionCallbackParams, setConnectionCallbackParams] = useState<ConnectionCallbackParameters | null>(null);
    const [username, setUsername] = useState("");
    const [authenticating, setAuthenticating] = useState(false);

    const ready = useMemo(()=>{
        console.debug("connectionCallbackParams", connectionCallbackParams);
        if(!connectionCallbackParams) return false;
        return connectionCallbackParams?.connected && connectionCallbackParams?.authenticated;
    }, [connectionCallbackParams]);

    // Initialize workers
    useEffect(()=>{
        if(workers) {
            // Cleanup workers when closing private section
            return () => {
                // Timeout to avoid double-load in dev
                setTimeout(()=>{workersOuterTriggered = false;}, 5);
            };
        }

        if(workersOuterTriggered) return;
        workersOuterTriggered = true;

        initializeOuterWorkers(setConnectionCallbackParams).then((result) => {
            if(result) {
                setWorkers(result.result.workers);
                setUsername(result.username);
            }
        })
        .catch(error => {
            console.error("initializeOuterWorkers failed", error);
        })
    }, [workers, setConnectionCallbackParams, setWorkers, setUsername]);

    // Authenticate
    useEffect(()=> {
        if(authenticating) return;  // Already authenticating
        if(workers && username && connectionCallbackParams?.connected && !connectionCallbackParams?.authenticated) {
            // Prevent quick loop
            setAuthenticating(true);
            setTimeout(()=>setAuthenticating(false), 5_000);  // retry every 5 seconds

            // Authenticate
            console.debug("Authenticating");
            authenticateConnectionWorker(workers, username, true, false)
                .then(result=>{
                    console.debug("Authenticated ", result);
                })
                .catch(err=>console.error("Authentication error: ", err));
        }
    }, [workers, username, connectionCallbackParams, authenticating, setAuthenticating]);

    return [workers, ready, username, connectionCallbackParams];
}

export default useWorkers;

export type InitWorkersResult = {
    fiche: LoadFicheResult,
    workers: AppWorkers,
}

async function verifyAuthentication() {
    const response = await fetch('/auth/verifier_usager');
    console.debug("Response authentication", response);
    const userStatus = response.status;
    const username = response.headers.get('x-user-name');
    if(userStatus === 200 && username) {
        console.debug("User %s is propertly authenticated", username);
        return username;
    } else {
        console.warn("User is not propertly authenticated");
        return null
    }
}

async function initializeWorkers(setConnectionCallbackParams: Dispatch<ConnectionCallbackParameters>): Promise<InitWorkersResult> {
    const fiche = await loadFiche();

    console.debug("Fiche loaded %O, init workers", fiche);
    // const connection = new ComlinkWorker(new URL('./connection.worker.ts', import.meta.url)) as Remote<AppsConnectionWorker>;
    const connectionWorker = new Worker(new URL('./connection.worker.ts', import.meta.url), { type: "module" });
    const connection = wrap(connectionWorker) as Remote<AppsConnectionWorker>;

    // Set-up the workers
    const serverUrl = new URL(window.location.href);
    serverUrl.pathname = SOCKETIO_PATH;
    console.info("Connect to server url ", serverUrl);

    const setConnectionProxy = proxy(setConnectionCallbackParams);
    const response = await connection.initialize(serverUrl.href, fiche.ca, setConnectionProxy, {reconnectionDelay: 7500});
    console.debug("Connection initialized:", response);

    if(response) {
        console.debug("Connection initialized %s, connecting", response);
        await connection.connect();
    } else {
        throw new Error("Error initializing workers");
    }

    const workers = {connection};

    return {fiche, workers};
}

type LoadFicheResult = {
    ca: string,
    idmg: string,
    chiffrage: Array<Array<string>>,
}

async function loadFiche(): Promise<LoadFicheResult> {
    const ficheResponse = await fetch('/fiche.json');
    if(ficheResponse.status !== 200) {
        throw new Error(`Loading fiche.json, invalid response (${ficheResponse.status})`)
    }
    const fiche = await ficheResponse.json();

    const content = JSON.parse(fiche['contenu']);
    const {idmg, ca, chiffrage} = content;

    // Verify IDMG with CA
    const idmgVerif = await certificates.getIdmg(ca);
    if(idmgVerif !== idmg) throw new Error("Mismatch IDMG/CA certificate");

    console.info("IDMG: ", idmg);

    // Verify the signature.
    const store = new certificates.CertificateStore(ca);
    let result: certificates.CertificateWrapper | boolean = false;
    try {
        result = await store.verifyMessage(fiche);
    } catch (error) {
        console.error("error verifying message", error);
        throw error;
    }
    if(!result) throw new Error('While loading fiche.json: signature was rejected.');  // Throws Error if invalid

    // Return the content
    return {idmg, ca, chiffrage};
}

/**
 * Connect using socket-io.
 * @param workers
 * @param username
 * @param userSessionActive
 * @returns
 */
async function authenticateConnectionWorker(workers: AppWorkers, username: string,
                                            userSessionActive: boolean, reconnect?: boolean): Promise<CommonTypes.PerformLoginResult>
{
    if(!workers) return {};  // Waiting for a connection
    if(reconnect !== false) reconnect = true;

    if(!userSessionActive || !username) {
        // User session is not active. We need to manually authenticate.
        // setMustManuallyAuthenticate(true);
        return { mustManuallyAuthenticate: true };
    }

    // There is a user session (cookie) and a username in the server session.
    // Check if we have a valid signing key/certificate for this user.
    const userDbInfo = await userStoreIdb.getUser(username)
    if(!userDbInfo) {
        // No local information (certificate).
        return { mustManuallyAuthenticate: true };
    }

    const certificateInfo = userDbInfo.certificate;
    if(!certificateInfo) {
        // No certificate. The user must authenticate manually.
        return { mustManuallyAuthenticate: true };
    }

    const wrapper = new certificates.CertificateWrapper(certificateInfo.certificate);

    // Check if the certificate is expired
    const expiration = wrapper.certificate.notAfter;
    const now = new Date();
    if(now > expiration) {
        throw new Error("User certificate is expired");
    }

    // Initialize the message factory with the user's information.
    const { privateKey, certificate } = certificateInfo;
    await workers.connection.prepareMessageFactory(privateKey, certificate);

    // Authenticate the connection
    if(!await workers.connection.authenticate(reconnect)) throw new Error('Authentication failed (api mapping)');

    return { authenticated: true };
}
