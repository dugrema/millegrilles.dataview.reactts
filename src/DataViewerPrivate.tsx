import useWorkers from "./workers/workers.ts";

function DataViewerPrivate() {

    const [, ready] = useWorkers();

    if(!ready) {
        return <>Your account is loading...</>;
    }

    return <>Private</>;
}

export default DataViewerPrivate;
