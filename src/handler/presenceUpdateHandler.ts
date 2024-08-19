import { Activity, Presence, User } from "discord.js";
import { ActivityType } from 'discord-api-types/v10';
import { DESKTOP, STATUS_ONLINE } from "../constants";

import userAlerts from '../userAlerts.json'
import { BaseHandler } from "./baseHandler";


export class PresenceUpdateHandler extends BaseHandler {
    async handlePresenceUpdate(presence: Presence) {
        if (!presence || presence.status !== STATUS_ONLINE) {
            return;
        }
        const user: User = await this.getUser(presence.userId);
        const latestActivity: string = this.getLatestActivity(presence.activities)

        if (!latestActivity) {
            return;
        }

        console.log(`Username: "${user.globalName}" (${user.username})`);
        console.log(`Activity: "${latestActivity}"`);
        if (presence.clientStatus[DESKTOP] === STATUS_ONLINE) {
            this.processAlerts(user, latestActivity);
        }
    }

    private processAlerts(user: User, latestActivity: string) {
        if (userAlerts[user.id]) {
            for (const userId in userAlerts[user.id]) {
                const games: string[] = userAlerts[user.id][userId];
                if (games.includes(latestActivity)) {
                    this.getUser(userId).then(usr => {
                        usr.send(`Hey, ${user.globalName} is playing ${latestActivity}!`)
                            .then(() => console.log(`Messaged ${usr.username}`))
                            .catch(() => {
                                console.error(`User ${user.username} has DMs closed or has no mutual servers with the bot :(`);
                            });
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
}
