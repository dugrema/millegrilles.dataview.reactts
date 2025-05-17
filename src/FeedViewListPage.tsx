import {DecryptedFeedViewType, useGetFeedViews} from "./GetFeedViews.ts";
import {Link, useParams} from "react-router-dom";
import {useEffect, useMemo, useState} from "react";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";

function FeedViewListPage() {
    const {feedId} = useParams();

    const {data, error, isLoading} = useGetFeedViews({feedId});
    const {userId, ready, workers} = useWorkers();

    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(()=> {
        if(!workers || !ready) return;
        workers.connection.getCertificate()
            .then(certificate=>{
                const isAdmin = certificate?.extensions?.adminGrants?.includes("proprietaire") || false;
                setIsAdmin(isAdmin);
            })
            .catch(err=>console.warn("Error loading certificate", err));
    }, [workers, ready, setIsAdmin]);

    const isEditable = useMemo(()=>{
        if(isAdmin || !data?.feed || !userId) return true;
        return data.feed.feed.user_id === userId;
    }, [userId, data, isAdmin]);

    if(error) return (
        <p>Error: {''+error}</p>
    )

    if(isLoading) return <p>Loading ...</p>;

    return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{data?.feed?.info?.name}: View list</h1>
            {error?<p>Error: {''+error}</p>:<></>}

            <Link to={`/dataviewer/private`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>

            {isEditable?
                <>
                    <Link to={`/dataviewer/private/feed/${feedId}/update`}
                          className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                        Edit
                    </Link>
                    <Link to={`/dataviewer/private/feed/${feedId}/addView`}
                          className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                        Add view
                    </Link>
                </>
            :<></>}

            <div className='pt-4'>
                <ViewFeedItems value={data?.views} />
            </div>
        </section>
    )
}

type ViewFeedItemsProps = {
    value: DecryptedFeedViewType[] | null | undefined,
}

function ViewFeedItems(props: ViewFeedItemsProps) {
    const {value} = props;

    if(!value || value.length === 0) return <p>No views are configured.</p>

    return value.map(item=>{
        return <ViewFeedItem key={item.info?.feed_view_id} value={item} />;
    })
}

function ViewFeedItem(props: {value: DecryptedFeedViewType}) {
    const {value} = props;

    const {feedId} = useParams();

    console.debug("value ", value);

    return (
        <>
            <Link to={`/dataviewer/private/feed/${feedId}/${value.info?.feed_view_id}`}
                  className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                {props.value.info?.name}
            </Link>
        </>
    )
}

export default FeedViewListPage;
