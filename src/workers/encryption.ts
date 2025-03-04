// import '@solana/webcrypto-ed25519-polyfill';
import axios, {AxiosError} from 'axios';
import { gzip, inflate } from 'pako';
import {
    encryption,
    encryptionMgs4,
    multiencoding,
    keymaster,
    x25519,
    certificates,
    messageStruct
} from 'millegrilles.cryptography';
import {Filehost, FilehostDirType} from "./connection.worker.ts";

export type EncryptionResult = {
    format: string,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    digest?: Uint8Array,
    cle?: {signature: keymaster.DomainSignature}
    cle_id?: string,
    cleSecrete?: Uint8Array,
    compression?: string,
};

export type EncryptionBase64Result = {
    format: string,
    nonce: string,
    ciphertext_base64: string,
    digest?: string,
    cle?: {signature: keymaster.DomainSignature}
    cle_id?: string,
    cleSecrete?: Uint8Array,
    compression?: string,
};

export type GeneratedSecretKeyResult = { keyInfo: unknown, secret: Uint8Array, signature: keymaster.DomainSignature, cle_id: string };

export class AppsEncryptionWorker {
    millegrillePublicKey: Uint8Array | null;
    caCertificate: certificates.CertificateWrapper | null;
    encryptionKeys: Array<certificates.CertificateWrapper>;
    filehosts: FilehostDirType[] | null;
    selectedFilehost: FilehostDirType | null;

    constructor() {
        this.millegrillePublicKey = null;
        this.caCertificate = null;
        this.encryptionKeys = [];

        this.filehosts = null;
        this.selectedFilehost = null;
    }

    async initialize(caPem: string) {
        const wrapper = new certificates.CertificateWrapper([caPem], caPem);
        if(await wrapper.verify()) {
            const publicKey = wrapper.getPublicKey();
            this.millegrillePublicKey = multiencoding.decodeHex(publicKey);
            this.caCertificate = wrapper;
        }
    }

    async generateSecretKey(domains: string[]): Promise<GeneratedSecretKeyResult> {
        if(!this.millegrillePublicKey) throw new Error('Key not initialized');
        const keyInfo = await x25519.secretFromEd25519(this.millegrillePublicKey);
        const keySignature = new keymaster.DomainSignature(domains, 1, keyInfo.peer);
        await keySignature.sign(keyInfo.secret);
        const keyId = await keySignature.getKeyId();
        return { keyInfo, secret: keyInfo.secret, signature: keySignature, cle_id: keyId };
    }

    /**
     *
     * @param pems Arrays of pems, each pem being a certificat chain for a MaitreDesCles certificate.
     */
    async setEncryptionKeys(pems: Array<string[]>) {
        const validWrappers = [];
        for await(const wrapper of pems.map(item=>new certificates.CertificateWrapper(item))) {
            try{
                await wrapper.verify(this.caCertificate?.certificate);
                validWrappers.push(wrapper);
            } catch(err) {
                console.warn("invalid MaitreDesCles certificate, rejected", err);
            }
        }
        this.encryptionKeys = validWrappers;
    }

    async encryptMessageMgs4(cleartext: object | string | Uint8Array, opts?: {key?: string | Uint8Array, domain?: string}): Promise<EncryptionResult> {
        let key = opts?.key;
        const domain = opts?.domain;

        if(typeof(key) === 'string') {
            key = multiencoding.decodeBase64Nopad(key);
        }

        let cleartextArray: Uint8Array;
        if(typeof(cleartext) === 'string') {
            cleartextArray = new TextEncoder().encode(cleartext);
        } else if(ArrayBuffer.isView(cleartext)) {
            cleartextArray = cleartext as Uint8Array;
        } else {
            cleartextArray = new TextEncoder().encode(JSON.stringify(cleartext));
        }

        let compression = null as null | string;
        if(cleartextArray.length > 200) {
            // Issue with deflate, incompatible with the rust version.
            //compression = 'deflate';
            //cleartextArray = deflate(cleartextArray);

            // Compress with gzip
            compression = 'gz';
            cleartextArray = gzip(cleartextArray);
        }

        let cipher = null;
        let newKey: {signature: keymaster.DomainSignature, cles?: {[key: string]: string}} | null = null;
        let keyId = null as string | null;
        if(key) {
            // Reuse existing key
            cipher = await encryptionMgs4.getMgs4CipherWithSecret(key);
        } else if (domain) {
            // Ensure we have the information to generate a new encryption key.
            if(!this.millegrillePublicKey) throw new Error("MilleGrille CA key not initialized");
            if(this.encryptionKeys.length === 0) throw new Error("No system encryption keys are available");

            // Generate new key using the master key.
            const secret = await x25519.secretFromEd25519(this.millegrillePublicKey);
            cipher = await encryptionMgs4.getMgs4CipherWithSecret(secret.secret);

            const keySignature = new keymaster.DomainSignature([domain], 1, secret.peer);
            await keySignature.sign(cipher.key);

            const cles = await this.encryptSecretKey(secret.secret)

            keyId = await keySignature.getKeyId();
            key = secret.secret;
            newKey = {
                signature: keySignature,
                cles,
            };
        } else {
            throw new Error('Domain must be provided');
        }

        const out1 = await cipher.update(cleartextArray);
        const out2 = await cipher.finalize();

        const buffers = [];
        if(out1) buffers.push(out1);
        if(out2) buffers.push(out2);
        const ciphertext = encryption.concatBuffers(buffers);

        const info: EncryptionResult = {format: 'mgs4', nonce: cipher.header, ciphertext, digest: cipher.digest} as EncryptionResult;
        if(compression) info.compression = compression;
        if(newKey && keyId) {
            info.cle_id = keyId;
            info.cle = newKey;
            info.cleSecrete = key;
        }

        return info;
    }

    async encryptMessageMgs4ToBase64(cleartext: object | string | Uint8Array, key?: string | Uint8Array): Promise<EncryptionBase64Result> {
        const info = await this.encryptMessageMgs4(cleartext, {key});
        return {
            format: info.format,
            nonce: multiencoding.encodeBase64(info.nonce),
            ciphertext_base64: multiencoding.encodeBase64(info.ciphertext),
            digest: info.digest?(multiencoding.encodeBase64(info.digest)):undefined,
            cle: info.cle,
            cle_id: info.cle_id,
            cleSecrete: info.cleSecrete,
            compression: info.compression,
        };
    }

    /**
     * Encrytps a secret key for all currently loaded KeyMaster public keys.
     * @param secretKey Secret key to encrypt.
     * @returns Dict of encrypted keys.
     */
    async encryptSecretKey(secretKey: Uint8Array): Promise<{[key: string]: string}> {
        const cles = {} as {[key: string]: string};
        for await(const encryptionKey of this.encryptionKeys) {
            const fingerprint = encryptionKey.getPublicKey();
            const pkBytes = multiencoding.decodeHex(fingerprint);
            cles[fingerprint] = await x25519.encryptEd25519(secretKey, pkBytes);
        }
        return cles;
    }

    async decryptMessage(format: string, key: string | Uint8Array, nonce: string | Uint8Array, ciphertext: string | Uint8Array, compression?: string | null) {
        if(format !== 'mgs4') throw new Error('Unsupported format');

        if(typeof(key) === 'string') {
            key = multiencoding.decodeBase64Nopad(key);
        }
        if(typeof(nonce) === 'string') {
            nonce = multiencoding.decodeBase64Nopad(nonce);
        }
        if(typeof(ciphertext) === 'string') {
            if(ciphertext.endsWith('=')) {
                ciphertext = multiencoding.decodeBase64(ciphertext);
            } else {
                ciphertext = multiencoding.decodeBase64Nopad(ciphertext);
            }
        }

        const decipher = await encryptionMgs4.getMgs4Decipher(key, nonce);
        const cleartext1 = await decipher.update(ciphertext);
        const cleartext2 = await decipher.finalize();
        const buffers = [];
        if(cleartext1) buffers.push(cleartext1);
        if(cleartext2) buffers.push(cleartext2);

        let completeBuffer = encryption.concatBuffers(buffers)

        if(compression === 'gz' || compression === 'deflate') {
            completeBuffer = inflate(completeBuffer);
        } else if(compression) {
            throw new Error('Unsupported compression format: ' + compression);
        }

        return completeBuffer;
    }

    async setFilehostList(filehosts: Filehost[]) {
        this.filehosts = filehosts;
    }

    async selectLocalFilehost(localUrl: string) {
        try {
            await axios({url: localUrl + 'filehost/status'})
            // console.debug("Local filehost is available, using by default");

            const url = new URL(localUrl + 'filehost');
            this.selectedFilehost = {filehost_id: 'LOCAL', url: url.href};
            return;
        } catch(err: unknown) {
            const axiosErr = err as AxiosError;
            if(axiosErr.status) {
                throw new Error(`Local /filehost is not available: ${axiosErr.status}`)
            } else {
                throw err;
            }
        }
    }

    /**
     *
     * @param fuuid File unique identifier
     * @param secretKey Secret key used to decrypt the file
     * @param decryptionInformation Decryption information (nonce, format, etc.)
     */
    async openFile(fuuid: string, secretKey: Uint8Array, decryptionInformation: messageStruct.MessageDecryption): Promise<Blob> {
        const filehost = this.selectedFilehost;
        if(!filehost) throw new Error('No filehost is available');
        if(!filehost.authenticated) throw new Error('Connection to filehost not authenticated');
        const url = filehost.url;
        if(!url) throw new Error('No URL is available for the selected filehost');
        if(decryptionInformation.format !== 'mgs4') throw new Error('Unsupported encryption format: ' + decryptionInformation.format);
        if(!decryptionInformation.nonce) throw new Error('Nonce missing');

        const fileUrl = new URL(url + '/files/' + fuuid);
        const response = await axios({method: 'GET', url: fileUrl.href, responseType: 'blob', withCredentials: true});

        const encryptedBlob = response.data as Blob;

        // Decrypt file
        const nonce = multiencoding.decodeBase64(decryptionInformation.nonce);
        const decipher = await encryptionMgs4.getMgs4Decipher(secretKey, nonce);

        const readableStream = encryptedBlob.stream() as ReadableStream;
        const reader = readableStream.getReader();
        const blobs = [] as Blob[];  // Save all chunks in blobs, they will get concatenated at finalize.
        while(true) {
            const {done, value} = await reader.read();
            if(done) break;
            if(value && value.length > 0) {
                const output = await decipher.update(value);
                if(output && output.length > 0) {
                    const blob = new Blob([output]);
                    blobs.push(blob);
                }
            }
        }

        const finalOutput = await decipher.finalize();
        let outputBlob: Blob | null;
        if(finalOutput && finalOutput.length > 0) {
            outputBlob = new Blob([...blobs, finalOutput]);
        } else {
            outputBlob = new Blob(blobs);
        }

        return outputBlob;
    }

    async selectFilehost(localUrl: string, filehostId: string | null) {
        // Check if the local filehost is available first
        if(!this.filehosts || this.filehosts.length === 0) {
            await this.selectLocalFilehost(localUrl);
            return;  // Successful
        }

        if(this.filehosts.length === 1) {
            // Only one filehost, select and test
            const filehost = this.filehosts[0];
            // console.debug("Selecting the only filehost available: ", filehost);

            // Extract url
            if(filehost.url_external && filehost.tls_external !== 'millegrille') {
                const url = new URL(filehost.url_external);
                if(!url.pathname.endsWith('filehost')) {
                    url.pathname += 'filehost';
                }
                filehost.url = url.href;
            } else {
                throw new Error('The only available filehost has no means of accessing it from a browser');
            }

            this.selectedFilehost = filehost;
            return;
        } else if(filehostId) {
            // Try to pick the manually chosen filehost
            const filehost = this.filehosts.filter(item=>item.filehost_id === filehostId).pop();
            if(filehost) {
                // Extract url
                if(filehost.url_external && filehost.tls_external !== 'millegrille') {
                    const url = new URL(filehost.url_external);
                    if(!url.pathname.endsWith('filehost')) {
                        url.pathname += 'filehost';
                    }
                    filehost.url = url.href;
                } else {
                    throw new Error('The only available filehost has no means of accessing it from a browser');
                }

                // console.debug("Using manually chosen filehost ", filehost);
                this.selectedFilehost = filehost;
                return;
            }
        }

        // Default to local
        await this.selectLocalFilehost(localUrl);

        // Find a suitable filehost from the list. Ping the status of each to get an idea of the connection speed.
        //let performance = {} as {[filehostId: string]: number};
        //TODO
    }

    async authenticateFilehost(authenticationMessage: messageStruct.MilleGrillesMessage) {
        const filehost = this.selectedFilehost;
        if(!filehost) throw new Error('No filehost has been selected');
        const urlString = filehost.url;
        if(!urlString) throw new Error('No URL is available for the selected filehost');
        const url = new URL(urlString);

        // console.debug("Log into filehost ", filehost);
        const authUrl = new URL(`https://${url.hostname}:${url.port}/filehost/authenticate`);

        // console.debug('Authenticate url: %s, Signed message: %O', authUrl.href, authenticationMessage);
        try {
            const response = await axios({
                method: 'POST',
                url: authUrl.href,
                data: authenticationMessage,
                withCredentials: true,
            });

            // console.debug("Authentication response: ", response)
            if(!response.data.ok) {
                console.error("Authentication data response: ", response.data);
                throw new Error("Authentication error: " + response.data.err);
            }

            filehost.authenticated = true;
        } catch(err) {
            filehost.authenticated = false;
            filehost.jwt = null;
            throw err;
        }
    }

}
