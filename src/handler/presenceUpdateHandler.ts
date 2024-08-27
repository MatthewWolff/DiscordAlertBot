import { Presence, User } from "discord.js";
import { ActivityType } from 'discord-api-types/v10';

import { DESKTOP, STATUS_ONLINE } from "../config/constants";
import userAlerts from '../config/gameMap.json'
import { BaseHandler } from "./baseHandler";
import { formatDate, getIntersection, getLogger } from "../util";
import { MessageCore } from "../model";

const logger = getLogger("handler.PresenceUpdateHandler")


const GAME_ALERT_TIME_THRESHOLD_MILLISECONDS = 2 * 60 * 60 * 1000;

export class PresenceUpdateHandler extends BaseHandler {
    async handle(presence: Presence) {
        if (!presence || presence.status !== STATUS_ONLINE) {
            return;
        }
        const user: User = await this.getUser(presence.userId);
        console.log(user)
        console.log(presence.activities);
        const activities = presence.activities
            .filter(activity => activity.type === ActivityType.Playing)
            .map(activity => activity.name);

        if (activities && presence.clientStatus[DESKTOP] === STATUS_ONLINE) {
            logger.info(`Found activities for ${user.username}: ${activities.join(', ')}`);
            await this.processAlerts(user, activities);
        }
    }

    private async processAlerts(user: User, currentActivities: string[]) {
        if (userAlerts[user.id]) {
            for (const friendId in userAlerts[user.id]) {
                const friend: User = await this.getUser(friendId);
                const subscribedGames: string[] = userAlerts[user.id][friendId];
                getIntersection(subscribedGames, currentActivities)
                    .filter(game => this.canMessageUserAboutGame(friend, game))
                    .map(game => {
                        logger.info(`User ${user.username} is playing ${game}`);
                        this.sendMessage(MessageCore.from(`Hey, ${user.globalName} is playing ${game}!`), user, friend)
                            .then(() => this.sendSelfMessage(`Alerted ${friend.username} about ${currentActivities}`))
                            .catch(e => logger.error(`User ${friend.username} has DMs closed or has no mutual servers with the bot :(`, e));
                    });
            }
        }
    }

    private canMessageUserAboutGame(user: User, game: string) {
        const lastMessageMentionsGame = user.createDM().then(dmChannel => {
            return dmChannel.lastMessage ? dmChannel.lastMessage.content.includes(game) : false;
        });
        if (lastMessageMentionsGame) {
            logger.info(`Already messaged user ${user.username} about ${game} at ${formatDate(user.dmChannel.lastMessage.createdTimestamp)}`);
            return false;
        }
        return true;

        // maybe make this work eventually?
        // user.dmChannel.messages.fetch({ limit: 100 }).then(messages => {
        //     const recentAlertAboutGame = messages
        //         .filter(message => message.author.id === this.client.user.id)
        //         .filter(message => message.content.includes(game))
        //         .filter(message => message.createdTimestamp > Date.now() - GAME_ALERT_TIME_THRESHOLD_MILLISECONDS)
        //         .sort((m1, m2) => m2.createdTimestamp - m1.createdTimestamp)
        //         .first();
        //     if (recentAlertAboutGame) {
        //         logger.info(`Already messaged user ${user.username} about ${game} at ${formatDate(recentAlertAboutGame.createdTimestamp)}`)
        //         return false;
        //     } else {
        //         return true;
        //     }
        //
        // }).catch(e => {
        //     logger.error(`Error fetching messages for user ${user.username}`, e);
        // });
    }
}
