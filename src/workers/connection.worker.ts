import { expose } from 'comlink';

import {encryption, messageStruct} from "millegrilles.cryptography";
import {ConnectionWorker, MessageResponse} from "millegrilles.reactdeps.typescript";

import apiMapping from './apiMapping.json';

// import {install as solanaInstall} from '@solana/webcrypto-ed25519-polyfill';
// solanaInstall();

const DOMAIN_DATA_COLLECTOR_NAME = 'DataCollector';

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

export type DataItemType = {
    data_id: string,
    feed_id: string,
    pub_date: number,
    encrypted_data: encryption.EncryptedData,
};

export type GetDataItemsResponseType = MessageResponse & {
    items: DataItemType[];
    keys: messageStruct.MilleGrillesMessage,
};

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

    async getDataItems(feedId: string) {
        if(!this.connection) throw new Error("Connection is not initialized");
        return await this.connection.sendRequest({feed_id: feedId}, DOMAIN_DATA_COLLECTOR_NAME, 'getDataItemsMostRecent') as Promise<GetDataItemsResponseType>;
    }

}

const WORKER = new AppsConnectionWorker();
expose(WORKER);
