import {DecryptedFeedViewType, useGetFeedViews} from "./GetFeedViews.ts";
import {Link, useParams} from "react-router-dom";

function FeedViewListPage() {
    const {feedId} = useParams();

    const {data, error, isLoading} = useGetFeedViews({feedId});

    if(error) return (
        <p>Error: {''+error}</p>
    )

    if(isLoading) return <p>Loading ...</p>;

    if(!data || data.views.length === 0) return <>No feed views.</>;

    return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{data.feed?.info?.name}: View list</h1>
            {error?<p>Error: {''+error}</p>:<></>}

            <Link to={`/dataviewer/private`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>

            <div className='pt-4'>
                {data.views.map(item=>{
                    return <ViewFeedItem key={item.info?.feed_view_id} value={item} />
                })}
            </div>
        </section>
    )
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
