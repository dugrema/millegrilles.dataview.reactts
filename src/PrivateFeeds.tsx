import {useCallback, useMemo} from "react";
import {Link} from "react-router-dom";

import {useWorkers} from "./workers/PrivateWorkerContextData.ts";

import TrashIcon from './assets/trash-2-svgrepo-com.svg';
import ActionButton from "./ActionButton.tsx";
import {DecryptedFeedType, useGetFeeds} from "./GetFeeds.ts";
import {useSWRConfig} from "swr";

function PrivateFeeds() {
    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
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

            <section className="w-full fixed top-32 bottom-10 px-2 overflow-y-auto">
                <FeedTypeList />
            </section>
        </>
    );
}

export default PrivateFeeds;

function FeedTypeList() {

    const { mutate } = useSWRConfig();
    const {workers, ready} = useWorkers();
    const {data, error, isLoading} = useGetFeeds();

    const deleteFeed = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
        if(!workers || !ready) throw new Error('Workers not initialized');
        console.debug("Deleting feed ", e.currentTarget.value);
        const response = await workers.connection.deleteFeed(e.currentTarget.value);
        if(!response.ok) throw new Error(`Error deleting feed: ${response.err}`);
        await mutate(['feeds', undefined]);
    }, [workers, ready, mutate])

    const feedsElem = useMemo(()=>{
        if(!data) return [];
        return data.feeds.map(feed => {
            return <FeedItem key={feed.feed.feed_id} value={feed} onDelete={deleteFeed} />
        });
    }, [data, deleteFeed]);

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
//
// export type DecryptedFeedType = {
//     feed: FeedType,
//     info: FeedInformation | null,
//     secretKey: Uint8Array | null,
// }
//
// type FeedsListType = {
//     feeds: DecryptedFeedType[],
//     keys: EncryptedKeyType,
// };
//
// type UseGetFeedsDecryptedType = {
//     data: FeedsListType | null,
//     error: unknown,
//     isLoading: boolean
// };
//
// export type UseGetFeedsProps = {
//     feedId?: string | string[],
// }
//
// /**
//  * Runs a search query and returns the first result batch.
//  * @returns Search results
//  */
// export function useGetFeeds(props?: UseGetFeedsProps): UseGetFeedsDecryptedType {
//     const {workers, ready} = useWorkers();
//
//     const [fetcherKey, fetcherFunction] = useMemo(()=>{
//         if(!workers || !ready) return ['notReady', null];
//
//         const fetcherKey = ['feeds', props?.feedId];
//         const fetcherFunction = async () => fetchFeeds(workers, ready?ready:false, props);
//         return [fetcherKey, fetcherFunction]
//     }, [workers, ready, props]);
//
//     const { data, error, isLoading } = useSWR(fetcherKey, fetcherFunction);
//     return {data: data || null, error, isLoading};
// }
//
// type DecryptedKey = {
//     cle_id: string,
//     cle_secrete_base64: string,
// };
//
// type DecryptedKeyMessage = {
//     ok: boolean,
//     err?: unknown,
//     cles?: DecryptedKey[],
// }
//
// async function fetchFeeds(workers: AppWorkers | null | undefined, ready: boolean, props: UseGetFeedsProps | null | undefined): Promise<FeedsListType | null> {
//     if(!workers || !ready) return null;
//
//     try {
//         let feedIds: string[] | null = null;
//         if(Array.isArray(props?.feedId)) feedIds = props?.feedId;
//         else if(typeof(props?.feedId) === 'string') feedIds = [props.feedId];
//
//         const response = await workers.connection.getFeeds(feedIds);
//         if (!response.ok) throw new Error(`Error loading feeds: ${response.err}`);
//         console.debug("Get feeds response", response);
//
//         const encryptedKeyMessage = response.keys;
//         const decryptedKeyMessage: DecryptedKeyMessage = await workers.connection.decryptMessage(encryptedKeyMessage) as DecryptedKeyMessage;
//         console.debug("Decryptd keys", decryptedKeyMessage);
//         const decryptedKeys = decryptedKeyMessage.cles;
//         if(!decryptedKeys) {
//             console.error(`No decrypted key information ${decryptedKeyMessage.err}`);
//             return null;
//         }
//
//         const decryptedKeyMap = decryptedKeys.reduce((acc, item)=>{
//             const bytes = multiencoding.decodeBase64(item.cle_secrete_base64);
//             acc[item.cle_id] = bytes;
//             return acc;
//         }, {} as {[key: string]: Uint8Array});
//
//         console.debug("Decrypted key map", decryptedKeyMap);
//
//         const mappedFeeds = [] as DecryptedFeedType[];
//         for await (const feed of response.feeds) {
//             const keyId = feed.encrypted_feed_information.cle_id;
//             if(!keyId) {
//                 console.warn("KeyId missing for feed", feed.feed_id);
//                 continue;
//             }
//             const key = decryptedKeyMap[keyId];
//             if(!key) {
//                 console.warn("Unkown key for feed", feed.feed_id);
//                 continue;
//             }
//             const {format, nonce, ciphertext_base64} = feed.encrypted_feed_information;
//             if(!format || !nonce) {
//                 console.warn("Unkown format/nonce for feed", feed.feed_id);
//                 continue;
//             }
//             const cleartextBytes = await workers.encryption.decryptMessage(format, key, nonce, ciphertext_base64);
//             const cleartext = JSON.parse(new TextDecoder().decode(cleartextBytes));
//             console.debug("Cleartext", cleartext);
//             mappedFeeds.push({feed, info: cleartext, secretKey: key});
//         }
//
//         return {feeds: mappedFeeds, keys: decryptedKeyMap};
//     } catch(error) {
//         console.error("Error loading feeds", error);
//         throw error;
//     }
// }

function FeedItem(props: {value: DecryptedFeedType, onDelete: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>}) {
    const {value} = props;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 odd:bg-indigo-600/40 even:bg-indigo-800/40 hover:bg-indigo-700 px-2 py-1">
            <Link to={`feed/${value.feed.feed_id}`} className="col-span-2 md:col-span-1">{value.info?.name}</Link>
            <p className="col-span-2 md:col-span-1">{value.feed.feed_type}</p>
            <p>{value.feed.active?'Active':'Inactive'}</p>
            <div>
                <ActionButton onClick={props.onDelete} value={value.feed.feed_id} varwidth={10}>
                    <img src={TrashIcon} alt="Delete feed" className="w-8" />
                </ActionButton>
            </div>
        </div>
    )
}
