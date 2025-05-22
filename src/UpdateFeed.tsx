import {Link, useNavigate, useParams} from "react-router-dom";
import {useCallback, useEffect, useMemo, useState} from "react";
import SwitchButton from "./SwitchButton.tsx";
import ActionButton from "./ActionButton.tsx";
import {MessageResponse} from "millegrilles.reactdeps.typescript";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AppWorkers} from "./workers/userConnect.ts";
import {FeedInformation, UpdateFeedPayload} from "./workers/connection.worker.ts";
import {DecryptedFeedType, useGetFeeds} from "./GetFeeds.ts";

function UpdateFeedPage() {
    const {workers, ready} = useWorkers();
    const navigate = useNavigate();
    const {feedId} = useParams();

    const {data, error, isLoading, mutate} = useGetFeeds({feedId});

    const feed = useMemo(()=>{
        if(error || isLoading) return null;
        const feeds = data?.feeds;
        // console.debug("feed loading? %s Feeds: %O", isLoading, feeds);
        if(feeds?.length === 1) return feeds[0];
        console.error("Error loading feed to update: ", feeds);
        return null;
    }, [data, error, isLoading]);

    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [decrypted, setDecrypted] = useState(false);
    const [active, setActive] = useState(true);
    const [pollingRate, setPollingRate] = useState("");
    const [security, setSecurity] = useState("2.prive");
    const [customCode, setCustomCode] = useState("");
    const [userAgent, setUserAgent] = useState("");

    // Prevent screen updates when starting to edit
    const [locked, setLocked] = useState(false);

    useEffect(()=>{
        if(!feed || locked) return;
        setLocked(true);  // Prevent updates
        console.log("Feed loaded", feed);
        setName(feed.info?.name || "");
        setUrl(feed.info?.url || "");
        setUsername(feed.info?.auth_username || "");
        setPassword(feed.info?.auth_password || "");
        setDecrypted(feed.feed.decrypt_in_database || false);
        setActive(feed.feed.active!==false);
        setSecurity(feed.feed.security_level || "");
        setPollingRate(feed.feed.poll_rate?""+feed.feed.poll_rate:"");
        setCustomCode(feed.info?.custom_code || "");
        setUserAgent(feed.info?.user_agent || "");
    }, [feed, locked, setLocked, setName, setUrl, setUsername, setPassword, setDecrypted, setActive, setPollingRate, setSecurity, setCustomCode, setUserAgent]);

    const addCallback = useCallback(async () => {
        if(!workers || !ready || !feed || !data) throw new Error('Connection not ready');

        let pollRate: number | null = Number.parseInt(pollingRate);
        if(isNaN(pollRate)) pollRate = null;

        const info = {name, url, auth_username: username, auth_password: password, custom_code: customCode, user_agent: userAgent};
        console.debug("Info mapped", info);
        const updatedFeed = {decrypt_in_database: decrypted, active, poll_rate: pollRate, security_level: security};
        const response = await generateUpdateCommands(workers, feed, info, updatedFeed);
        if(!response.ok) throw new Error(`Failed to generate add command: ${response.err}`);

        const updatedFeeds = data.feeds.map(item=>{
            if(item.feed.feed_id === feed.feed.feed_id) {
                const itemCopy: DecryptedFeedType = {...item};
                itemCopy.feed = {...itemCopy.feed, ...updatedFeed};
                itemCopy.info = {...itemCopy.info, ...info};
                return itemCopy;
            }
            return item;
        });

        await mutate({...data, feeds: updatedFeeds});

        // Go back to feeds
        navigate(`/dataviewer/private/feed/${feedId}`);
    }, [workers, ready, data, feed, name, url, username, password, decrypted, active, pollingRate, security, navigate, mutate, feedId, customCode, userAgent]);

    return (
        <div className='fixed top-10 md:top-12 left-0 right-0 px-2 bottom-10 overflow-y-auto'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">Update feed</h1>

            <section className="sm:px-4 md:px-10 lg:px-20">
                <div className="grid grid-cols-1 md:grid-cols-4 space-y-2 pb-6">
                    <FeedUpdateFields
                        name={name} setName={setName}
                        active={active} setActive={setActive}
                        url={url} setUrl={setUrl}
                        pollingRate={pollingRate} setPollingRate={setPollingRate}
                        username={username} setUsername={setUsername}
                        password={password} setPassword={setPassword}
                        decrypted={decrypted} setDecrypted={setDecrypted}
                        security={security} setSecurity={setSecurity}
                        customCode={customCode} setCustomCode={setCustomCode}
                        userAgent={userAgent} setUserAgent={setUserAgent} />
                </div>

                <div className="w-full text-center">
                    <ActionButton onClick={addCallback} mainButton={true} disabled={!ready}>
                        Save
                    </ActionButton>
                    <Link to={`/dataviewer/private/feed/${feedId}`}
                          className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                        Cancel
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default UpdateFeedPage;

export function FeedTypeList(props: {id?: string, className?: string, value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>}) {
    return (
        <select id={props.id} className={props.className} value={props.value} onChange={props.onChange}>
            <option>Pick one</option>
            <option value="web.google_trends.news">Google Trends News</option>
            <option value="web.scraper.python_custom">Web Scraper with Python</option>
        </select>
    );
}

export function SecurityLevelList(props: {id?: string, className?: string, value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>}) {
    return (
        <select id={props.id} className={props.className} value={props.value} onChange={props.onChange}>
            <option value='3.protege'>Protected</option>
            <option value='2.prive'>Private</option>
            <option value='1.public'>Public</option>
        </select>
    )
}

type FeedUpdateFieldsProps = {
    name: string,
    setName: (value: string) => void,
    active: boolean;
    setActive: (value: boolean) => void;
    url: string,
    setUrl: (value: string) => void,
    pollingRate: string,
    setPollingRate: (value: string) => void,
    username: string,
    setUsername: (value: string) => void,
    password: string,
    setPassword: (value: string) => void,
    decrypted: boolean,
    setDecrypted: (value: boolean) => void,
    security: string,
    setSecurity: (value: string) => void,
    customCode: string,
    setCustomCode: (value: string) => void,
    userAgent: string,
    setUserAgent: (value: string) => void,
}

export function FeedUpdateFields(props: FeedUpdateFieldsProps) {
    return (
        <>
            <label htmlFor="feed-name">Name</label>
            <input id="feed-name" type="text" value={props.name} onChange={e=>props.setName(e.target.value)}
                   className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400' />

            <label htmlFor="active-switch">Feed active</label>
            <div id="active-switch" className='col-span-3'>
                <SwitchButton value={props.active} onChange={props.setActive} />
            </div>

            <label htmlFor="url">Url (depends on feed type)</label>
            <input id="url" type="text" value={props.url} onChange={e=>props.setUrl(e.target.value)}
                   className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>

            <label htmlFor="polling">Polling rate in seconds</label>
            <input id="polling" type="number" value={props.pollingRate} onChange={e=>props.setPollingRate(e.target.value)}
                   className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>

            <label htmlFor="username">User name (optional)</label>
            <input id="username" type="text" value={props.username} onChange={e=>props.setUsername(e.target.value)}
                   className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>

            <label htmlFor="password">Password (optional)</label>
            <input id="password" type="text" value={props.password} onChange={e=>props.setPassword(e.target.value)}
                   className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>

            <label htmlFor="decrypted-switch">Decrypt in storage</label>
            <div id="decrypted-switch" className='col-span-3'>
                <SwitchButton value={props.decrypted} onChange={props.setDecrypted} />
            </div>

            <label htmlFor="user-agent">User agent (optional)</label>
            <input id="user-agent" type="text" value={props.userAgent} onChange={e=>props.setUserAgent(e.target.value)}
                   className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>

            <label htmlFor="custom-code" className='col-span-4'>Custom Code</label>
            <textarea id="custom-code" rows={20} onChange={e=>props.setCustomCode(e.target.value)} value={props.customCode}
                      className='font-mono col-span-4 text-white bg-indigo-900 border-2 border-indigo-400 p-2' />

            <label htmlFor="securitySelect">Share level</label>
            <SecurityLevelList id="securitySelect" value={props.security} onChange={e=>props.setSecurity(e.target.value)}
                               className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400'/>
        </>
    )
}

async function generateUpdateCommands(
    workers: AppWorkers, existingFeed: DecryptedFeedType, paramsSecure: FeedInformation,
    params: {decrypt_in_database?: boolean, active?: boolean, poll_rate?: number | null, security_level?: string}): Promise<MessageResponse>
{
    // Validate data
    const security = params.security_level;
    if(!security) {
        throw new Error('Invalid security value');
    }
    const active = params.active !== false;
    const decrypted = params.decrypt_in_database !== false;

    // Generate new key and keymaster command
    const keyId = existingFeed.feed.encrypted_feed_information.cle_id;
    const secretKey = existingFeed.secretKey;
    if(!keyId || !secretKey) {
        throw new Error("Encryption information not provided");
    }

    // Encrypt sensitive information
    // console.debug("Encrypt paramsSecure: ", paramsSecure);
    const encryptedContent = await workers.encryption.encryptMessageMgs4ToBase64(paramsSecure, secretKey);
    encryptedContent.cle_id = keyId;
    delete encryptedContent.digest;  // Not useful in this context
    // console.debug("Updated encrypted content: %O", encryptedContent);

    // Send feed create commmand
    const updateFeedContent: UpdateFeedPayload = {
        feed_id: existingFeed.feed.feed_id,
        encrypted_feed_information: encryptedContent,
        security_level: security,
        poll_rate: params.poll_rate,
        active,
        decrypt_in_database: decrypted,
    };
    // console.debug("Update feed command", updateFeedContent);
    return await workers.connection.updateFeed(updateFeedContent);
}
