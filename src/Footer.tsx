// import { Popover } from 'flowbite-react';

import buildManifest from './manifest.build.json';
// import {useWorkers} from "./workers/PrivateWorkerContextData.ts";

export default function Footer() {
    return (
        <footer className="fixed w-full bottom-0 text-center pt-2">
            <VersionInfo />
        </footer>
    )
}


function VersionInfo() {
    return (
        <div className='pt-0 pb-2'>
            <div className='text-sm'>MilleGrilles Data Viewer <PopoverVersion/></div>
        </div>
    );
}

function PopoverVersion() {

    // const {idmg} = useWorkers();
    const version = buildManifest.version;
    // const buildDate = buildManifest.date;

    // const content = (
    //     <div className='w-m-80 text-sm text-gray-400 border-gray-600 bg-gray-800'>
    //         <div className="px-3 py-2 border-b rounded-t-lg border-gray-600 bg-gray-700">
    //             <h3 className="font-semibold text-white">Version information</h3>
    //         </div>
    //         <div className="px-3 py-2 text-left">
    //             <p>Name: Data Viewer</p>
    //             <p>Version: {version}</p>
    //             <p>Build Date: {buildDate} (UTC)</p>
    //             <p className='break-all'>IDMG {idmg}</p>
    //         </div>
    //     </div>
    // );

    return (
        // <Popover trigger='hover' content={content}>
            <span>V{version}</span>
        // </Popover>
    );
}
