import { Activity, Presence, User } from "discord.js";
import { ActivityType } from 'discord-api-types/v10';

import { DESKTOP, STATUS_ONLINE } from "../config/constants";
import userAlerts from '../config/userAlerts.json'
import { BaseHandler } from "./baseHandler";
import { discordToString, getLogger } from "../util";

const logger = getLogger("handler.PresenceUpdateHandler")

export class PresenceUpdateHandler extends BaseHandler {
    async handle(presence: Presence) {
        if (!presence || presence.status !== STATUS_ONLINE) {
            return;
        }
        const user: User = await this.getUser(presence.userId);
        const latestActivity: string = this.getLatestActivity(presence.activities)

        if (!latestActivity) {
            logger.debug(`User ${user.username} has empty activity - ${JSON.stringify(presence, null, 2)}`)
            return;
        }

        logger.debug(`Presence Updated:\nUsername - "${user.globalName}" (${user.username})\nActivity - "${latestActivity}"`);
        if (presence.clientStatus[DESKTOP] === STATUS_ONLINE) {
            this.processAlerts(user, latestActivity);
        }
    }

    private processAlerts(user: User, latestActivity: string) {
        if (userAlerts[user.id]) {
            logger.trace(JSON.stringify(userAlerts[user.id], null, 2));
            for (const userId in userAlerts[user.id]) {
                const games: string[] = userAlerts[user.id][userId];
                if (games.includes(latestActivity)) {
                    this.getUser(userId).then(usr => {
                        usr.send(`Hey, ${user.globalName} is playing ${latestActivity}!`)
                            .then(() => logger.info(`Alerted ${usr.username}`))
                            .catch(() => {
                                logger.error(`User ${user.username} has DMs closed or has no mutual servers with the bot :(`);
                            });
                    })
                }
            }
        }
    }

    private getLatestActivity(activities: ReadonlyArray<Activity>): string {
        logger.debug(`ACTIVITIES: ${discordToString(activities)} `);
        const latestActivity: Activity = activities
            .filter(activity => activity.type === ActivityType.Playing)
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
            .find(a => a !== undefined);

        return latestActivity ? latestActivity.name : '';
    }
}
