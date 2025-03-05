import pako from "pako";
import {useMemo} from "react";
import useSWR, {KeyedMutator} from "swr";

import {multiencoding} from "millegrilles.cryptography";

import {DataItemType, EncryptedKeyType, FeedType} from "./workers/connection.worker";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AppWorkers} from "./workers/userConnect.ts";

export type AttachedFile = {
    fuuid: string,
    decryption: {
        cle_id: string,
        format: string,
        nonce: string,
    }
}

export type DecryptedDataItemType = DataItemType & {decrypted_data: object, secretKey: Uint8Array, files?: AttachedFile[]};

export type DataItemsListType = {
    feed: FeedType | null,
    items: DecryptedDataItemType[],
    keys: EncryptedKeyType,
    estimated_count?: number | null,
};

type UseGetFeedsDecryptedType = {
    data: DataItemsListType | null,
    error: unknown,
    isLoading: boolean,
    mutate: KeyedMutator<DataItemsListType | null>,
};

export type UseGetDataProps = {
    feedId?: string | null,
    skip?: number | null,
    limit?: number | null,
}

/**
 * Runs a search query and returns the first result batch.
 * @returns Search results
 */
export function useGetData(props: UseGetDataProps): UseGetFeedsDecryptedType {
    const {workers, ready} = useWorkers();

    const [fetcherKey, fetcherFunction] = useMemo(()=>{
        if(!workers || !ready) return ['notReady', null];

        const fetcherKey = ['data', props.feedId, props.skip, props.limit];
        const fetcherFunction = async () => fetchData(workers, ready?ready:false, props);
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

async function fetchData(workers: AppWorkers | null | undefined, ready: boolean, props: UseGetDataProps): Promise<DataItemsListType | null> {
    const feedId = props.feedId;
    if(!workers || !ready || !feedId) return null;

    const skip = props.skip || 0;
    const limit = props.limit || 50;

    try {
        const feedResponse = await workers.connection.getFeeds([feedId]);
        if(!feedResponse.ok) throw new Error('Invalid feed id: ' + feedId);
        if(feedResponse.feeds.length === 0) throw new Error("Feed not found: " + feedId);
        const feed = feedResponse.feeds[0];

        const response = await workers.connection.getDataItems(feedId, skip, limit);
        if (!response.ok) throw new Error(`Error loading feeds: ${response.err}`);
        console.debug("Get feeds response", response);

        if(response.items.length === 0) {
            // No feeds, return
            return {feed: null, items: [], keys: {}};
        }

        const encryptedKeyMessage = response.keys;
        const decryptedKeyMessage: DecryptedKeyMessage = await workers.connection.decryptMessage(encryptedKeyMessage) as DecryptedKeyMessage;
        // console.debug("Decryptd keys", decryptedKeyMessage);
        const decryptedKeys = decryptedKeyMessage.cles;
        if(!decryptedKeys) {
            console.error(`No decrypted key information ${decryptedKeyMessage.err}`);
            return null;
        }

        const decryptedKeyMap = decryptedKeys.reduce((acc, item)=>{
            const bytes = multiencoding.decodeBase64(item.cle_secrete_base64);
            acc[item.cle_id] = bytes;
            return acc;
        }, {} as {[key: string]: Uint8Array});

        // console.debug("Decrypted key map", decryptedKeyMap);

        const mappedDataItems = [] as DecryptedDataItemType[];
        for await (const dataItem of response.items) {
            const keyId = dataItem.encrypted_data.cle_id;
            if(!keyId) {
                console.warn("KeyId missing for data item", dataItem.data_id);
                continue;
            }
            const key = decryptedKeyMap[keyId];
            if(!key) {
                console.warn("Unkown key for data item", dataItem.data_id);
                continue;
            }
            const {format, nonce, compression, ciphertext_base64} = dataItem.encrypted_data;
            if(!format || !nonce) {
                console.warn("Unkown format/nonce for data item", dataItem.data_id);
                continue;
            }
            let cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64);
            if(compression === 'deflate') {
                // console.debug("Decompressing with deflate");
                cleartextBytes = pako.inflate(cleartextBytes);
            } else if(compression) {
                throw new Error("unsupported compression type " + compression);
            }
            const clearTextStr = new TextDecoder().decode(cleartextBytes);
            // console.debug("Cleartext string", clearTextStr);
            const cleartext = JSON.parse(clearTextStr);
            // console.debug("Cleartext", cleartext);
            mappedDataItems.push({...dataItem, decrypted_data: cleartext, secretKey: key});
        }

        return {feed, items: mappedDataItems, keys: decryptedKeyMap, estimated_count: response.estimated_count};
    } catch(error) {
        console.error("Error loading feeds", error);
        throw error;
    }
}
