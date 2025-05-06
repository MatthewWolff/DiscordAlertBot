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
     * Finds a user by either their User object
     */
    findUser(user: User): UserData | undefined {
        return this.findUserByDatabaseName(user.username) || this.findUserByID(user.id)[1];
    }

    /**
     * Initializes a new user in the database
     */
    initializeUser(username: string, userId: string): void {
        if (!this.data.users[username]) {
            this.data.users[username] = {
                userId: userId,
                subscribers: {}
            };
        }
    }

    /**
     * Adds a game subscription
     */
    addSubscription(subscriber: User, target: User, game: string): void {
        // Ensure both users exist in the database
        this.initializeUser(subscriber.username, subscriber.id);
        this.initializeUser(target.username, target.id);

        const targetData = this.data.users[target.username];

        if (!targetData.subscribers[subscriber.username]) {
            targetData.subscribers[subscriber.username] = [];
        }

        if (!targetData.subscribers[subscriber.username].includes(game)) {
            targetData.subscribers[subscriber.username].push(game);
            logger.debug(`Added subscription: ${subscriber.username} -> ${target.username}: ${game}`);
        } else {
            logger.debug(`Subscription already exists: ${subscriber.username} -> ${target.username}: ${game}`);
        }
    }

    /**
     * Removes a game subscription
     */
    removeSubscription(subscriber: User, target: User, game: string): void {
        const targetData = this.data.users[target.username];

        if (!targetData?.subscribers[subscriber.username]) {
            logger.debug(`No subscriptions found for ${subscriber.username} -> ${target.username}`);
            return;
        }

        const index = targetData.subscribers[subscriber.username].indexOf(game);
        if (index !== -1) {
            targetData.subscribers[subscriber.username].splice(index, 1);
            logger.debug(`Removed subscription: ${subscriber.username} -> ${target.username}: ${game}`);

            // Clean up empty subscriber entries
            if (targetData.subscribers[subscriber.username].length === 0) {
                delete targetData.subscribers[subscriber.username];
                logger.debug(`Removed empty subscriber entry: ${subscriber.username} -> ${target.username}`);
            }
        } else {
            logger.debug(`Game not found in subscriptions: ${subscriber.username} -> ${target.username}: ${game}`);
        }
    }

    /**
     * Gets all games a user is subscribed to
     */
    getSubscribedGames(user: User): Map<string, string[]> {
        const subscribed = new Map<string, string[]>();

        for (const [targetUsername, userData] of Object.entries(this.data.users)) {
            if (user.username in userData.subscribers) {
                subscribed.set(targetUsername, userData.subscribers[user.username]);
            }
        }

        logger.debug(`Found ${subscribed.size} subscriptions for ${user.username}`);
        return subscribed;
    }

    /**
     * Gets all subscribers for a user
     */
    getSubscribers(user: User): Map<string, string[]> {
        const userData = this.data.users[user.username];
        if (!userData) {
            logger.debug(`No subscribers found for ${user.username}`);
            return new Map();
        }

        logger.debug(`Found ${Object.keys(userData.subscribers).length} subscribers for ${user.username}`);
        return new Map(Object.entries(userData.subscribers));
    }

    /**
     * Gets raw database data
     */
    getData(): DatabaseStructure {
        return this.data;
    }
}