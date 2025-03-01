import {Outlet} from "react-router-dom";
import Menu from "./MenuPrivate.tsx";
import {PrivateWorkerContext} from "./workers/PrivateWorkerContext.tsx";
import Footer from "./Footer.tsx";
// import '@solana/webcrypto-ed25519-polyfill';

function DataViewerPrivate() {
    return (
        <PrivateWorkerContext>
            <Menu />
            <main id="main" className="pt-4 pb-2 pl-2 pr-6 w-full">
                <Outlet />
            </main>
            <Footer/>
        </PrivateWorkerContext>
    );
}

export default DataViewerPrivate;
