import {Link, useParams} from "react-router-dom";
import {useCallback, useMemo, useState} from "react";
import {DecryptedFeedViewType} from "./GetFeedViews.ts";
import ActionButton from "./ActionButton.tsx";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {DecryptedFeedViewDataItem, FeedViewDataType, useGetFeedViewData} from "./GetFeedViewData.ts";
import {Formatters} from "millegrilles.reactdeps.typescript";
import {AttachedFile} from "./workers/connection.worker.ts";
import ThumbnailFuuidV2 from "./ThumbnailFuuidV2.tsx";
import {PageSelectors} from "./BrowsingElements.tsx";

const PAGE_SIZE = 50;

function FeedViewPage() {
    const {feedId, feedViewId} = useParams();
    const {ready, workers} = useWorkers();

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
                <Link to={`/dataviewer/private/feed/${feedId}/${feedView?.info?.feed_view_id}/update`}
                      className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Edit
                </Link>
                <ActionButton onClick={processFeedHandler} disabled={!ready} mainButton={true} revertSuccessTimeout={3}>
                    Run
                </ActionButton>
            </section>

            <section className="w-full fixed top-32 bottom-10 px-2 overflow-y-auto">
                <PageSelectors page={page} setPage={setPage} pageCount={estimatedPages} />
                <ViewFeedGoogleTrendsNews value={data} />
                <PageSelectors page={page} setPage={setPage} pageCount={estimatedPages} />
            </section>

        </>
    )
}

export default FeedViewPage;

type GoogleTrendsGroup = {label: string, pub_date: number, approx_traffic: string};

let viewMode = 'line';
viewMode = 'large';

function ViewFeedGoogleTrendsNews(props: {value: FeedViewDataType | null}) {
    const {value} = props

    const dataElems = useMemo(()=>{
        if(!value || value.items.length === 0) {
            return [[], null];
        }

        // console.debug("Items", value);

        // Group by title/date
        const groups: {[title_date: string]: DecryptedFeedViewDataItem[]} = {};
        const groupOrder: string[] = [];
        for(const item of value.items) {
            const groupKey = item.info.group_id;

            // Add item to group list
            if(groupKey) {
                const items = groups[groupKey];
                if (items) {
                    items.push(item);
                } else {
                    groups[groupKey] = [item];
                    groupOrder.push(groupKey);
                }
            }
        }

        // console.debug("Groups", groups);

        const elems: React.ReactNode[] = [];
        for(const groupKey of groupOrder) {
            const groupElems = groups[groupKey];
            const firstGElem = groupElems[0].data;
            const groupInfo = firstGElem?.group as GoogleTrendsGroup;
            elems.push(
                <div key={groupKey} className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 grid grid-cols-3 md:grid-cols-6 bg-indigo-800/50 p-2 font-bold">
                    <p className='col-span-3'>{groupInfo?.label}</p>
                    <p>({groupInfo?.approx_traffic})</p>
                    <p className='col-span-2 md:col-span-1 text-right'>
                        {groupInfo?.pub_date?
                            <Formatters.FormatterDate value={groupInfo.pub_date} />
                            :
                            <></>
                        }
                    </p>
                </div>
            )

            for(const elem of groupElems) {
                if(viewMode == 'line') {
                    elems.push(<FeedViewDataItemLine value={elem} feed={value}/>);
                } else if(viewMode == 'large') {
                    elems.push(<FeedViewDataItemLarge value={elem} feed={value}/>);
                }
            }
        }

        return elems;
    }, [value]);

    if(viewMode === 'large') {
        return (
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 space-x-1 space-y-4'>
                {dataElems}
            </div>
        )
    }

    return (
        <div className='space-y-4'>
            {dataElems}
        </div>
    )

}

type FeedViewDataItemLargeProps = {
    value: DecryptedFeedViewDataItem,
    feed: FeedViewDataType,
}

function FeedViewDataItemLine(props: FeedViewDataItemLargeProps) {
    const {value, feed} = props;

    let thumbnail: AttachedFile | null = null;
    let thumbnailDecryptionKey: Uint8Array | null = null;
    if(value.info.files && value.info.files.length > 0) {
        // First item is the thumbnail file
        thumbnail = value.info.files[0];
        const keyId = thumbnail.decryption.cle_id;
        if(keyId) {
            thumbnailDecryptionKey = feed.keys[keyId];
        }
    }
    let url = '#';
    let newsDomain = '';
    if(value.data?.url) {
        url = value.data.url;
        try {
            newsDomain = new URL(url).hostname;
            if(newsDomain.startsWith('www.')) {
                newsDomain = newsDomain.slice(4);
            }
        } catch (err) {
            // Error reading url
            console.error(`Error reading url ${url}: ${err}`);
        }
    }

    return (
        <a key={value.info.data_id} href={url} target='_blank' className="grid grid-cols-6 space-x-4">
            {thumbnail?
                <ThumbnailFuuidV2 value={thumbnail} secretKey={thumbnailDecryptionKey} className='object-cover pr-2 col-span-6 sm:col-span-3 md:col-span-2' />
                :
                <div></div>
            }
            <p className="col-span-6 sm:col-span-3 md:col-span-4">
                {value.data?.label}
                {newsDomain?<span className="block text-xs">{newsDomain}</span>:<></>}
            </p>
        </a>
    )
}

function FeedViewDataItemLarge(props: FeedViewDataItemLargeProps) {
    const {value, feed} = props;

    let thumbnail: AttachedFile | null = null;
    let thumbnailDecryptionKey: Uint8Array | null = null;
    if(value.info.files && value.info.files.length > 0) {
        // First item is the thumbnail file
        thumbnail = value.info.files[0];
        const keyId = thumbnail.decryption.cle_id;
        if(keyId) {
            thumbnailDecryptionKey = feed.keys[keyId];
        }
    }
    let url = '#';
    let newsDomain = '';
    if(value.data?.url) {
        url = value.data.url;
        try {
            newsDomain = new URL(url).hostname;
            if(newsDomain.startsWith('www.')) {
                newsDomain = newsDomain.slice(4);
            }
        } catch (err) {
            // Error reading url
            console.error(`Error reading url ${url}: ${err}`);
        }
    }

    return (
        <div className=''>
            <a key={value.info.data_id} href={url} target='_blank'>
                {thumbnail?
                    <ThumbnailFuuidV2 value={thumbnail} secretKey={thumbnailDecryptionKey} className='object-cover pr-2 col-span-6 sm:col-span-3 md:col-span-2' />
                    :
                    <div></div>
                }
                <p className="">
                    {value.data?.label}
                    {newsDomain?<span className="block text-xs">{newsDomain}</span>:<></>}
                </p>
            </a>
        </div>
    )
}
