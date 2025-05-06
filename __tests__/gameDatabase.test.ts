import { DatabaseStructure, GameDatabase } from '../src/model/gameDatabase';
import { User } from 'discord.js';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('GameDatabase', () => {
    let mockData: DatabaseStructure;
    let mockUser1: User;
    let mockUser2: User;
    let mockUser3: User;

    beforeEach(() => {
        mockData = {
            users: {
                'TestUser1': {
                    userId: '123',
                    subscribers: {
                        'TestUser2': ['Game1', 'Game2']
                    }
                },
                'TestUser2': {
                    userId: '456',
                    subscribers: {}
                }
            }
        };

        (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        mockUser1 = { id: '123', username: 'TestUser1' } as User;
        mockUser2 = { id: '456', username: 'TestUser2' } as User;
        mockUser3 = { id: '789', username: 'TestUser3' } as User;
    });

    describe('load', () => {
        it('should load database successfully', async () => {
            const database = await GameDatabase.load();
            expect(database.getData()).toEqual(mockData);
        });

        it('should return empty database on error', async () => {
            (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
            const database = await GameDatabase.load();
            expect(database.getData()).toEqual({ users: {} });
        });
    });

    describe('save', () => {
        it('should save database successfully', async () => {
            const database = await GameDatabase.load();
            await database.save();
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                JSON.stringify(mockData, null, 2)
            );
        });
    });

    describe('findUserByID', () => {
        it('should find existing user by ID', async () => {
            const database = await GameDatabase.load();
            const user = database.findUserByID('123');
            expect(user).toEqual(mockData.users['TestUser1']);
        });

        it('should return undefined for non-existent user', async () => {
            const database = await GameDatabase.load();
            const user = database.findUserByID('999');
            expect(user).toBeUndefined();
        });
    });

    describe('findUserByDatabaseName', () => {
        it('should find existing user by database name', async () => {
            const database = await GameDatabase.load();
            const user = database.findUserByDatabaseName('TestUser1');
            expect(user).toEqual(mockData.users['TestUser1']);
        });

        it('should return undefined for non-existent user', async () => {
            const database = await GameDatabase.load();
            const user = database.findUserByDatabaseName('NonExistentUser');
            expect(user).toBeUndefined();
        });
    });

    describe('initializeUser', () => {
        it('should initialize new user', async () => {
            const database = await GameDatabase.load();
            const userEntry = database.initializeUser(mockUser3);
            expect(userEntry).toEqual({
                username: 'TestUser3',
                userData: { userId: '789', subscribers: {} }
            });
        });

        it('should not overwrite existing user', async () => {
            const database = await GameDatabase.load();
            const userEntry = database.initializeUser(mockUser1);
            expect(userEntry).toEqual({
                username: 'TestUser1',
                userData: mockData.users['TestUser1']
            });
        });
    });

    describe('getUserEntryFromId', () => {
        it('should return correct user entry', async () => {
            const database = await GameDatabase.load();
            const userEntry = database.getUserEntryFromId('123');
            expect(userEntry).toEqual({
                username: 'TestUser1',
                userData: mockData.users['TestUser1']
            });
        });
    });

    describe('addSubscription', () => {
        it('should add new subscription', async () => {
            const database = await GameDatabase.load();
            const result = await database.addSubscription(mockUser2, mockUser1, 'Game3');
            expect(result).toBe(true);
            const subscribers = database.getSubscribers(mockUser1);
            expect(subscribers.get('456')).toContain('Game3');
        });

        it('should not add duplicate games', async () => {
            const database = await GameDatabase.load();
            const result = await database.addSubscription(mockUser2, mockUser1, 'Game1');
            expect(result).toBe(false);
            const subscribers = database.getSubscribers(mockUser1);
            expect(subscribers.get('456')?.filter(g => g === 'Game1')).toHaveLength(1);
        });
    });

    describe('removeSubscription', () => {
        it('should remove existing subscription', async () => {
            const database = await GameDatabase.load();
            const result = await database.removeSubscription(mockUser2, mockUser1, 'Game1');
            expect(result).toBe(true);
            const subscribers = database.getSubscribers(mockUser1);
            expect(subscribers.get('456')).not.toContain('Game1');
        });

        it('should return false for non-existent subscription', async () => {
            const database = await GameDatabase.load();
            const result = await database.removeSubscription(mockUser2, mockUser1, 'NonExistentGame');
            expect(result).toBe(false);
        });
    });

    describe('lookupUserIdByDatabaseName', () => {
        it('should return correct userId', async () => {
            const database = await GameDatabase.load();
            const userId = database.lookupUserIdByDatabaseName('TestUser1');
            expect(userId).toBe('123');
        });

        it('should return undefined for non-existent user', async () => {
            const database = await GameDatabase.load();
            const userId = database.lookupUserIdByDatabaseName('NonExistentUser');
            expect(userId).toBeUndefined();
        });
    });

    describe('getSubscribedGames', () => {
        it('should return correct subscribed games', async () => {
            const database = await GameDatabase.load();
            const subscribedGames = database.getSubscribedGames(mockUser2);
            expect(subscribedGames.get('123')).toEqual(['Game1', 'Game2']);
        });

        it('should return empty map for user with no subscriptions', async () => {
            const database = await GameDatabase.load();
            const subscribedGames = database.getSubscribedGames(mockUser3);
            expect(subscribedGames.size).toBe(0);
        });
    });

    describe('getSubscribers', () => {
        it('should return correct subscribers', async () => {
            const database = await GameDatabase.load();
            const subscribers = database.getSubscribers(mockUser1);
            expect(subscribers.get('456')).toEqual(['Game1', 'Game2']);
        });

        it('should return empty map for user with no subscribers', async () => {
            const database = await GameDatabase.load();
            const subscribers = database.getSubscribers(mockUser2);
            expect(subscribers.size).toBe(0);
        });
    });
});
