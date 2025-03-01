import {createContext, useContext} from "react";
import {WorkersState} from "./workers.ts";

// Note : splitting Context tsx from non JSX (ts) components to allow vite fast-refresh.

export const PrivateWorkerContextData = createContext({ready: false} as WorkersState);

export function useWorkers() {
    return useContext(PrivateWorkerContextData);
}
