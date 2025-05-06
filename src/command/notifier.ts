import { ChatInputCommandInteraction, Client, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { Command, GameDatabase } from "../model";
import { getLogger, mapKeysAsync } from "../util";

const logger = getLogger("command.notifier");

export class NotifierCommand implements Command {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    name = "notifier";
    description = "Manage game subscriptions";
    slashCommandConfig = new SlashCommandBuilder()
        .setName('notifier')
        .setDescription('Manage game notifications')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a game to track for a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to add the game to')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('destination')
                        .setDescription('The user\'s list to add to')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('The game to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a game from tracking for a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to remove the game from')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('destination')
                        .setDescription('The user\'s list to remove from')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('The game to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('get-subscriptions')
                .setDescription('Show whose games you are tracking')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to check subscribers for (defaults to you)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('get-subscribers')
                .setDescription('Show who is notified about your gameplay')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to check subscriptions for (defaults to you)')
                        .setRequired(false)
                )
        );

    async execute(interaction: ChatInputCommandInteraction) {
        logger.debug(`Received notifier command: ${interaction.options.getSubcommand()}`);
        return this.handleNotifierCommand(interaction);
    }

    async handleNotifierCommand(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        const subcommand = interaction.options.getSubcommand();
        const subscriber = interaction.options.getUser('target');
        const target = interaction.options.getUser('destination');
        const game = interaction.options.getString('game');

        logger.debug(`Received notifier command options: ${subcommand} ${subscriber} ${target} ${game}`);

        const database = await GameDatabase.load();

        switch (subcommand) {
            case 'add':
                if (!subscriber || !target || !game) {
                    await interaction.reply('Missing required arguments!');
                    return;
                }

                try {
                    const added = await database.addSubscription(subscriber, target, game);
                    if (added) {
                        await interaction.reply(`Added ${game} to ${subscriber.username}'s list for ${target.username}!`);
                    } else {
                        await interaction.reply(`${game} is already in ${subscriber.username}'s list for ${target.username}!`);
                    }
                } catch (error) {
                    logger.error('Error adding subscription:', error);
                    await interaction.reply(`Failed to add game: ${error.message}`);
                }
                break;

            case 'remove':
                if (!subscriber || !target || !game) {
                    await interaction.reply('Missing required arguments!');
                    return;
                }

                try {
                    const removed = await database.removeSubscription(subscriber, target, game);
                    if (removed) {
                        await interaction.reply(`Removed ${game} from ${subscriber.username}'s list for ${target.username}!`);
                    } else {
                        await interaction.reply(`${game} is not in ${subscriber.username}'s list for ${target.username}!`);
                    }
                } catch (error) {
                    logger.error('Error removing subscription:', error);
                    await interaction.reply(`Failed to remove game: ${error.message}`);
                }
                break;

            case 'get-subscriptions':
                await this.handleGetSubscriptions(interaction, database);
                break;

            case 'get-subscribers':
                await this.handleGetSubscribers(interaction, database);
                break;
        }
    }

    async handleGetSubscriptions(interaction: CommandInteraction, database: GameDatabase) {
        if (!interaction.isChatInputCommand()) {
            logger.warn('[handleGetSubscriptions] Interaction is not a chat input command');
            return;
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        logger.debug(`[handleGetSubscriptions] Getting subscriptions for ${targetUser.username} (${targetUser.id})`);

        const subscribedGamesRaw = database.getSubscribedGames(targetUser);
        const subscribedGames = await mapKeysAsync(subscribedGamesRaw, async (id) => {
            return (await this.client.users.fetch(id)).username;
        });
        logger.debug(`[handleGetSubscriptions] Found ${subscribedGames.size} subscriptions`);

        if (subscribedGames.size === 0) {
            logger.debug(`[handleGetSubscriptions] No subscriptions found for ${targetUser.username}`);
            await interaction.reply(`${targetUser.username} has no subscriptions`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.username}'s Subscriptions`)
            .setColor('#0099ff')
            .setTimestamp();

        for (const [targetUsername, games] of subscribedGames) {
            logger.debug(`[handleGetSubscriptions] Adding games for ${targetUsername}: ${games.join(', ')}`);
            embed.addFields({
                name: `Notified when ${targetUsername} plays:`,
                value: games.join('\n'),
                inline: false
            });
        }

        logger.debug('[handleGetSubscriptions] Sending response with subscriptions embed');
        await interaction.reply({ embeds: [embed] });
    }

    async handleGetSubscribers(interaction: CommandInteraction, database: GameDatabase) {
        if (!interaction.isChatInputCommand()) {
            logger.warn('[handleGetSubscribers] Interaction is not a chat input command');
            return;
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        logger.debug(`[handleGetSubscribers] Getting subscribers for ${targetUser.username} (${targetUser.id})`);

        const subscribersRaw = database.getSubscribers(targetUser);
        const subscribers = await mapKeysAsync(subscribersRaw, async (id) => {
            return (await this.client.users.fetch(id)).username;
        });

        logger.debug(`[handleGetSubscribers] Found ${subscribers.size} subscribers`);

        if (subscribers.size === 0) {
            logger.debug(`[handleGetSubscribers] No subscribers found for ${targetUser.username}`);
            await interaction.reply(`${targetUser.username} has no subscribers`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Users tracking ${targetUser.username}'s games`)
            .setColor('#00ff99')
            .setTimestamp();

        for (const [subscriberUsername, games] of subscribers) {
            logger.debug(`[handleGetSubscribers] Adding subscriber ${subscriberUsername} with games: ${games.join(', ')}`);
            embed.addFields({
                name: `${subscriberUsername} will be notified about:`,
                value: games.join('\n'),
                inline: false
            });
        }

        logger.debug('[handleGetSubscribers] Sending response with subscribers embed');
        await interaction.reply({ embeds: [embed] });
    }
}
