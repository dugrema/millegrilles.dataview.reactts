import {Link} from "react-router-dom";
import useSWR from "swr";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {EncryptedKeyType, FeedInformation, FeedType} from "./workers/connection.worker.ts";
import {useMemo} from "react";
import {AppWorkers} from "./workers/userConnect.ts";
import {multiencoding} from "millegrilles.cryptography";

function PrivateFeeds() {
    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2 bottom-10 overflow-y-auto'>
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

            <section className="mt-30">
                <FeedTypeList />
            </section>
        </>
    );
}

export default PrivateFeeds;

function FeedTypeList() {

    const {data, error, isLoading} = useGetFeeds();

    const feedsElem = useMemo(()=>{
        if(!data) return [];
        return data.feeds.map(feed => {
            return <FeedItem key={feed.feed.feed_id} value={feed} />
        });
    }, [data]);

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

type DecryptedFeedType = {
    feed: FeedType,
    info: FeedInformation | null,
    secretKey: Uint8Array | null,
}

type FeedsListType = {
    feeds: DecryptedFeedType[],
    keys: EncryptedKeyType,
};

type UseGetFeedsDecryptedType = {
    data: FeedsListType | null,
    error: unknown,
    isLoading: boolean
};

/**
 * Runs a search query and returns the first result batch.
 * @returns Search results
 */
function useGetFeeds(): UseGetFeedsDecryptedType {
    const {workers, ready} = useWorkers();

    const [fetcherKey, fetcherFunction] = useMemo(()=>{
        if(!workers || !ready) return ['notReady', null];
        const fetcherFunction = async () => fetchFeeds(workers, ready?ready:false);
        return ['feeds', fetcherFunction]
    }, [workers, ready]);

    const { data, error, isLoading } = useSWR(fetcherKey, fetcherFunction);
    return {data: data || null, error, isLoading};
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

async function fetchFeeds(workers: AppWorkers | null | undefined, ready: boolean): Promise<FeedsListType | null> {
    if(!workers || !ready) return null;

    console.debug("Get feeds");
    try {
        const response = await workers.connection.getFeeds();
        if (!response.ok) throw new Error(`Error loading feeds: ${response.err}`);
        console.debug("Get feeds response", response);

        const encryptedKeyMessage = response.keys;
        const decryptedKeyMessage: DecryptedKeyMessage = await workers.connection.decryptMessage(encryptedKeyMessage) as DecryptedKeyMessage;
        console.debug("Decryptd keys", decryptedKeyMessage);
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

        console.debug("Decrypted key map", decryptedKeyMap);

        const mappedFeeds = [] as DecryptedFeedType[];
        for await (const feed of response.feeds) {
            const keyId = feed.encrypted_feed_information.cle_id;
            if(!keyId) {
                console.warn("KeyId missing for feed", feed.feed_id);
                continue;
            }
            const key = decryptedKeyMap[keyId];
            if(!key) {
                console.warn("Unkown key for feed", feed.feed_id);
                continue;
            }
            const {format, nonce, ciphertext_base64} = feed.encrypted_feed_information;
            if(!format || !nonce) {
                console.warn("Unkown format/nonce for feed", feed.feed_id);
                continue;
            }
            const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64);
            const cleartext = JSON.parse(new TextDecoder().decode(cleartextBytes));
            console.debug("Cleartext", cleartext);
            mappedFeeds.push({feed, info: cleartext, secretKey: key});
        }

        return {feeds: mappedFeeds, keys: decryptedKeyMap};
    } catch(error) {
        console.error("Error loading feeds", error);
        throw error;
    }
}

function FeedItem(props: {value: DecryptedFeedType}) {
    const {value} = props;
    return (
        <>
            <p>{value.info?.name}</p>
        </>
    )
}