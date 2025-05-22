import {Link, useNavigate} from "react-router-dom";
import {useCallback, useState} from "react";
import ActionButton from "./ActionButton.tsx";
import {MessageResponse} from "millegrilles.reactdeps.typescript";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AppWorkers} from "./workers/userConnect.ts";
import {FeedInformation, NewFeedPayload} from "./workers/connection.worker.ts";
import {messageStruct} from "millegrilles.cryptography";
import {FeedTypeList, FeedUpdateFields} from "./UpdateFeed.tsx";

function AddFeedPage() {

    const {workers, ready} = useWorkers();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [decrypted, setDecrypted] = useState(false);
    const [active, setActive] = useState(true);
    const [pollingRate, setPollingRate] = useState('');
    const [security, setSecurity] = useState("2.prive");
    const [feedType, setFeedType] = useState("");
    const [customCode, setCustomCode] = useState("");
    const [userAgent, setUserAgent] = useState("");

    const addCallback = useCallback(async () => {
        if(!workers || !ready) throw new Error('Connection not ready');
        const response = await generateAddCommands(workers,
            {name, url, auth_username: username, auth_password: password, custom_code: customCode, user_agent: userAgent},
            {feedType, decrypted, active, pollingRate, security});
        if(!response.ok) throw new Error(`Failed to generate add command: ${response.err}`);
        // Go back to feeds
        navigate('/dataviewer/private');
    }, [workers, ready, name, url, username, password, decrypted, active, pollingRate, security, feedType, navigate, customCode, userAgent]);

    return (
        <div className='fixed top-10 md:top-12 left-0 right-0 px-2 bottom-10 overflow-y-auto'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">Add new feed</h1>

            <section className="sm:px-4 md:px-10 lg:px-20">
                <div className="grid grid-cols-1 md:grid-cols-4 space-y-2 pb-6">
                    <label>Type</label>
                    <FeedTypeList value={feedType} onChange={e=>setFeedType(e.target.value)}
                                  className='col-span-3 text-black w-full bg-slate-300 border-2 border-indigo-400' />

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
                        userAgent={userAgent} setUserAgent={setUserAgent}
                    />

                </div>

                <div className="w-full text-center">
                    <ActionButton onClick={addCallback} mainButton={true} disabled={!ready}>
                        Add
                    </ActionButton>
                    <Link to="/dataviewer/private"
                          className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                        Cancel
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default AddFeedPage;

async function generateAddCommands(workers: AppWorkers, paramsSecure: FeedInformation,
                                   params: {feedType: string, decrypted?: boolean, active?: boolean, pollingRate?: string, security?: string}): Promise<MessageResponse> {

    // Validate data
    const feedType = params.feedType;
    if(!feedType) {
        throw new Error("Feed type must be selected");
    }
    let pollingRateInt: number | null = null;
    if(params.pollingRate) {
        pollingRateInt = Number.parseInt(params.pollingRate);
        if(isNaN(pollingRateInt)) throw new Error('Invalid pollingRate');
    }
    const security = params.security;
    if(!security) {
        throw new Error('Invalid security value');
    }
    const active = params.active !== false;
    const decrypted = params.decrypted !== false;

    // Generate new key and keymaster command
    const key = await workers.encryption.generateSecretKey(['DataCollector']);
    const encryptedKey = await workers.encryption.encryptSecretKey(key.secret);
    const keymasterCommand = await workers.connection.createRoutedMessage(
        messageStruct.MessageKind.Command,
        {signature: key.signature, cles: encryptedKey},
        {domaine: 'MaitreDesCles', action: 'ajouterCleDomaines'},
    );

    // Encrypt sensitive information
    if(!paramsSecure.url) paramsSecure.url = null;
    if(!paramsSecure.auth_username) paramsSecure.auth_username = null;
    if(!paramsSecure.auth_password) paramsSecure.auth_password = null;
    const encryptedContent = await workers.encryption.encryptMessageMgs4ToBase64(paramsSecure, key.secret);
    encryptedContent.cle_id = key.cle_id;
    console.debug("New Key: %O\nEncrypted key command: %O\nEncrypted content: %O", key, keymasterCommand, encryptedContent);
    delete encryptedContent.digest;  // Not useful in this context

    // Send feed create commmand
    const addFeedContent: NewFeedPayload = {
        feed_type: feedType,
        security_level: security,
        domain: 'DataCollector',  // TODO - make dynamic
        encrypted_feed_information: encryptedContent,
        poll_rate: pollingRateInt,
        active,
        decrypt_in_database: decrypted,
    };
    return await workers.connection.createFeed(addFeedContent, keymasterCommand);
}
