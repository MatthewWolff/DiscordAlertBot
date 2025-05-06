import * as fs from 'fs/promises';
import { getLogger } from '../util';
import { User } from "discord.js";

const logger = getLogger('model.gameDatabase');

export interface UserData {
    userId: string;
    subscribers: {
        [username: string]: string[];  // Array of games
    };
}

export interface DatabaseStructure {
    users: {
        [username: string]: UserData;
    };
}

export interface UserEntry {
    username: string;
    userData: UserData;
}

export class GameDatabase {
    private readonly data: DatabaseStructure;

    private constructor(data: DatabaseStructure) {
        this.data = data;
    }

    /**
     * Loads the database from the JSON file
     */
    static async load(): Promise<GameDatabase> {
        try {
            logger.debug("Loading database...");
            const data = await fs.readFile('src/config/gameMap.json', 'utf-8');
            return new GameDatabase(JSON.parse(data));
        } catch (error) {
            logger.error('Error loading database:', error);
            return new GameDatabase({ users: {} });
        }
    }

    /**
     * Saves the current state of the database to the JSON file
     */
    async save(): Promise<void> {
        try {
            logger.debug("Saving database...");
            await fs.writeFile('src/config/gameMap.json', JSON.stringify(this.data, null, 2));
        } catch (error) {
            logger.error('Error saving database:', error);
        }
    }

    /**
     * Finds a user by their Discord ID
     */
    findUserByID(userId: string): UserData | undefined {
        const userEntry = Object.entries(this.data.users)
            .find(([_, userData]) => userData.userId === userId);
        return userEntry ? userEntry[1] : undefined;
    }

    /**
     * Finds a user by their username
     */
    findUserByDatabaseName(username: string): UserData | undefined {
        return this.data.users[username];
    }

    /**
     * Initializes a new user in the database
     */
    initializeUser(user: User): UserEntry {
        const databaseName = this.findUserByID(user.id);
        if (!databaseName) {
            this.data.users[user.username] = {
                userId: user.id,
                subscribers: {}
            };
        }

        return this.getUserEntryFromId(user.id)
    }

    getUserEntryFromId(id: string): UserEntry {
        const entry = Object.entries(this.data.users).find(([_, userData]) => userData.userId === id);
        return {
            username: entry[0],
            userData: entry[1]
        };
    }

    /**
     * Adds a game subscription
     */
    async addSubscription(subscriber: User, target: User, game: string): Promise<boolean> {
        // Ensure both users exist in the database
        const subscriberEntry = this.initializeUser(subscriber);
        const targetData = this.initializeUser(target).userData;

        if (!targetData.subscribers[subscriberEntry.username]) {
            targetData.subscribers[subscriberEntry.username] = [];
        }

        if (!targetData.subscribers[subscriberEntry.username].includes(game)) {
            targetData.subscribers[subscriberEntry.username].push(game);
            logger.debug(`Added subscription: ${subscriberEntry.username} -> ${target.username}: ${game}`);
            await this.save();
            return true;
        } else {
            logger.debug(`Subscription already exists: ${subscriberEntry.username} -> ${target.username}: ${game}`);
            return false;
        }
    }

    /**
     * Removes a game subscription
     */
    async removeSubscription(subscriber: User, target: User, game: string): Promise<boolean> {
        const subscriberEntry = this.getUserEntryFromId(subscriber.id);
        const targetData = this.getUserEntryFromId(target.id).userData;

        if (!targetData?.subscribers[subscriberEntry.username]) {
            logger.debug(`No subscriptions found for ${subscriberEntry.username} -> ${target.username}`);
            return false;
        }

        const index = targetData.subscribers[subscriberEntry.username].indexOf(game);
        if (index !== -1) {
            targetData.subscribers[subscriberEntry.username].splice(index, 1);
            logger.debug(`Removed subscription: ${subscriberEntry.username} -> ${target.username}: ${game}`);

            // Clean up empty subscriber entries
            if (targetData.subscribers[subscriberEntry.username].length === 0) {
                delete targetData.subscribers[subscriberEntry.username];
                logger.debug(`Removed empty subscriber entry: ${subscriberEntry.username} -> ${target.username}`);
            }
            await this.save()
            return true;
        } else {
            logger.debug(`Game not found in subscriptions: ${subscriberEntry.username} -> ${target.username}: ${game}`);
            return false;
        }
    }

    lookupUserIdByDatabaseName(databaseName: string): string | undefined {
        const userEntry = Object.entries(this.data.users).find(([name, _]) => name === databaseName);
        return userEntry ? userEntry[1].userId : undefined;
    }

    /**
     * Gets all games a user is subscribed to
     */
    getSubscribedGames(user: User): Map<string, string[]> {
        const userEntry = Object.entries(this.data.users).find(([_, userData]) => userData.userId === user.id);
        if (!userEntry) {
            logger.error(`No subscriptions found for ${user.username}`);
            return new Map();
        }

        const databaseName = userEntry[0];

        const subscribed = new Map<string, string[]>();
        for (const [_, targetUserData] of Object.entries(this.data.users)) {
            if (databaseName in targetUserData.subscribers) {
                logger.debug(`Found subscription for ${databaseName} in ${targetUserData.userId}`);
                subscribed.set(targetUserData.userId, targetUserData.subscribers[databaseName]);
            }
        }

        logger.debug(`Found ${subscribed.size} subscriptions for ${user.username}`);
        return subscribed;
    }

    /**
     * Gets all subscribers for a user
     */
    getSubscribers(user: User): Map<string, string[]> {
        const userData = this.findUserByID(user.id);
        if (!userData) {
            logger.debug(`No subscribers found for ${user.username} (${user.id})`);
            return new Map();
        }

        const subscribersWithIds = new Map<string, string[]>();
        for (const [subscriberDatabaseName, games] of Object.entries(userData.subscribers)) {
            subscribersWithIds.set(this.lookupUserIdByDatabaseName(subscriberDatabaseName), games);
        }

        logger.debug(`Found ${subscribersWithIds.size} subscribers for ${user.username} (${user.id})`);
        return subscribersWithIds;
    }

    /**
     * Gets raw database data
     */
    getData(): DatabaseStructure {
        return this.data;
    }
}