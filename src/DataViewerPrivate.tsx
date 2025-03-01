import useWorkers from "./workers/workers.ts";
import {Link} from "react-router-dom";
// import '@solana/webcrypto-ed25519-polyfill';

function DataViewerPrivate() {

    const [, ready] = useWorkers();

    if(!ready) {
        return (
            <div className="w-full text-center margin-auto p-10">
                <h1 className="text-indigo-300 text-4xl sm:text-5xl font-bold pb-20">Connecting ...</h1>
                <Link to="/dataviewer"
                      className="btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>
            </div>
        )
    }

    return (
        <div className="w-full text-center margin-auto p-10">
            <h1 className="text-indigo-300 text-4xl sm:text-5xl font-bold pb-20">Private feeds</h1>
            <Link to="/dataviewer"
                  className="btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </div>
    );
}

export default DataViewerPrivate;
