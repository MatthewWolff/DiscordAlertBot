import { Client, Message, User } from "discord.js";

import { getLogger } from "../util";
import { BOT_OWNER } from "../config/constants";
import { MessageCore } from "../model";

const logger = getLogger("handler.BaseHandler");

export abstract class BaseHandler {

    DM_AUTHOR_ID_TEXT_SEPARATOR = " |<ID>| ";

    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    abstract handle(field: any): Promise<void>;

    public getUser(id: string): Promise<User> {
        logger.trace(`fetching <@User> for id: ${id}`);
        return this.client.users.fetch(id);
    }

    public async sendMessage(message: Message | MessageCore, from: User, to: User) {
        logger.info(`[MSG] FROM: "${from.username}", TO "${to.username}" || \`${message}\``)
        const nonOwnerIdentifier = ` - ${from.username} ${this.DM_AUTHOR_ID_TEXT_SEPARATOR} ${from.id}`;
        to.send(message.content + (from.id !== BOT_OWNER ? nonOwnerIdentifier : ''))
            .catch(e => logger.error(`Error forwarding message: ${e}`));
    }

    public async sendSelfMessage(message: string) {
        const owner = await this.getUser(BOT_OWNER);
        owner.send(message)
            .then(() => logger.info(`Messaged self: "${message}"`))
            .catch(e => logger.error(`Error forwarding message: ${e}`));
    }
}
