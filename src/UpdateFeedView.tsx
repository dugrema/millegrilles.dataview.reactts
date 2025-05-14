import {Link, useParams} from "react-router-dom";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {useGetData} from "./GetData.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import ActionButton from "./ActionButton.tsx";
import {ConfigureView, FeedViewType} from "./AddFeedView.tsx";

function UpdateFeedView() {

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

export default UpdateFeedView;
