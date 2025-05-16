import { useParams} from "react-router-dom";

import FeedDataContentGoogleTrendsV1 from "./FeedDataContentGoogleTrendsV1.tsx";
import FeedViewListPage from "./FeedViewListPage.tsx";
import {useGetFeeds} from "./GetFeeds.ts";
import {useMemo} from "react";


function FeedPage() {

    const {feedId} = useParams();

    const {data, error, isLoading} = useGetFeeds();

    const feed = useMemo(()=>{
        if(!data) return null;
        const feeds = data.feeds.filter(item=>item.feed.feed_id === feedId);
        return feeds.pop();
    }, [data, feedId]);

    if(isLoading) {
        return <p>Loading ...</p>;
    }

    const feedType = feed?.feed.feed_type;
    console.debug("Feed id %s, type %s", feedId, feedType);
    if(feedType === 'web.google_trends.news') {
        return <FeedDataContentGoogleTrendsV1 />;
    } else if(feedType === 'web.scraper.python_custom') {
        return <FeedViewListPage />;
    } else {
        return (
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
                <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedType}</h1>
                {error?<p>Error: {''+error}</p>:<></>}
                <div>Unknown feed type</div>
            </section>
        )
    }

}

export default FeedPage;
