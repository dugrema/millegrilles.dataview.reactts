import useWorkers from "./workers/workers.ts";
// import '@solana/webcrypto-ed25519-polyfill';

function DataViewerPrivate() {

    const [, ready] = useWorkers();

    if(!ready) {
        return <>Your account is loading...</>;
    }

    return <>Private ready</>;
}

export default DataViewerPrivate;
