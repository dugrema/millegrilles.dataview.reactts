import {useMemo} from "react";
import useSWR, {KeyedMutator} from "swr";

import {EncryptedKeyType, GetFeedViewsResponseType} from "./workers/connection.worker";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AppWorkers} from "./workers/userConnect.ts";
import {FeedViewType} from "./AddFeedView.tsx";
import {multiencoding} from "millegrilles.cryptography";
import {DecryptedFeedType} from "./GetFeeds.ts";

export type DecryptedFeedViewType = {
    info: FeedViewType | null,
    secretKey: Uint8Array | null,
}

export type FeedViewsListType = {
    feed: DecryptedFeedType | null,
    views: DecryptedFeedViewType[],
    keys: EncryptedKeyType,
};

type UseGetFeedViewsDecryptedType = {
    data: FeedViewsListType | null,
    error: unknown,
    isLoading: boolean,
    mutate: KeyedMutator<FeedViewsListType | null>,
};

export type UseGetFeedViewsProps = {
    feedId?: string | null,
    feedViewId?: string | null,
}

/**
 * Runs a search query and returns the first result batch.
 * @returns Search results
 */
export function useGetFeedViews(props: UseGetFeedViewsProps): UseGetFeedViewsDecryptedType {
    const {workers, ready} = useWorkers();

    const [fetcherKey, fetcherFunction] = useMemo(()=>{
        if(!workers || !ready) return ['notReady', null];

        const fetcherKey = ['feedViews', props.feedId, props.feedViewId];
        const fetcherFunction = async () => fetchFeedViews(workers, ready?ready:false, props);
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

async function decryptResponse(decryptedKeys: DecryptedKey[], response: GetFeedViewsResponseType, workers: AppWorkers) {
    const decryptedKeyMap = decryptedKeys.reduce((acc, item) => {
        acc[item.cle_id] = multiencoding.decodeBase64(item.cle_secrete_base64);
        return acc;
    }, {} as { [key: string]: Uint8Array });

    // console.debug("Decrypted key map", decryptedKeyMap);

    let feed = null as DecryptedFeedType | null;
    const responseFeed = response.feed;
    const keyId = responseFeed.encrypted_feed_information.cle_id;
    if (!keyId) {
        throw new Error("KeyId missing for feed " + responseFeed.feed_id);
    } else {
        const key = decryptedKeyMap[keyId];
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

    const views = [] as DecryptedFeedViewType[];
    for (const feedView of response.views) {
        console.debug("Decrypt ", feedView);
        const encryptedData = feedView.encrypted_data;
        if(!encryptedData) continue;  // Data is not encrypted
        const keyId = encryptedData.cle_id;
        if(!keyId) continue;  // Skip, no key
        const key = decryptedKeyMap[keyId];
        if (!keyId) {
            console.warn("KeyId missing for feed view", feedView.feed_view_id);
            continue;
        }
        const {format, nonce, ciphertext_base64, compression} = encryptedData;
        if (!format || !nonce) {
            console.warn("Format/nonce missing for feed view");
            continue;
        }
        const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64, compression);
        const cleartext = JSON.parse(new TextDecoder().decode(cleartextBytes));
        views.push({
            info: {...feedView, ...cleartext},
            secretKey: key,
        });
    }

    return {decryptedKeyMap, feed, views};
}

async function fetchFeedViews(workers: AppWorkers | null | undefined, ready: boolean, props: UseGetFeedViewsProps): Promise<FeedViewsListType | null> {
    if(!workers || !ready) return null;
    const {feedId, feedViewId} = props;

    if(!feedId) return null;

    const response = await workers.connection.getFeedViews(feedId, feedViewId);
    if (!response.ok) throw new Error(`Error loading feeds: ${response.err}`);
    console.debug("Get feeds response", response);

    const encryptedKeyMessage = response.keys;
    const decryptedKeyMessage: DecryptedKeyMessage = await workers.connection.decryptMessage(encryptedKeyMessage) as DecryptedKeyMessage;
    console.debug("Decrypted keys", decryptedKeyMessage);
    const decryptedKeys = decryptedKeyMessage.cles;
    if(!decryptedKeys) {
        console.error(`No decrypted key information ${decryptedKeyMessage.err}`);
        return null;
    }

    const {decryptedKeyMap, feed, views} = await decryptResponse(decryptedKeys, response, workers);
    if(!feed) throw new Error("Feed is null");

    console.debug("Decrypted\nkey map: %O\nfeed: %O\nviews: %O", decryptedKeyMap, feed, views);

    return {feed, views, keys: decryptedKeyMap};
}
