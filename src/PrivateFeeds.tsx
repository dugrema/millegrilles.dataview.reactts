import {useCallback, useMemo} from "react";
import {Link} from "react-router-dom";

import {useWorkers} from "./workers/PrivateWorkerContextData.ts";

import TrashIcon from './assets/trash-2-svgrepo-com.svg';
import ActionButton from "./ActionButton.tsx";
import {DecryptedFeedType, useGetFeeds} from "./GetFeeds.ts";
import {useSWRConfig} from "swr";

function PrivateFeeds() {
    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
                <h1 className="text-indigo-300 text-xl font-bold pb-2">Private feeds</h1>
                <Link to="/dataviewer"
                      className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>

                <Link to="/dataviewer/private/addFeed"
                      className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Add feed
                </Link>
            </section>

            <section className="w-full fixed top-32 bottom-10 px-2 overflow-y-auto">
                <FeedTypeList />
            </section>
        </>
    );
}

export default PrivateFeeds;

function FeedTypeList() {

    const { mutate } = useSWRConfig();
    const {workers, ready} = useWorkers();
    const {data, error, isLoading} = useGetFeeds();

    const deleteFeed = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
        if(!workers || !ready) throw new Error('Workers not initialized');
        console.debug("Deleting feed ", e.currentTarget.value);
        const response = await workers.connection.deleteFeed(e.currentTarget.value);
        if(!response.ok) throw new Error(`Error deleting feed: ${response.err}`);
        // Force refresh of the full list
        await mutate(['feeds', undefined]);
    }, [workers, ready, mutate])

    const feedsElem = useMemo(()=>{
        if(!data) return [];

        if(data.feeds.length === 0) return (
            <p>No feeds.</p>
        );

        return data.feeds.map(feed => {
            return <FeedItem key={feed.feed.feed_id} value={feed} onDelete={deleteFeed} />
        });
    }, [data, deleteFeed]);

    if(isLoading) {
        return <p>Feeds loading ...</p>;
    }

    return (
        <>
            Feed list
            {error && <p>{''+error}</p>}
            <div>
                {feedsElem}
            </div>
        </>
    );
}

function FeedItem(props: {value: DecryptedFeedType, onDelete: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>}) {
    const {value} = props;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 odd:bg-indigo-600/40 even:bg-indigo-800/40 hover:bg-indigo-700 px-2 py-1">
            <Link to={`feed/${value.feed.feed_id}`} className="col-span-2 md:col-span-1">{value.info?.name}</Link>
            <p className="col-span-2 md:col-span-1">{value.feed.feed_type}</p>
            <p>{value.feed.active?'Active':'Inactive'}</p>
            <div>
                <ActionButton onClick={props.onDelete} value={value.feed.feed_id} varwidth={10}>
                    <img src={TrashIcon} alt="Delete feed" className="w-8" />
                </ActionButton>
            </div>
        </div>
    )
}
