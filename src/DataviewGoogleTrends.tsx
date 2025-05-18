import {DecryptedFeedViewDataItem, FeedViewDataType} from "./GetFeedViewData.ts";
import {useMemo} from "react";
import {Formatters} from "millegrilles.reactdeps.typescript";
import {AttachedFile} from "./workers/connection.worker.ts";
import ThumbnailFuuidV2 from "./ThumbnailFuuidV2.tsx";

type GoogleTrendsGroup = {label: string, pub_date: number, other?: {approx_traffic?: string}};

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
            const groupKey = item.info.group_id || 'items';

            // Add item to group list
            const items = groups[groupKey];
            if (items) {
                items.push(item);
            } else {
                groups[groupKey] = [item];
                groupOrder.push(groupKey);
            }
        }

        // console.debug("Groups", groups);

        const elems: React.ReactNode[] = [];
        for(const groupKey of groupOrder) {
            const groupElems = groups[groupKey];
            const firstGElem = groupElems[0].data;
            const groupInfo = firstGElem?.group as GoogleTrendsGroup;
            elems.push(
                <div key={groupKey} className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-6 grid grid-cols-3 md:grid-cols-6 bg-indigo-800/50 p-2 font-bold">
                    <p className='col-span-3'>{groupInfo?.label}</p>
                    <p>({groupInfo?.other?.approx_traffic})</p>
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
                    elems.push(<FeedViewDataItemLine key={elem.info.data_id} value={elem} feed={value}/>);
                } else if(viewMode == 'large') {
                    elems.push(<FeedViewDataItemLarge key={elem.info.data_id} value={elem} feed={value}/>);
                }
            }
        }

        return elems;
    }, [value]);

    if(viewMode === 'large') {
        return (
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 space-x-1 space-y-4'>
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

export default ViewFeedGoogleTrendsNews;

type FeedViewDataItemLargeProps = {
    value: DecryptedFeedViewDataItem,
    feed: FeedViewDataType,
}

function getDataUrl(associatedUrls: {[url: string]: string} | null | undefined, values: string[]): string {
    if(!associatedUrls) return '#';
    for(const innerUrl of Object.keys(associatedUrls)) {
        const value = associatedUrls[innerUrl];
        if(values.includes(value)) {
            return innerUrl
        }
    }
    return '#';
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

    const url = getDataUrl(value.data?.urls, ['main', 'article']);
    let newsDomain = '';
    if(url !== '#') {
        try {
            newsDomain = new URL(url).hostname;
            if (newsDomain.startsWith('www.')) {
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

    const url = getDataUrl(value.data?.urls, ['main', 'article']);
    let newsDomain = '';
    if(url !== '#') {
        try {
            newsDomain = new URL(url).hostname;
            if (newsDomain.startsWith('www.')) {
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
