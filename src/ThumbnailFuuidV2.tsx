import {useEffect, useState} from "react";
import {useWorkers} from "./workers/PrivateWorkerContextData.ts";
import {AttachedFile} from "./workers/connection.worker.ts";

type ThumbnailFuuidProps = {
    value: AttachedFile,
    secretKey?: Uint8Array | null,
    className?: string
}

function ThumbnailFuuidV2(props: ThumbnailFuuidProps) {
    const {value, secretKey, className} = props;

    const {workers, ready, filehostAuthenticated} = useWorkers();
    const [blobUrl, setBlobUrl] = useState('');

    useEffect(()=>{
        if(!workers || !ready || !filehostAuthenticated || !value || !secretKey) return;
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
    }, [value, workers, ready, filehostAuthenticated, secretKey, setBlobUrl]);

    if(!blobUrl) return <div></div>;

    return <img src={blobUrl} alt="Thumbnail image" className={className} />;
}

export default ThumbnailFuuidV2;
