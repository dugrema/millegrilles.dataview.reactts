import {Link, useParams} from "react-router-dom";
import {AttachedFile, DataItemsListType, DecryptedDataItemType, useGetData} from "./GetData.ts";
import {useEffect, useMemo} from "react";
import {Formatters} from "millegrilles.reactdeps.typescript";
import ThumbnailFuuid from "./ThumbnailFuuid.tsx";

function ViewFeed() {

    const {feedId} = useParams();

    const {data, error} = useGetData({feedId});

    useEffect(()=>{
        if(error) {
            console.error(error);
            return;
        }
        // console.debug("Feed data", data);
    }, [data, error]);

    const ViewFeedElem = useMemo(()=> {
        if(!data || !data.feed) return ViewFeedUnknown;

        const feedType = data.feed.feed_type;
        // console.debug("Feed type ", feedType)

        if(feedType === 'web.google_trends.news') return ViewFeedGoogleTrendsNews;

        // Unsupported feed type
        return ViewFeedUnknown;
    }, [data]) as React.ElementType;

    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
                <h1 className="text-indigo-300 text-xl font-bold pb-2">Private feeds</h1>
                <Link to="/dataviewer/private"
                      className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>

                <Link to={`/dataviewer/private/feed/${feedId}/update`}
                      className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Edit
                </Link>
            </section>

            <section className="w-full fixed top-32 bottom-10 px-2 overflow-y-auto">
                <ViewFeedElem value={data} />
            </section>
        </>
    )
}

function ViewFeedUnknown() {
    return <div>Unknown feed type</div>;
}

export default ViewFeed;

type GoogleTrendsItem = {
    title: string,
    pub_date: number,
    thumbnail?: string | null,
    url?: string | null,
    group?: {title?: string, pub_date?: number, approx_traffic?: string}
}

function ViewFeedGoogleTrendsNews(props: {value: DataItemsListType}) {
    const {value} = props

    const dataElems = useMemo(()=>{
        if(!value || value.items.length === 0) {
            return [[], null];
        }

        console.debug("Items", value);

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

        console.debug("Groups", groups);

        const elems: React.ReactNode[] = [];
        for(const groupKey of groupOrder) {
            const groupElems = groups[groupKey];
            const firstGElem = groupElems[0].decrypted_data as GoogleTrendsItem;
            const groupInfo = firstGElem.group;
            elems.push(
                <div key={groupKey} className="grid grid-cols-6 bg-indigo-800/50 p-2 font-bold">
                    <p className='col-span-3'>{groupInfo?.title}</p>
                    <p>({groupInfo?.approx_traffic})</p>
                    {groupInfo?.pub_date?
                        <Formatters.FormatterDate value={groupInfo.pub_date} />
                    :
                        <div></div>
                    }
                </div>
            )

            for(const elem of groupElems) {
                const gelem = elem.decrypted_data as GoogleTrendsItem;
                let thumbnail: AttachedFile | null = null;
                if(elem.files && elem.files.length > 0) {
                    // First item is the thumbnail file
                    thumbnail = elem.files[0];
                }

                let additionalInfo = '';
                if(gelem.group) {
                    if(gelem.group.title) {
                        additionalInfo += gelem.group.title;
                    }
                    if(gelem.group.approx_traffic) {
                        additionalInfo += ` (${gelem.group.approx_traffic})`;
                    }
                }

                elems.push(
                    <div key={elem.data_id} className="grid grid-cols-6 space-x-4">
                        {thumbnail?
                            <ThumbnailFuuid value={thumbnail} data={elem} className='object-cover pr-2' />
                            :
                            <div></div>
                        }

                        {gelem.url?
                            <a href={gelem.url} target='_blank' className="col-span-5">{gelem.title}</a>
                            :
                            <p>{gelem.title}</p>
                        }
                    </div>
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
