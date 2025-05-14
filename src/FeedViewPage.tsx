import {Link, useParams} from "react-router-dom";
import {useMemo} from "react";
import {DecryptedFeedViewType, useGetFeedViews} from "./GetFeedViews.ts";


function FeedViewPage() {
    const {feedId} = useParams();
    // const {userId, ready, workers} = useWorkers();

    const {data, error} = useGetFeedViews({feedId});

    const [feedName, feedView] = useMemo(()=>{
        let name = data?.feed?.info?.name;
        const feedView = data?.views[0] as DecryptedFeedViewType;
        if(!name) name = 'Private feed';
        return [name, feedView];
    }, [data])

    if(error) return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: {feedView?.info?.name}</h1>
            <p>Error loading information</p>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    );

    return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: {feedView?.info?.name}</h1>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
            <Link to={`/dataviewer/private/feed/${feedId}/${feedView.info?.feed_view_id}/update`}
                  className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                Edit
            </Link>
        </section>
    )
}

export default FeedViewPage;
