// __tests__/interactionHandler.test.ts
import { InteractionHandler } from '../src/handler';
import { ChatInputCommandInteraction, Client } from 'discord.js';
import { BOT_OWNER } from '../src/config/constants';

jest.mock('discord.js');

const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockSend = jest.fn().mockResolvedValue(undefined);

const createMockInteraction = (overrides = {}): ChatInputCommandInteraction => {
    const defaultInteraction = {
        commandName: 'ping',
        user: { id: '123', globalName: 'TestUser' },
        guildId: 'guild-id',
        guild: { name: 'TestGuild' },
        reply: jest.fn(),
        deferReply: jest.fn(),
    };
    return { ...defaultInteraction, ...overrides } as unknown as ChatInputCommandInteraction;
};

describe('InteractionHandler', () => {
    let handler: InteractionHandler;
    let mockClient: Client;

    beforeEach(() => {
        jest.clearAllMocks();

        jest.mock('../src/command', () => ({
            PingCommand: jest.fn(() => ({
                name: 'ping',
                execute: mockExecute,
                slashCommandConfig: { toJSON: () => ({ name: 'ping' }) }
            })),
            SleepCommand: jest.fn(() => ({
                name: 'sleep',
                execute: mockExecute,
                slashCommandConfig: { toJSON: () => ({ name: 'sleep' }) }
            })),
        }));

        mockClient = {
            users: {
                fetch: jest.fn().mockResolvedValue({ id: BOT_OWNER, send: mockSend })
            }
        } as unknown as Client;

        const { InteractionHandler: RealHandler } = jest.requireActual('../src/handler/interactionHandler');
        handler = new RealHandler(mockClient);
    });

    test('should execute a matching command', async () => {
        const interaction = createMockInteraction({ commandName: 'ping' });
        await handler.handle(interaction);
        expect(mockExecute).toHaveBeenCalledWith(interaction);
    });

    test('should send sleep message to self if BOT_OWNER triggers sleep', async () => {
        const interaction = createMockInteraction({
            commandName: 'sleep',
            user: { id: BOT_OWNER, globalName: 'Owner' }
        });
        await handler.handle(interaction);
        expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Sleeping until'));
        expect(mockExecute).toHaveBeenCalledWith(interaction);
    });

    test('should not send sleep message if non-owner triggers sleep', async () => {
        const interaction = createMockInteraction({
            commandName: 'sleep',
            user: { id: 'someone-else', globalName: 'RandomUser' }
        });
        await handler.handle(interaction);
        expect(mockSend).not.toHaveBeenCalled();
        expect(mockExecute).toHaveBeenCalledWith(interaction);
    });

    test('should reject unknown command', async () => {
        const interaction = createMockInteraction({ commandName: 'unknown' });
        await expect(handler.handle(interaction)).rejects.toEqual('Command not matched');
    });
});
