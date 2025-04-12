import {useMemo} from "react";
import useSWR, {KeyedMutator} from "swr";

import {messageStruct, multiencoding} from "millegrilles.cryptography";

import {EncryptedKeyType, FeedInformation, FeedType} from "./workers/connection.worker";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AppWorkers} from "./workers/userConnect.ts";
import {MessageResponse} from "millegrilles.reactdeps.typescript";

export type DecryptedFeedType = {
    feed: FeedType,
    info: FeedInformation | null,
    secretKey: Uint8Array | null,
    custom_code: string | null,
}

type FeedsListType = {
    feeds: DecryptedFeedType[],
    keys: EncryptedKeyType,
};

type UseGetFeedsDecryptedType = {
    data: FeedsListType | null,
    error: unknown,
    isLoading: boolean,
    mutate: KeyedMutator<FeedsListType | null>,
};

export type UseGetFeedsProps = {
    feedId?: string | string[],
}

/**
 * Runs a search query and returns the first result batch.
 * @returns Search results
 */
export function useGetFeeds(props?: UseGetFeedsProps): UseGetFeedsDecryptedType {
    const {workers, ready} = useWorkers();

    const [fetcherKey, fetcherFunction] = useMemo(()=>{
        if(!workers || !ready) return ['notReady', null];

        const fetcherKey = ['feeds', props?.feedId];
        const fetcherFunction = async () => fetchFeeds(workers, ready?ready:false, props);
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

export async function decryptFeeds(decryptedKeys: DecryptedKey[], response: MessageResponse & {
    feeds: FeedType[];
    keys: messageStruct.MilleGrillesMessage
}, workers: AppWorkers) {
    const decryptedKeyMap = decryptedKeys.reduce((acc, item) => {
        const bytes = multiencoding.decodeBase64(item.cle_secrete_base64);
        acc[item.cle_id] = bytes;
        return acc;
    }, {} as { [key: string]: Uint8Array });

    // console.debug("Decrypted key map", decryptedKeyMap);

    const mappedFeeds = [] as DecryptedFeedType[];
    for await (const feed of response.feeds) {
        const keyId = feed.encrypted_feed_information.cle_id;
        if (!keyId) {
            console.warn("KeyId missing for feed", feed.feed_id);
            continue;
        }
        const key = decryptedKeyMap[keyId];
        if (!key) {
            console.warn("Unkown key for feed", feed.feed_id);
            continue;
        }
        const {format, nonce, ciphertext_base64, compression} = feed.encrypted_feed_information;
        if (!format || !nonce) {
            console.warn("Unkown format/nonce for feed", feed.feed_id);
            continue;
        }
        const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64, compression);
        const cleartext = JSON.parse(new TextDecoder().decode(cleartextBytes));
        // console.debug("Cleartext", cleartext);
        mappedFeeds.push({feed, info: cleartext, secretKey: key});
    }
    return {decryptedKeyMap, mappedFeeds};
}

async function fetchFeeds(workers: AppWorkers | null | undefined, ready: boolean, props: UseGetFeedsProps | null | undefined): Promise<FeedsListType | null> {
    if(!workers || !ready) return null;

    try {
        let feedIds: string[] | null = null;
        if(Array.isArray(props?.feedId)) feedIds = props?.feedId;
        else if(typeof(props?.feedId) === 'string') feedIds = [props.feedId];

        const response = await workers.connection.getFeeds(feedIds);
        if (!response.ok) throw new Error(`Error loading feeds: ${response.err}`);
        // console.debug("Get feeds response", response);

        if(response.feeds.length === 0) {
            // No feeds, return
            return {feeds: [], keys: {}};
        }

        const encryptedKeyMessage = response.keys;
        const decryptedKeyMessage: DecryptedKeyMessage = await workers.connection.decryptMessage(encryptedKeyMessage) as DecryptedKeyMessage;
        // console.debug("Decrypted keys", decryptedKeyMessage);
        const decryptedKeys = decryptedKeyMessage.cles;
        if(!decryptedKeys) {
            console.error(`No decrypted key information ${decryptedKeyMessage.err}`);
            return null;
        }

        const {decryptedKeyMap, mappedFeeds} = await decryptFeeds(decryptedKeys, response, workers);

        return {feeds: mappedFeeds, keys: decryptedKeyMap};
    } catch(error) {
        console.error("Error loading feeds", error);
        throw error;
    }
}
