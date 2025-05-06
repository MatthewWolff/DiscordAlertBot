import { Presence, User } from "discord.js";
import { ActivityType } from 'discord-api-types/v10';

import { BOT_OWNER, DESKTOP, SLEEPING_PREFIX, STATUS_OFFLINE } from "../config/constants";
import { BaseHandler } from "./baseHandler";
import { discordToString, filter, formatDate, getIntersection, getLogger } from "../util";
import { GameDatabase, UserData } from "../model";

const logger = getLogger("handler.PresenceUpdateHandler");

const GAME_ALERT_TIME_THRESHOLD_MILLISECONDS = 2 * 60 * 60 * 1000;

export class PresenceUpdateHandler extends BaseHandler {
    async handle(presence: Presence) {
        logger.debug(`[handle] Received presence update for userId: ${presence?.userId}`);

        if (!presence || presence.status == STATUS_OFFLINE) {
            logger.debug(`[handle] Presence invalid or user is not online. Status: ${presence?.status}`);
            return;
        }

        if (!presence.activities.some(activity => activity.type === ActivityType.Listening && activity.name === 'Spotify')) {
            logger.debug(`[handle] Presence: ${discordToString(presence)}`);
        }

        const user: User = await this.getUser(presence.userId);
        logger.debug(`[handle] Fetched user: ${user.username} (${user.id})`);

        const activities = presence.activities
            .filter(activity => activity.type === ActivityType.Playing && activity.name)
            .map(activity => activity.name);

        if (activities.length === 0) {
            logger.debug(`[handle] No playing activities found for ${user.username}`);
        } else {
            logger.debug(`[handle] Found games for ${user.username}: ${activities.join(', ')}`);
        }

        if (activities.length && presence.clientStatus?.[DESKTOP] !== STATUS_OFFLINE) {
            if (await this.isBotSleeping()) {
                logger.warn(`[handle] Bot is sleeping, ignoring presence update`);
                return;
            }

            await this.processAlerts(user, activities);
        } else {
            logger.debug(`[handle] User not online on desktop or no activities`);
        }
    }

    private async processAlerts(user: User, currentActivities: string[]) {
        logger.debug(`[processAlerts] Processing alerts for ${user.username} (${user.id})`);

        const database = await GameDatabase.load();

        const userData = database.findUserByID(user.id);
        if (!userData) {
            logger.debug(`[processAlerts] No database entry found for ${user.username}. Ignoring.`);
            return;
        }

        // Get all subscribers for this user
        const subscribers = database.getSubscribers(user);

        // Process each subscriber
        for (const [subscriberName, subscribedGames] of subscribers) {
            logger.debug(`[processAlerts] Processing subscriber: ${subscriberName}`);

            const matchedGames = getIntersection(subscribedGames, currentActivities);
            logger.debug(`[processAlerts] Matched games: ${matchedGames.join(', ')}`);

            if (matchedGames.length === 0) {
                logger.debug(`[processAlerts] No matching games for subscriber ${subscriberName}`);
                continue;
            }

            const subscriberData: UserData = database.findUserByDatabaseName(subscriberName);
            if (!subscriberData) {
                logger.warn(`[processAlerts] Subscriber ${subscriberName} not found in database`);
                continue;
            }

            const subscriber: User = await this.getUser(subscriberData.userId);
            (await filter(matchedGames, (game: string) => this.canMessageUserAboutGame(subscriber, game)))
                .map(game => {
                    logger.info(`[processAlerts] Alerting ${subscriber.username} that ${user.username} is playing ${game}`);
                    subscriber.send(`Hey, ${user.globalName} is playing ${game}!`)
                        .then(() => this.sendSelfMessage(`Alerted ${subscriber.username} about ${user.username} playing ${game}`))
                        .catch(e => logger.error(`[processAlerts] Failed to send DM to ${subscriber.username}`, e));
                });
        }
    }

    async isBotSleeping(): Promise<boolean> {
        logger.debug(`[isBotSleeping] Checking if bot is sleeping`);

        return this.getUser(BOT_OWNER).then(user =>
            user.createDM().then(dmChannel => dmChannel.messages.fetch({ limit: 100 })
                .then(messages => {
                    logger.debug(`[isBotSleeping] Fetched ${messages.size} messages from self DM`);

                    const recentSleep = messages
                        .filter(message => message.author.id === this.client.user.id)
                        .filter(message => message.content.startsWith(SLEEPING_PREFIX))
                        .sort((m1, m2) => m2.createdTimestamp - m1.createdTimestamp)
                        .first();

                    if (recentSleep) {
                        logger.debug(`[isBotSleeping] Found recent sleep message: ${recentSleep.content}`);
                        return this.isDoneSleeping(recentSleep.content);
                    } else {
                        logger.debug(`[isBotSleeping] No sleep messages found`);
                        return false;
                    }
                }).catch(e => {
                    logger.error(`[isBotSleeping] Error fetching messages for owner`, e);
                    return false;
                })
            )
        ).catch(e => {
            logger.error(`[isBotSleeping] Error fetching DM channel for owner`, e);
            return false;
        });
    }

    private isDoneSleeping(recentSleep: string): boolean {
        logger.debug(`[isDoneSleeping] Checking sleep time for message: "${recentSleep}"`);
        const date = new Date(recentSleep.replace(SLEEPING_PREFIX, "").trim());

        if (date.getTime() > Date.now()) {
            logger.warn(`[isDoneSleeping] Bot is still sleeping until ${date}`);
            return true;
        } else {
            logger.debug(`[isDoneSleeping] Bot is not sleeping`);
            return false;
        }
    }

    private async canMessageUserAboutGame(user: User, game: string) {
        logger.debug(`[canMessageUserAboutGame] Checking if user ${user.username} can be messaged about ${game}`);

        return user.createDM().then(dmChannel => dmChannel.messages.fetch({ limit: 100 })
            .then(messages => {
                logger.debug(`[canMessageUserAboutGame] Fetched ${messages.size} messages from DM with ${user.username}`);

                const recentAlertAboutGame = messages
                    .filter(message => message.author.id === this.client.user.id)
                    .filter(message => message.content.includes(game))
                    .filter(message => message.createdTimestamp > Date.now() - GAME_ALERT_TIME_THRESHOLD_MILLISECONDS)
                    .sort((m1, m2) => m2.createdTimestamp - m1.createdTimestamp)
                    .first();

                if (recentAlertAboutGame) {
                    logger.info(`[canMessageUserAboutGame] Already messaged ${user.username} about ${game} at ${formatDate(recentAlertAboutGame.createdTimestamp)}`);
                    return false;
                } else {
                    logger.debug(`[canMessageUserAboutGame] No recent alert for ${game} to ${user.username}`);
                    return true;
                }
            }).catch(e => {
                logger.error(`[canMessageUserAboutGame] Error fetching messages for user ${user.username}`, e);
                return false;
            })
        );
    }
}
