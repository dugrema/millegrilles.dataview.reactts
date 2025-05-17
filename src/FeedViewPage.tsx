import {Link, useParams} from "react-router-dom";
import {useCallback, useEffect, useMemo, useState} from "react";
import {DecryptedFeedViewType} from "./GetFeedViews.ts";
import ActionButton from "./ActionButton.tsx";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {useGetFeedViewData} from "./GetFeedViewData.ts";
import {PageSelectors} from "./BrowsingElements.tsx";
import ViewFeedGoogleTrendsNews from "./DataviewGoogleTrends.tsx";

const PAGE_SIZE = 50;

function FeedViewPage() {
    const {feedId, feedViewId} = useParams();
    const {ready, workers, userId} = useWorkers();

    const [page, setPage] = useState(1);
    // const [startDate, setStartDate] = useState(null as Date | null);
    // const [endDate, setEndDate] = useState(null as Date | null);
    // const [isAdmin, setIsAdmin] = useState<boolean>(false);

    const skip = useMemo(()=>{
        return (page - 1) * PAGE_SIZE;
    }, [page]);

    const {data, error} = useGetFeedViewData({feedId, feedViewId, skip, limit: PAGE_SIZE});

    const [feedName, feedView, estimatedPages] = useMemo(()=>{
        let name = data?.feed?.info?.name;
        const feedView = data?.view as DecryptedFeedViewType;
        if(!name) name = 'Private feed';
        let estimatedPages = 1;
        if(data?.estimated_count) estimatedPages = Math.ceil(data.estimated_count / PAGE_SIZE);
        return [name, feedView, estimatedPages];
    }, [data])

    const processFeedHandler = useCallback(async ()=>{
        if(!workers || !ready) throw new Error('workers not initialized');
        console.debug("Start processing the feed");
        const feedViewId = feedView.info?.feed_view_id;
        if(!feedViewId) throw new Error("Missing feed_view_id")
        const response = await workers.connection.runFeedViewProcess(feedViewId);
        if(response.ok !== true) throw new Error("Error starting view process: " + response.err);
    }, [workers, ready, feedView]);

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
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: {feedView?.info?.name}</h1>
            <p>Error loading information: {''+error}</p>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    );

    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
                <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: {feedView?.info?.name}</h1>
                <Link to={`/dataviewer/private/feed/${feedId}`}
                      className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>
                {isEditable?
                    <>
                        <Link to={`/dataviewer/private/feed/${feedId}/${feedView?.info?.feed_view_id}/update`}
                              className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                            Edit
                        </Link>
                        <ActionButton onClick={processFeedHandler} disabled={!ready} mainButton={true} revertSuccessTimeout={3}>
                            Run
                        </ActionButton>
                    </>
                    :<></>
                }
            </section>

            <section className="w-full fixed top-28 bottom-10 px-2 overflow-y-auto">
                <PageSelectors page={page} setPage={setPage} pageCount={estimatedPages} />
                <ViewFeedGoogleTrendsNews value={data} />
                <PageSelectors page={page} setPage={setPage} pageCount={estimatedPages} />
            </section>

        </>
    )
}

export default FeedViewPage;
