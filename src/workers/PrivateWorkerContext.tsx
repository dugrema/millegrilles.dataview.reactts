import {useEffect, useMemo, useState} from "react";
import {AppWorkers} from "./workers.ts";
import {PrivateWorkerContextData} from "./PrivateWorkerContextData.ts";

export function PrivateWorkerContext(props: {children: React.ReactNode}) {
    const [workers, setWorkers] = useState<AppWorkers | null>(null);
    const [ready, setReady] = useState<boolean>(false);

    const workerState = useMemo(()=>{
        return {workers, ready};
    }, [workers, ready]);

    useEffect(() => {
        console.info("PrivateWorkerContext ready");
        setReady(true);
    }, [setReady]);

    console.debug("Worker state: ", workerState);

    return (
        <PrivateWorkerContextData value={workerState}>
            {props.children}
        </PrivateWorkerContextData>
    );
}
