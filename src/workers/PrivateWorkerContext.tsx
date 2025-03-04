import {useEffect, useMemo, useState} from "react";
import {PrivateWorkerContextData} from "./PrivateWorkerContextData.ts";
import {ConnectionCallbackParameters} from "millegrilles.reactdeps.typescript";
import {AppWorkers, authenticateConnectionWorker, initializeOuterWorkers} from "./userConnect.ts";

let workersOuterTriggered = false;

export function PrivateWorkerContext(props: {children: React.ReactNode}) {
    const [workers, setWorkers] = useState<AppWorkers | null>(null);
    const [connectionCallbackParams, setConnectionCallbackParams] = useState<ConnectionCallbackParameters | null>(null);
    const [username, setUsername] = useState("");
    const [authenticating, setAuthenticating] = useState(false);
    const [idmg, setIdmg] = useState("");
    const [userId, setUserId] = useState("");

    const ready = useMemo(()=>{
        // console.debug("connectionCallbackParams", connectionCallbackParams);
        if(!connectionCallbackParams) return false;
        return connectionCallbackParams?.connected && connectionCallbackParams?.authenticated;
    }, [connectionCallbackParams]);

    const workerState = useMemo(()=>{
        return {workers, ready, username, connectionCallbackParams, idmg, userId};
    }, [workers, ready, username, connectionCallbackParams, idmg, userId]);

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

    // console.debug("Worker state: ", workerState);

    return (
        <PrivateWorkerContextData value={workerState}>
            {props.children}
        </PrivateWorkerContextData>
    );
}
