import {Link, useParams} from "react-router-dom";
import {useCallback, useMemo} from "react";
import {DecryptedFeedViewType} from "./GetFeedViews.ts";
import ActionButton from "./ActionButton.tsx";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {DecryptedFeedViewDataItem, FeedViewDataType, useGetFeedViewData} from "./GetFeedViewData.ts";
import {Formatters} from "millegrilles.reactdeps.typescript";


function FeedViewPage() {
    const {feedId, feedViewId} = useParams();
    const {ready, workers} = useWorkers();

    const {data, error} = useGetFeedViewData({feedId, feedViewId});

    const [feedName, feedView] = useMemo(()=>{
        let name = data?.feed?.info?.name;
        const feedView = data?.view as DecryptedFeedViewType;
        if(!name) name = 'Private feed';
        return [name, feedView];
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
                <ViewFeedGoogleTrendsNews value={data} />
            </section>

        </>
    )
}

export default FeedViewPage;

// type GoogleTrendsItem = {
//     detail: string,
//     pub_date: number,
//     thumbnail?: string | null,
//     url?: string | null,
//     group?: {title?: string, pub_date?: number, approx_traffic?: string}
// }

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
            // const groupInfo = firstGElem?.group;
            elems.push(
                <div key={groupKey} className="grid grid-cols-3 md:grid-cols-6 bg-indigo-800/50 p-2 font-bold">
                    <p className='col-span-3'>{firstGElem?.label}</p>
                    {/*<p>({groupInfo?.approx_traffic})</p>*/}
                    <p className='col-span-2 md:col-span-1 text-right'>
                        {firstGElem?.pub_date?
                            <Formatters.FormatterDate value={firstGElem.pub_date} />
                            :
                            <></>
                        }
                    </p>
                </div>
            )

            for(const elem of groupElems) {
                // const gelem = elem.data;
                // let thumbnail: AttachedFile | null = null;
                // if(elem.info.files && elem.info.files.length > 0) {
                //     // First item is the thumbnail file
                //     thumbnail = elem.info.files[0];
                // }
                let url = '#';
                let newsDomain = '';
                if(elem.data?.url) {
                    url = elem.data.url;
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

                elems.push(
                    <a key={elem.info.data_id} href={url} target='_blank' className="grid grid-cols-6 space-x-4">
                        {/*{thumbnail?*/}
                        {/*    <ThumbnailFuuid value={thumbnail} data={elem} className='object-cover pr-2 col-span-6 sm:col-span-3 md:col-span-2' />*/}
                        {/*    :*/}
                        {/*    <div></div>*/}
                        {/*}*/}
                        <p className="col-span-6 sm:col-span-3 md:col-span-4">
                            {elem.data?.label}
                            {newsDomain?<span className="block text-xs">{newsDomain}</span>:<></>}
                        </p>

                    </a>
                );
            }
        }

        return elems;
    }, [value]);

    return (
        <div className='space-y-4'>
            {dataElems}
        </div>
    )
}
