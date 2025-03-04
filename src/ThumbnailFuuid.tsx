import {AttachedFile} from "./GetData.ts";
import {useEffect, useState} from "react";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";

type ThumbnailFuuidProps = {
    value: AttachedFile,
    secretKey: Uint8Array,
}

function ThumbnailFuuid(props: ThumbnailFuuidProps) {
    const {value, secretKey} = props;

    const {workers, ready} = useWorkers();
    const [blobUrl, setBlobUrl] = useState('');

    useEffect(()=>{
        if(!workers || !ready || !value) return;
        console.debug("Load thumbnail file", value);
        let blobUrl: string | null = null;
        workers.encryption.openFile(value.fuuid, secretKey, value.decryption)
            .then(blobInner=>{
                blobUrl = URL.createObjectURL(blobInner);
                setBlobUrl(blobUrl);
            })
            .catch(err=>{
                console.error("Error loading thumbnail %s: %O", value.fuuid, err);
            })

        return () => {
            // Cleanup
            setBlobUrl('');
            if(blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }, [value, workers, ready, secretKey, setBlobUrl]);

    if(!blobUrl) return <div></div>;

    return <img src={blobUrl} alt="Thumbnail image" />;
}

export default ThumbnailFuuid;