import {Link, useParams} from "react-router-dom";
import {useGetData} from "./GetData.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import ActionButton from "./ActionButton.tsx";
import SwitchButton from "./SwitchButton.tsx";

function AddFeedView() {

    const {feedId} = useParams();
    const {userId, ready, workers} = useWorkers();

    const {data, error} = useGetData({feedId, skip: 0, limit: 0, start_date: null, end_date: null});
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [viewConfiguration, setViewConfiguration] = useState({} as FeedViewType);

    const isEditable = useMemo(()=>{
        if(isAdmin || !data?.feed || !userId) return true;
        return data.feed.feed.user_id === userId;
    }, [userId, data, isAdmin]);

    const feedName = useMemo(()=>{
        const name = data?.feed?.info?.name;
        if(!name) return 'Private Feed';
        return name;
    }, [data])

    const addCallback = useCallback(async () => {
        if(!workers && !ready) throw new Error("Workers not initialized");
        console.debug("Save view configuration: ", viewConfiguration);
        if(!viewConfiguration.name) throw new Error('Missing name');
        throw new Error('todo');
    }, [workers, ready, viewConfiguration]);

    useEffect(()=> {
        if(!workers || !ready) return;
        workers.connection.getCertificate()
            .then(certificate=>{
                const isAdmin = certificate?.extensions?.adminGrants?.includes("proprietaire") || false;
                setIsAdmin(isAdmin);
            })
            .catch(err=>console.warn("Error loading certificate", err));
    }, [workers, ready, setIsAdmin]);

    if(error) return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: Add feed view</h1>
            <p>Error loading information</p>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    );

    if(!isEditable) return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: Add feed view</h1>
            <p>You do not have permissions to edit this feed.</p>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    )

    return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: Add feed view</h1>

            <ConfigureView onChange={setViewConfiguration} />

            <div className="w-full text-center pt-6">
                <ActionButton onClick={addCallback} mainButton={true} disabled={!ready}>
                    Save
                </ActionButton>
                <Link to={`/dataviewer/private/feed/${feedId}`}
                      className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Cancel
                </Link>
            </div>

        </section>
    )
}

export default AddFeedView;

type ViewUpdateFieldsProps = {
    onChange: (value: FeedViewType)=>void
};

export type FeedViewType = {
    name: string,
    active: boolean;
    decrypted: boolean,
    mappingCode: string,
}

export function ConfigureView(props: ViewUpdateFieldsProps) {

    const {onChange} = props;

    const [name, setName] = useState('');
    const [mappingCode, setMappingCode] = useState('');
    const [active, setActive] = useState(true);
    const [decrypted, setDecrypted] = useState(false);

    useEffect(()=>{
        onChange({name, mappingCode, active, decrypted})
    }, [onChange, name, mappingCode, active, decrypted]);

    return (
        <>
            <div className='grid grid-cols-1 md:grid-cols-4 space-y-2'>

                <label htmlFor='view-name'>View name</label>
                <input id='view-name' type="text" onChange={e=>setName(e.target.value)} value={name}
                       className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>

                <label htmlFor="active-switch">Feed active</label>
                <div id="active-switch" className='col-span-3'>
                    <SwitchButton value={active} onChange={setActive} />
                </div>

                <label htmlFor="decrypted-switch">Decrypt in storage</label>
                <div id="decrypted-switch" className='col-span-3'>
                    <SwitchButton value={decrypted} onChange={setDecrypted} />
                </div>

                <label htmlFor="mapping-code" className='col-span-4'>Mapping python code</label>
                <textarea id="mapping-code" rows={20} onChange={e=>setMappingCode(e.target.value)} value={mappingCode}
                          className='col-span-4 text-white bg-indigo-900 border-2 border-indigo-400 p-2' />

            </div>
        </>
    )

}
