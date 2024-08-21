import { Client, User } from "discord.js";

import { getLogger } from "../util";

const logger = getLogger("handler.BaseHandler");

export abstract class BaseHandler {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    abstract handle(field: any): Promise<void>;

    public getUser(id: string): Promise<User> {
        logger.trace(`fetching <@User> for id: ${id}`);
        return this.client.users.fetch(id);
    }
}
