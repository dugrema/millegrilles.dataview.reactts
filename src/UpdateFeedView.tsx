import {Link, useNavigate, useParams} from "react-router-dom";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import ActionButton from "./ActionButton.tsx";
import {ConfigureView, FeedViewType} from "./AddFeedView.tsx";
import {useGetFeedViews} from "./GetFeedViews.ts";
import {FeedViewUpdateType} from "./workers/connection.worker.ts";

function UpdateFeedView() {

    const {feedId, feedViewId} = useParams();
    const {userId, ready, workers} = useWorkers();
    const navigate = useNavigate();

    const {data, error, mutate} = useGetFeedViews({feedId, feedViewId});
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [viewConfiguration, setViewConfiguration] = useState({} as FeedViewType);

    const isEditable = useMemo(()=>{
        if(isAdmin || !data?.feed || !userId) return true;
        return data.feed.feed.user_id === userId;
    }, [userId, data, isAdmin]);

    const [feedName, feedView] = useMemo(()=>{
        let name = data?.feed?.info?.name;
        const feedView = data?.views?data.views[0]:null;
        if(!name) name = 'Private Feed';
        return [name, feedView];
    }, [data])

    const updateCallback = useCallback(async () => {
        if(!workers || !ready) throw new Error("Workers not initialized");
        if(!feedView) throw new Error("No feed view to update");
        if(!feedId || !feedViewId) throw new Error("Feed id or Feed view id missing");
        console.debug("Save view configuration: ", viewConfiguration);
        if(!viewConfiguration.name) throw new Error('Missing name');
        const keyId = feedView.info?.encrypted_data?.cle_id;
        const encryptionKey = feedView.secretKey;
        if(!keyId || !encryptionKey) throw new Error("Error accessing keyId or encryptionKey");

        const paramsSecure = {name: viewConfiguration.name};
        const encryptedContent = await workers.encryption.encryptMessageMgs4ToBase64(paramsSecure, encryptionKey);
        encryptedContent.cle_id = keyId;
        console.debug("Encrypted content: %O", encryptedContent);
        delete encryptedContent.digest;  // Not useful in this context

        const viewConfigurationData = {
            ...viewConfiguration,
            feed_id: feedId,
            feed_view_id: feedViewId,
            encrypted_data: encryptedContent,
            // Remove decrypted fields
            name: undefined,
        } as FeedViewUpdateType;
        const response = await workers.connection.updateFeedView(viewConfigurationData);
        if(response.ok !== true) throw new Error('Error updating feed view: ' + response.err);

        // Mutate view in SWR
        if(data && data.views) {
            const feedViews = [...data.views].map(item => {
                if (item.info?.feed_view_id === feedViewId) return {...feedView, ...viewConfiguration};
                return item;
            });
            const updatedData = {...data, views: feedViews};
            await mutate(updatedData);
        }

        // Go back to list
        navigate(`/dataviewer/private/feed/${feedId}/${feedViewId}`);
    }, [workers, ready, navigate, data, mutate, viewConfiguration, feedView, feedId, feedViewId]);

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
            <Link to={`/dataviewer/private/feed/${feedId}/${feedViewId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    );

    if(!isEditable) return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: Add feed view</h1>
            <p>You do not have permissions to edit this feed.</p>
            <Link to={`/dataviewer/private/feed/${feedId}/${feedViewId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    )

    return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: Add feed view</h1>

            <ConfigureView onChange={setViewConfiguration} init={data?.views?data.views[0]:null} />

            <div className="w-full text-center pt-6">
                <ActionButton onClick={updateCallback} mainButton={true} disabled={!ready}>
                    Save
                </ActionButton>
                <Link to={`/dataviewer/private/feed/${feedId}/${feedViewId}`}
                      className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Cancel
                </Link>
            </div>

        </section>
    )
}

export default UpdateFeedView;
