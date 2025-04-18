import { expose } from 'comlink';

import {encryption, messageStruct} from "millegrilles.cryptography";
import {ConnectionWorker, MessageResponse} from "millegrilles.reactdeps.typescript";

import apiMapping from './apiMapping.json';

// import {install as solanaInstall} from '@solana/webcrypto-ed25519-polyfill';
// solanaInstall();

const DOMAIN_DATA_COLLECTOR_NAME = 'DataCollector';
const DOMAINE_CORETOPOLOGIE = 'CoreTopologie';

type FeedPayload = {
    security_level: string,
    encrypted_feed_information: encryption.EncryptedData,
    poll_rate?: number | null,
    active?: boolean | null,
    decrypt_in_database?: boolean | null,
}

export type NewFeedPayload = FeedPayload & {
    feed_type: string,
    domain: string,
}

export type UpdateFeedPayload = FeedPayload & {
    feed_id: string,
};

export type FeedType = NewFeedPayload & {
    feed_id: string,
    user_id: string,
};

export type EncryptedKeyType = {[keyId: string]: Uint8Array};

/** Feed decrypted metadata. */
export type FeedInformation = {
    name: string,
    url?: string | null,
    auth_username?: string | null,
    auth_password?: string | null,
    custom_code?: string | null,
};

export type GetFeedsResponseType = MessageResponse & {
    feeds: FeedType[];
    keys: messageStruct.MilleGrillesMessage,
};

export type DataItemType = {
    data_id: string,
    feed_id: string,
    pub_date: number,
    encrypted_data: encryption.EncryptedData,
};

export type GetDataItemsResponseType = MessageResponse & {
    items: DataItemType[];
    keys: messageStruct.MilleGrillesMessage,
    estimated_count?: number | null,
};

export type Filehost = {
    filehost_id: string,
    instance_id?: string | null,
    tls_external?: string | null,
    url_external?: string | null,
    url_internal?: string | null,
}

export type FilehostDirType = Filehost & {
    url?: string | null,
    jwt?: string | null,
    authenticated?: boolean | null,
    lastPing?: number | null,
};

export type GetFilehostsResponse = MessageResponse & {list?: Filehost[] | null};

export class AppsConnectionWorker extends ConnectionWorker {

    async authenticate(reconnect?: boolean): Promise<boolean> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.authenticate(apiMapping, reconnect);
    }

    async createFeed(feed: NewFeedPayload, keyCommand: messageStruct.MilleGrillesMessage): Promise<MessageResponse> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendCommand(feed, DOMAIN_DATA_COLLECTOR_NAME, 'createFeed', {attachments: {key: keyCommand}});
    }

    async updateFeed(feed: UpdateFeedPayload): Promise<MessageResponse> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendCommand(feed, DOMAIN_DATA_COLLECTOR_NAME, 'updateFeed');
    }

    async deleteFeed(feedId: string): Promise<MessageResponse> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendCommand({feed_id: feedId}, DOMAIN_DATA_COLLECTOR_NAME, 'deleteFeed');
    }

    async getFeeds(feedIds?: string[] | null): Promise<GetFeedsResponseType> {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendRequest({feed_ids: feedIds}, DOMAIN_DATA_COLLECTOR_NAME, 'getFeeds') as Promise<GetFeedsResponseType>;
    }

    async getDataItems(feedId: string, skip?: number | null, limit?: number | null, start_date?: Date | null, end_date?: Date | null) {
        if(!this.connection) throw new Error("Connection is not initialized");
        if(start_date && end_date) {
            return await this.connection.sendRequest({
                feed_id: feedId,
                skip,
                limit,
                // Convert dates to epoch seconds
                start_date: Math.floor(start_date.getTime()/1000),
                end_date: Math.floor(end_date.getTime()/1000),
            }, DOMAIN_DATA_COLLECTOR_NAME, 'getDataItemsDateRange') as Promise<GetDataItemsResponseType>;
        } else {
            return await this.connection.sendRequest({
                feed_id: feedId,
                skip,
                limit
            }, DOMAIN_DATA_COLLECTOR_NAME, 'getDataItemsMostRecent') as Promise<GetDataItemsResponseType>;
        }
    }

    async getFilehosts() {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendRequest({}, DOMAINE_CORETOPOLOGIE, 'getFilehosts') as GetFilehostsResponse;
    }

    async getCertificate() {
        if(!this.connection) throw new Error("Connection is not initialized");
        return this.connection.getMessageFactoryCertificate();
    }

}

const WORKER = new AppsConnectionWorker();
expose(WORKER);
