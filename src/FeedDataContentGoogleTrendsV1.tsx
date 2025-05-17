import {useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {PageSelectors} from "./BrowsingElements.tsx";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {DataItemsListType, DecryptedDataItemType, useGetData} from "./GetData.ts";
import DateSelectors from "./DateSelectors.tsx";
import {Formatters} from "millegrilles.reactdeps.typescript";
import {AttachedFile} from "./workers/connection.worker.ts";
import ThumbnailFuuid from "./ThumbnailFuuid.tsx";

const PAGE_SIZE = 35;

function FeedDataContentGoogleTrendsV1() {
    const {feedId} = useParams();
    const {userId, ready, workers} = useWorkers();

    const [page, setPage] = useState(1);
    const [startDate, setStartDate] = useState(null as Date | null);
    const [endDate, setEndDate] = useState(null as Date | null);

    const skip = useMemo(()=>{
        return (page - 1) * PAGE_SIZE;
    }, [page]);

    const {data, error} = useGetData({feedId, skip, limit: PAGE_SIZE, start_date: startDate, end_date: endDate});

    useEffect(()=>{
        if(error) {
            console.error(error);
            return;
        }
        // console.debug("Feed data", data);
    }, [data, error]);

    const pageCount = useMemo(()=>{
        if(!data?.estimated_count) return 0;
        return Math.ceil(data.estimated_count / PAGE_SIZE);
    }, [data]);

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

    const feedName = useMemo(()=>{
        const name = data?.feed?.info?.name;
        if(!name) return 'Private Feed';
        return name;
    }, [data])

    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
                <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}</h1>
                <Link to="/dataviewer/private"
                      className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>

                {isEditable?
                    <>
                        <Link to={`/dataviewer/private/feed/${feedId}/update`}
                              className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                            Edit
                        </Link>
                    </>
                    :<></>}
            </section>

            <section className="w-full fixed top-32 bottom-10 px-2 overflow-y-auto">
                <DateSelectors startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate}/>
                <PageSelectors page={page} setPage={setPage} pageCount={pageCount} />
                <ViewFeedGoogleTrendsNews value={data} />
                <PageSelectors page={page} setPage={setPage} pageCount={pageCount} />
            </section>
        </>
    )
}

export default FeedDataContentGoogleTrendsV1;

type GoogleTrendsItem = {
    title: string,
    pub_date: number,
    thumbnail?: string | null,
    url?: string | null,
    group?: {title?: string, pub_date?: number, approx_traffic?: string}
}

function ViewFeedGoogleTrendsNews(props: {value: DataItemsListType | null}) {
    const {value} = props

    const dataElems = useMemo(()=>{
        if(!value || value.items.length === 0) {
            return [[], null];
        }

        // console.debug("Items", value);

        // Group by title/date
        const groups: {[title_date: string]: DecryptedDataItemType[]} = {};
        const groupOrder: string[] = [];
        for(const item of value.items) {
            const gelem = item.decrypted_data as GoogleTrendsItem;
            const itemGroup = gelem.group;
            const group_key = itemGroup?.title + ' ' + itemGroup?.pub_date;

            // Add item to group list
            const items = groups[group_key];
            if(items) {
                items.push(item);
            } else {
                groups[group_key] = [item];
                groupOrder.push(group_key);
            }
        }

        // console.debug("Groups", groups);

        const elems: React.ReactNode[] = [];
        for(const groupKey of groupOrder) {
            const groupElems = groups[groupKey];
            const firstGElem = groupElems[0].decrypted_data as GoogleTrendsItem;
            const groupInfo = firstGElem.group;
            elems.push(
                <div key={groupKey} className="grid grid-cols-3 md:grid-cols-6 bg-indigo-800/50 p-2 font-bold">
                    <p className='col-span-3'>{groupInfo?.title}</p>
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
                const gelem = elem.decrypted_data as GoogleTrendsItem;
                let thumbnail: AttachedFile | null = null;
                if(elem.files && elem.files.length > 0) {
                    // First item is the thumbnail file
                    thumbnail = elem.files[0];
                }
                let url = '#';
                let newsDomain = '';
                if(gelem.url) {
                    url = gelem.url;
                    try {
                        newsDomain = new URL(gelem.url).hostname;
                        if(newsDomain.startsWith('www.')) {
                            newsDomain = newsDomain.slice(4);
                        }
                    } catch (err) {
                        // Error reading url
                        console.error(`Error reading url ${url}: ${err}`);
                    }
                }

                elems.push(
                    <a key={elem.data_id} href={url} target='_blank' className="grid grid-cols-6 space-x-4">
                        {thumbnail?
                            <ThumbnailFuuid value={thumbnail} data={elem} className='object-cover pr-2 col-span-6 sm:col-span-3 md:col-span-2' />
                            :
                            <div></div>
                        }
                        <p className="col-span-6 sm:col-span-3 md:col-span-4">
                            {gelem.title}
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
