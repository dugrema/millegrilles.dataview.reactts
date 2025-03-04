import {useEffect, useMemo, useState} from "react";
import {PrivateWorkerContextData} from "./PrivateWorkerContextData.ts";
import {ConnectionCallbackParameters} from "millegrilles.reactdeps.typescript";
import {AppWorkers, authenticateConnectionWorker, initializeOuterWorkers} from "./userConnect.ts";
import {messageStruct} from "millegrilles.cryptography";

let workersOuterTriggered = false;

export function PrivateWorkerContext(props: {children: React.ReactNode}) {
    const [workers, setWorkers] = useState<AppWorkers | null>(null);
    const [connectionCallbackParams, setConnectionCallbackParams] = useState<ConnectionCallbackParameters | null>(null);
    const [username, setUsername] = useState("");
    const [authenticating, setAuthenticating] = useState(false);
    const [idmg, setIdmg] = useState("");
    const [userId, setUserId] = useState("");

    // Filehosts
    const [filehostId, setFilehostId] = useState("");
    const [filehostAuthenticated, setFilehostAuthenticated] = useState(false);

    const ready = useMemo(()=>{
        // console.debug("connectionCallbackParams", connectionCallbackParams);
        if(!connectionCallbackParams) return false;
        return connectionCallbackParams?.connected && connectionCallbackParams?.authenticated;
    }, [connectionCallbackParams]);

    const workerState = useMemo(()=>{
        return {workers, ready, username, connectionCallbackParams, idmg, userId, filehostId, filehostAuthenticated};
    }, [workers, ready, username, connectionCallbackParams, idmg, userId, filehostId, filehostAuthenticated]);

    useEffect(()=>{
        if(!connectionCallbackParams) return;
        if(connectionCallbackParams?.idmg) setIdmg(connectionCallbackParams.idmg);
        if(connectionCallbackParams?.userId) setUserId(connectionCallbackParams.userId);
    }, [connectionCallbackParams, setIdmg, setUserId]);

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
            } else {
                console.error("initializeOuterWorkers failed to initialize");
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
            // console.debug("Authenticating");
            authenticateConnectionWorker(workers, username, true, false)
                .then(result=>{
                    console.debug("Authenticated ", result);
                })
                .catch(err=>console.error("Authentication error: ", err));
        }
    }, [workers, username, connectionCallbackParams, authenticating, setAuthenticating]);

    // Filehost connection
    // Load pre-selected filehostId from localStorage. May come from collections2.
    useEffect(()=>{
        if(!userId) return;
        const filehostId = localStorage.getItem(`filehost_${userId}`) || 'LOCAL';
        if(filehostId) {
            // console.debug("Initializing with filehostId:%s", filehostId);
            setFilehostId(filehostId);
        }
    }, [userId, setFilehostId]);

    // Trigger a reauthentication for a newly selected filehostId
    useEffect(()=>{
        console.debug("Changing filehost id to", filehostId);
        setFilehostAuthenticated(false);
    }, [filehostId, setFilehostAuthenticated]);

    // Connect to filehost. This resets on first successful connection to a longer check interval.
    useEffect(()=>{
        // console.debug("useEffect maintain filehostAuthenticated:%s, filehostId:%s", filehostAuthenticated, filehostId);
        if(!workers || !ready || !userId || !filehostId) return;

        let filehostIdInner = filehostId;
        if(filehostIdInner === 'LOCAL') filehostIdInner = '';  // Reset filehost placeholder value

        if(!filehostAuthenticated) {
            // Initial connection attempt
            maintainFilehosts(workers, filehostIdInner, setFilehostAuthenticated)
                .catch(err=>console.error("Error during filehost initialization", err));
        }

        // Retry every 15 seconds if not authenticated. Reauth every 10 minutes if ok.
        const intervalMillisecs = filehostAuthenticated?600_000:15_000;

        const interval = setInterval(()=>{
            if(!workers) throw new Error('workers not initialized');
            maintainFilehosts(workers, filehostIdInner, setFilehostAuthenticated)
                .catch(err=>console.error("Error during filehost maintenance", err));
        }, intervalMillisecs);

        return () => {
            clearInterval(interval);
        }
    }, [workers, ready, filehostAuthenticated, filehostId, setFilehostAuthenticated, userId]);

    return (
        <PrivateWorkerContextData value={workerState}>
            {props.children}
        </PrivateWorkerContextData>
    );
}

async function maintainFilehosts(workers: AppWorkers, filehostId: string | null, setFilehostAuthenticated: (authenticated: boolean)=>void) {
    const filehostResponse = await workers.connection.getFilehosts();
    if(!filehostResponse.ok) throw new Error('Error loading filehosts: ' + filehostResponse.err);

    // console.debug("maintainFilehost with id:%s, list received: %O", filehostId, filehostResponse);

    const list = filehostResponse.list;
    try {
        if(list) {
            await workers.encryption.setFilehostList(list);
            const localUrl = new URL(window.location.href);
            localUrl.pathname = ''
            localUrl.search = ''
            await workers.encryption.selectFilehost(localUrl.href, filehostId);

            // Generate an authentication message
            const caPem = (await workers.connection.getMessageFactoryCertificate()).pemMillegrille;
            if(!caPem) throw new Error('CA certificate not available');
            const authMessage = await workers.connection.createRoutedMessage(
                messageStruct.MessageKind.Command, {}, {domaine: 'filehost', action: 'authenticate'});
            authMessage.millegrille = caPem;

            await workers.encryption.authenticateFilehost(authMessage);

            setFilehostAuthenticated(true);

        } else {
            console.warn("No filehost available on this system");
            setFilehostAuthenticated(false);
        }
    } catch(err) {
        setFilehostAuthenticated(false);
        throw err;
    }
}
