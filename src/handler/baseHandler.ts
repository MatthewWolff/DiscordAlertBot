import { Client, User } from "discord.js";

import { getLogger } from "../util";

const logger = getLogger("handler.BaseHandler");

export class BaseHandler {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    public getUser(id: string): Promise<User> {
        logger.trace(`fetching <@User> for id: ${id}`);
        return this.client.users.fetch(id);
    }
}
