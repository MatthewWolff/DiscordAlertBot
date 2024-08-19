import { Activity, Client, Presence, User } from "discord.js";
import { ActivityType } from 'discord-api-types/v10';
import { DESKTOP, STATUS_ONLINE } from "../constants";

import userAlerts from '../userAlerts.json'


export class PresenceUpdateHandler {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async handlePresenceUpdate(presence: Presence) {
        if (!presence || presence.status !== STATUS_ONLINE) {
            return;
        }
        const user: User = await this.getUser(presence.userId);
        const latestActivity: string = this.getLatestActivity(presence.activities)
        console.log(`Username: "${user.globalName}" (${user.username})`);
        console.log(`Activity: "${latestActivity}"`);

        if (presence.clientStatus[DESKTOP] === STATUS_ONLINE) {
            console.info("User is playing on desktop :)")
            this.processAlerts(user, latestActivity);
        }
    }

    private processAlerts(user: User, latestActivity: string) {
        if (userAlerts[user.id]) {
            for (const userId in userAlerts[user.id]) {
                const games: string[] = userAlerts[user.id][userId];
                if (games.includes(latestActivity)) {
                    this.getUser(userId).then(usr => {
                        usr.send(`Hey, ${user.globalName} is playing ${latestActivity}!`).catch(() => {
                            console.error("User has DMs closed or has no mutual servers with the bot :(");
                        });
                        console.log(`Messaged ${usr.username}`)
                    })
                }
            }
        }
    }

    private getLatestActivity(activities: ReadonlyArray<Activity>): string {
        const latestActivity: Activity = activities
            .filter(activity => activity.type === ActivityType.Playing)
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .find(a => a !== undefined);

        return latestActivity ? latestActivity.name : '';
    }

    private getUser(id: string): Promise<User> {
        return this.client.users.fetch(id);
    }
}