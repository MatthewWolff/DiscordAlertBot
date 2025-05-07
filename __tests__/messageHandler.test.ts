// __tests__/messageHandler.test.ts
import { MessageHandler } from '../src/handler';
import { Client, DMChannel, Message, User } from 'discord.js';
import { BOT_OWNER } from '../src/config/constants';

jest.mock('discord.js');

const mockMessage = { content: 'Test message' } as Message;
const mockSend = jest.fn().mockResolvedValue(mockMessage);
const mockCreateDM = jest.fn();

const createMockUser = (id: string, username: string, isBot = false): User => {
    const mockChannel = {
        send: mockSend,
        messages: {
            fetch: jest.fn()
        }
    } as unknown as DMChannel;

    return {
        id,
        username,
        globalName: username.toUpperCase(),
        bot: isBot,
        send: mockSend,
        createDM: mockCreateDM.mockResolvedValue(mockChannel),
        dmChannel: mockChannel,
    } as unknown as User;
};

describe('MessageHandler', () => {
    let handler: MessageHandler;
    let mockClient: Client;
    let mockBotOwner: User;
    let mockNonOwnerUser: User;
    let mockMessage: Message;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBotOwner = createMockUser(BOT_OWNER, 'Owner');
        mockNonOwnerUser = createMockUser('12345', 'NonOwner');

        mockClient = {
            user: { id: 'bot-id' },
            users: {
                fetch: jest.fn((id: string) => {
                    if (id === BOT_OWNER) return Promise.resolve(mockBotOwner);
                    return Promise.resolve(mockNonOwnerUser);
                }),
            },
        } as unknown as Client;

        handler = new MessageHandler(mockClient);
    });

    test('should ignore messages sent by the bot itself', async () => {
        mockMessage = {
            author: { id: 'bot-id' } as User,
        } as Message;

        await handler.handle(mockMessage);

        expect(mockSend).not.toHaveBeenCalled();
    });

    test('should reply sassily to bot users', async () => {
        const botUser = createMockUser('23456', 'BotUser', true);

        mockMessage = {
            author: botUser,
            content: 'Beep boop',
            channel: { type: 1 },
        } as unknown as Message;

        await handler.handle(mockMessage);

        expect(mockSend).toHaveBeenCalledWith(expect.stringContaining("I don't talk to robots"));
    });

    test('should forward DM from non-owner to owner', async () => {
        mockMessage = {
            author: mockNonOwnerUser,
            content: 'Hello there',
            channel: { type: 1 }, // DMChannel
        } as unknown as Message;

        await handler.handle(mockMessage);

        expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Hello there'));
    });

    test('should not forward DM from owner without a reply context', async () => {
        mockMessage = {
            author: mockBotOwner,
            content: 'Owner message',
            channel: { type: 1 },
        } as unknown as Message;

        await handler.handle(mockMessage);

        expect(mockSend).not.toHaveBeenCalled();
    });

    test('should forward owner reply to correct user if ID separator is present', async () => {
        const replyContent = 'Thanks! - Owner |<ID>| 12345';

        const repliedTo = {
            content: replyContent,
        } as unknown as Message;

        mockBotOwner.dmChannel.messages.fetch = jest.fn().mockResolvedValue(repliedTo);

        mockMessage = {
            author: mockBotOwner,
            content: 'Replying to user',
            reference: { messageId: 'abc123' },
            channel: { type: 1 },
            fetchReference: jest.fn().mockResolvedValue(repliedTo),
        } as unknown as Message;

        await handler.handle(mockMessage);

        expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Replying to user'));
    });
});
