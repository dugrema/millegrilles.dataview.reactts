import useWorkers from "./workers/workers.ts";
import {Link} from "react-router-dom";
import Menu from "./MenuPrivate.tsx";
// import '@solana/webcrypto-ed25519-polyfill';

function DataViewerPrivate() {

    const [, ready] = useWorkers();

    console.info("Ready?: ", ready);

    if(!ready) {
        return (
            <PrivateSectionLayout>
                <h1 className="text-indigo-300 text-4xl sm:text-5xl font-bold pb-20">Connecting ...</h1>
                <Link to="/dataviewer"
                      className="btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>
            </PrivateSectionLayout>
        )
    }

    return (
        <PrivateSectionLayout>
            <h1 className="text-indigo-300 text-4xl sm:text-5xl font-bold pb-20">Private feeds</h1>
            <Link to="/dataviewer"
                  className="btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </PrivateSectionLayout>
    );
}

export default DataViewerPrivate;

function PrivateSectionLayout(props: {children: React.ReactNode}) {
    return (
        <>
            <Menu />
            <main id="main" className='mt-10 pb-2 pl-2 pr-6 w-full'>
                {props.children}
            </main>
        </>
    )
}
