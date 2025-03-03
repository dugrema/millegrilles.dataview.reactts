import { expose } from 'comlink';

import {encryption, messageStruct} from "millegrilles.cryptography";
import {ConnectionWorker, MessageResponse} from "millegrilles.reactdeps.typescript";

import apiMapping from './apiMapping.json';

// import {install as solanaInstall} from '@solana/webcrypto-ed25519-polyfill';
// solanaInstall();

const DOMAIN_DATA_COLLECTOR_NAME = 'DataCollector';

export type NewFeedPayload = {
    feed_type: string,
    security_level: string,
    domain: string,
    encrypted_feed_information: encryption.EncryptedData,
    poll_rate?: number | null,
    active?: boolean | null,
    decrypt_in_database?: boolean | null,
}

export type FeedType = NewFeedPayload & {
    feed_id: string,
};

export type EncryptedKeyType = {[keyId: string]: Uint8Array};

/** Feed decrypted metadata. */
export type FeedInformation = {
    name: string,
    url?: string | null,
    auth_username?: string | null,
    auth_password?: string | null,
};

export type GetFeedsResponseType = MessageResponse & {
    feeds: FeedType[];
    keys: messageStruct.MilleGrillesMessage,
};

export class AppsConnectionWorker extends ConnectionWorker {

    async authenticate(reconnect?: boolean): Promise<boolean> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return this.connection.authenticate(apiMapping, reconnect);
    }

    async createFeed(feed: NewFeedPayload, keyCommand: messageStruct.MilleGrillesMessage): Promise<MessageResponse> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return this.connection.sendCommand(feed, DOMAIN_DATA_COLLECTOR_NAME, 'createFeed', {attachments: {key: keyCommand}});
    }

    async getFeeds(): Promise<GetFeedsResponseType> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendRequest({}, DOMAIN_DATA_COLLECTOR_NAME, 'getFeeds') as Promise<GetFeedsResponseType>;
    }

}

const WORKER = new AppsConnectionWorker();
expose(WORKER);
