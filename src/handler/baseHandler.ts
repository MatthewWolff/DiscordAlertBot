import { Client, User } from "discord.js";

export class BaseHandler {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    public getUser(id: string): Promise<User> {
        return this.client.users.fetch(id);
    }
}
