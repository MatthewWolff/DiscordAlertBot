// __tests__/presenceUpdateHandler.test.ts
import { PresenceUpdateHandler } from '../src/handler';
import { Client, Message, Presence, User } from 'discord.js';
import { ActivityType } from 'discord-api-types/v10';

jest.mock('discord.js');

const mockMessage = { content: 'Test message' } as Message;
const mockSend = jest.fn().mockResolvedValue(mockMessage);
const mockDMSend = jest.fn().mockResolvedValue(mockMessage);
const mockFetchMessages = jest.fn();

const createMockUser = (id: string, username: string): User => {
    return {
        id,
        username,
        globalName: username.toUpperCase(),
        send: mockSend,
        createDM: jest.fn().mockResolvedValue({
            send: mockDMSend,
            messages: {
                fetch: mockFetchMessages,
            },
        }),
    } as unknown as User;
};

const createMockPresence = (userId: string, games: string[]): Presence => ({
    userId,
    status: 'online',
    clientStatus: { desktop: 'online' },
    activities: games.map(name => ({
        type: ActivityType.Playing,
        name,
    })),
} as unknown as Presence);

describe('PresenceUpdateHandler', () => {
    let handler: PresenceUpdateHandler;
    let mockClient: Client;

    beforeEach(() => {
        jest.clearAllMocks();

        const mockUsersFetch = jest.fn((id: string) => {
            const users: { [key: string]: User } = {
                '164537364092289024': createMockUser('164537364092289024', 'Matthew'),
                '265610485812953088': createMockUser('265610485812953088', 'Tyler'),
                '225142521024610304': createMockUser('225142521024610304', 'Bryan'),
                '226129559303487488': createMockUser('226129559303487488', 'MJ'),
            };
            return Promise.resolve(users[id]);
        });

        mockClient = {
            users: {
                fetch: mockUsersFetch,
            },
            user: { id: 'botId' }
        } as unknown as Client;

        handler = new PresenceUpdateHandler(mockClient);

        handler.isBotSleeping = jest.fn().mockResolvedValue(false);
        mockFetchMessages.mockResolvedValue({
            filter: () => ({
                filter: () => ({
                    filter: () => ({
                        sort: () => ({
                            first: () => null,
                        }),
                    }),
                }),
            }),
        });
    });

    test('should alert friend when game matches and threshold not reached', async () => {
        const presence = createMockPresence('164537364092289024', ['Marvel Rivals']);
        await handler.handle(presence);

        expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('MATTHEW is playing Marvel Rivals'));
    });

    test('should not alert if bot is sleeping', async () => {
        (handler.isBotSleeping as jest.Mock).mockResolvedValue(true);
        const presence = createMockPresence('164537364092289024', ['Marvel Rivals']);
        await handler.handle(presence);

        expect(mockSend).not.toHaveBeenCalled();
    });

    test('should not alert for non-playing activities', async () => {
        const presence = {
            userId: '164537364092289024',
            status: 'online',
            clientStatus: { desktop: 'online' },
            activities: [
                { type: ActivityType.Watching, name: 'Netflix' },
                { type: ActivityType.Listening, name: 'Spotify' }
            ],
        } as unknown as Presence;

        await handler.handle(presence);

        expect(mockSend).not.toHaveBeenCalled();
    });

    test('should not alert if game was recently messaged', async () => {
        mockFetchMessages.mockResolvedValue({
            filter: () => ({
                filter: () => ({
                    filter: () => ({
                        sort: () => ({
                            first: () => ({
                                createdTimestamp: Date.now() - 60 * 60 * 1000,
                            }),
                        }),
                    }),
                }),
            }),
        });

        const presence = createMockPresence('164537364092289024', ['Marvel Rivals']);
        await handler.handle(presence);

        expect(mockSend).not.toHaveBeenCalled();
    });

    test('should not alert if user is offline on desktop', async () => {
        const presence = {
            ...createMockPresence('164537364092289024', ['Marvel Rivals']),
            clientStatus: { desktop: 'offline' }
        } as unknown as Presence;

        await handler.handle(presence);

        expect(mockSend).not.toHaveBeenCalled();
    });

    test('should not alert self', async () => {
        const presence = createMockPresence('265610485812953088', ['Risk of Rain 2']);
        await handler.handle(presence);

        // Check that the self-alert is not among the calls
        const selfAlertCall = mockSend.mock.calls.find(call =>
            call[0].includes('TYLER is playing Risk of Rain 2')
        );
        expect(selfAlertCall).toBeUndefined();
    });
});
