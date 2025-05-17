import {useMemo} from "react";
import useSWR, {KeyedMutator} from "swr";

import {EncryptedKeyType, FeedViewDataItem, GetFeedViewDataResponseType} from "./workers/connection.worker";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AppWorkers} from "./workers/userConnect.ts";
import {multiencoding} from "millegrilles.cryptography";
import {DecryptedFeedType} from "./GetFeeds.ts";
import {DecryptedFeedViewType} from "./GetFeedViews.ts";

export type FeedViewDataType = {
    feed: DecryptedFeedType | null,
    view: DecryptedFeedViewType | null,
    estimated_count: number | null,
    items: DecryptedFeedViewDataItem[],
    keys: EncryptedKeyType,
};

type UseGetFeedViewsDecryptedType = {
    data: FeedViewDataType | null,
    error: unknown,
    isLoading: boolean,
    mutate: KeyedMutator<FeedViewDataType | null>,
};

export type UseGetFeedViewsProps = {
    feedId?: string | null,
    feedViewId?: string | null,
    skip?: number | null,
    limit?: number | null,
    start_date: Date | null,
    end_date: Date | null,
}

export type DecryptedItemData = {
    label?: string | null,
    pub_date?: number | null,
    url?: string | null,
    item_source?: string | null,
    group?: unknown,
}

export type DecryptedFeedViewDataItem = {
    info: FeedViewDataItem,
    data?: DecryptedItemData | null,
}

/**
 * Runs a search query and returns the first result batch.
 * @returns Search results
 */
export function useGetFeedViewData(props: UseGetFeedViewsProps): UseGetFeedViewsDecryptedType {
    const {workers, ready} = useWorkers();

    const [fetcherKey, fetcherFunction] = useMemo(()=>{
        if(!workers || !ready) return ['notReady', null];

        // Only use dates if both are present and the range is valid
        let start_date = null as Date | null, end_date = null as Date | null;
        if(props.start_date && props.end_date && props.start_date < props.end_date) {
            start_date = props.start_date;
            end_date = props.end_date;
        }

        const fetcherKey = ['feedViewData', props.feedId, props.feedViewId, props.skip, props.limit, start_date, end_date];
        const fetcherFunction =
            async () => fetchFeedViewData(workers, ready?ready:false, props);
        return [fetcherKey, fetcherFunction]
    }, [workers, ready, props]);

    const { data, error, isLoading, mutate } = useSWR(fetcherKey, fetcherFunction);
    return {data: data || null, error, isLoading, mutate};
}

type DecryptedKey = {
    cle_id: string,
    cle_secrete_base64: string,
};

type DecryptedKeyMessage = {
    ok: boolean,
    err?: unknown,
    cles?: DecryptedKey[],
}

async function decryptResponse(decryptedKeys: DecryptedKey[], response: GetFeedViewDataResponseType, workers: AppWorkers): Promise<FeedViewDataType> {
    const decryptedKeyMap = decryptedKeys.reduce((acc, item) => {
        acc[item.cle_id] = multiencoding.decodeBase64(item.cle_secrete_base64);
        return acc;
    }, {} as { [key: string]: Uint8Array });

    // console.debug("Decrypted key map", decryptedKeyMap);

    let feed = null as DecryptedFeedType | null;
    const responseFeed = response.feed;
    const feedKeyId = responseFeed.encrypted_feed_information.cle_id;
    if (!feedKeyId) {
        throw new Error("KeyId missing for feed " + responseFeed.feed_id);
    } else {
        const key = decryptedKeyMap[feedKeyId];
        if (key) {
            const {format, nonce, ciphertext_base64, compression} = responseFeed.encrypted_feed_information;
            if (format && nonce) {
                const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64, compression);
                const cleartext = JSON.parse(new TextDecoder().decode(cleartextBytes));
                // console.debug("Cleartext", cleartext);
                feed = {feed: responseFeed, info: cleartext, secretKey: key};
            } else {
                throw new Error("Unkown format/nonce for feed " + responseFeed.feed_id);

            }
        } else {
            throw new Error("Unkown key for feed " + responseFeed.feed_id);
        }
    }

    const feedView = response.feed_view;
    console.debug("Decrypt feed view", feedView);
    const encryptedData = feedView.encrypted_data;
    if(!encryptedData) throw new Error('Missing encrypted data in feed view');
    const keyId = encryptedData.cle_id;
    if (!keyId) throw new Error('missing feed view key id');  // Skip, no key
    const key = decryptedKeyMap[keyId];
    if (!keyId) throw new Error('missing feed view key');  // Skip, no key
    const {format, nonce, ciphertext_base64, compression} = encryptedData;
    if (!format || !nonce) throw new Error("Format/nonce missing for feed view");
    const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64, compression);
    const cleartext = JSON.parse(new TextDecoder().decode(cleartextBytes));
    const view = {info: {...feedView, ...cleartext}} as DecryptedFeedViewType;

    // Decrypt items
    const items = [] as DecryptedFeedViewDataItem[];
    for(const item of response.items) {
        const decryptedItem = {
            info: item,
            data: null,
        } as DecryptedFeedViewDataItem;
        const keyId = item.encrypted_data.cle_id;
        if(keyId) {
            const key = decryptedKeyMap[keyId];
            const {format, compression, nonce, ciphertext_base64} = item.encrypted_data;
            if(ciphertext_base64 && format && nonce) {
                const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64, compression);
                decryptedItem.data = JSON.parse(new TextDecoder().decode(cleartextBytes));
            }
        }
        items.push(decryptedItem);
    }

    return {estimated_count: response.estimated_count, keys: decryptedKeyMap, feed, view, items};
}

async function fetchFeedViewData(workers: AppWorkers | null | undefined, ready: boolean, props: UseGetFeedViewsProps): Promise<FeedViewDataType | null> {
    if(!workers || !ready) return null;
    const {feedId, feedViewId, skip, limit} = props;

    if(!feedId) return null;

    const start_date = props.start_date || null;
    const end_date = props.end_date || null;

    const response = await workers.connection.getFeedViewDataItems(feedViewId, skip, limit, start_date, end_date);
    if (!response.ok) throw new Error(`Error loading feeds: ${response.err}`);
    console.debug("Get feed view data response", response);

    const encryptedKeyMessage = response.keys;
    const decryptedKeyMessage: DecryptedKeyMessage = await workers.connection.decryptMessage(encryptedKeyMessage) as DecryptedKeyMessage;
    console.debug("Decrypted keys", decryptedKeyMessage);
    const decryptedKeys = decryptedKeyMessage.cles;
    if(!decryptedKeys) {
        console.error(`No decrypted key information ${decryptedKeyMessage.err}`);
        return null;
    }

    const info = await decryptResponse(decryptedKeys, response, workers);

    console.debug("Decrypted information %O", info);

    return info;
}
