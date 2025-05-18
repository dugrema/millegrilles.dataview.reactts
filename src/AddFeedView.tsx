import {messageStruct} from "millegrilles.cryptography";

import {Link, useNavigate, useParams} from "react-router-dom";
import {useGetData} from "./GetData.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import ActionButton from "./ActionButton.tsx";
import SwitchButton from "./SwitchButton.tsx";
import {FeedViewUpdateType} from "./workers/connection.worker.ts";
import {DecryptedFeedViewType} from "./GetFeedViews.ts";

function AddFeedView() {

    const {feedId} = useParams();
    const {userId, ready, workers} = useWorkers();
    const navigate = useNavigate();

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
        if(!workers || !ready) throw new Error("Workers not initialized");
        console.debug("Save view configuration: ", viewConfiguration);
        if(!viewConfiguration.name) throw new Error('Missing name');

        // Generate new key and keymaster command
        const key = await workers.encryption.generateSecretKey(['DataCollector']);
        const encryptedKey = await workers.encryption.encryptSecretKey(key.secret);
        const keymasterCommand = await workers.connection.createRoutedMessage(
            messageStruct.MessageKind.Command,
            {signature: key.signature, cles: encryptedKey},
            {domaine: 'MaitreDesCles', action: 'ajouterCleDomaines'},
        );

        const paramsSecure = {name: viewConfiguration.name};
        const encryptedContent = await workers.encryption.encryptMessageMgs4ToBase64(paramsSecure, key.secret);
        encryptedContent.cle_id = key.cle_id;
        console.debug("New Key: %O\nEncrypted key command: %O\nEncrypted content: %O", key, keymasterCommand, encryptedContent);
        delete encryptedContent.digest;  // Not useful in this context

        const viewConfigurationData = {
            ...viewConfiguration,
            feed_id: feedId,
            encrypted_data: encryptedContent,
            // Remove decrypted fields
            name: undefined,
        } as FeedViewUpdateType;
        const response = await workers.connection.createFeedView(viewConfigurationData, keymasterCommand);
        if(response.ok !== true) throw new Error('Error creating feed view: ' + response.err);

        // Go back to list
        navigate(`/dataviewer/private/feed/${feedId}`);
    }, [workers, ready, navigate, feedId, viewConfiguration]);

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

            <ConfigureView onChange={setViewConfiguration}/>

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
    onChange: (value: FeedViewType)=>void,
    init?: DecryptedFeedViewType | null,
};

export type FeedViewType = FeedViewUpdateType & {
    name: string,
}

export function ConfigureView(props: ViewUpdateFieldsProps) {

    const {onChange, init} = props;

    const [name, setName] = useState('');
    const [mappingCode, setMappingCode] = useState('');
    const [active, setActive] = useState(true);
    const [decrypted, setDecrypted] = useState(false);

    useEffect(()=>{
        onChange({name, mapping_code: mappingCode, active, decrypted})
    }, [onChange, name, mappingCode, active, decrypted]);

    const [loaded, setLoaded] = useState(false);  // Latch
    useEffect(()=>{
        if(loaded || !init) return;
        setLoaded(true);
        console.debug("Load initial values", init);
        const info = init.info;
        if(!info) return;
        setName(info.name || '');
        setMappingCode(info.mapping_code || '');
        setActive(info.active);
        setDecrypted(info.decrypted);
    }, [init, loaded, setLoaded, setName, setMappingCode, setActive, setDecrypted]);

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
                          className='font-mono col-span-4 text-white bg-indigo-900 border-2 border-indigo-400 p-2' />

            </div>
        </>
    )

}
