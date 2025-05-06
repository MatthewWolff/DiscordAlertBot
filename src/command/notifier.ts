import {
    CacheType,
    ChatInputCommandInteraction,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder
} from 'discord.js';

import { Command, GameDatabase } from "../model";
import { getLogger } from "../util";

const logger = getLogger("command.notifier");

export class NotifierCommand implements Command {
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

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        logger.debug(`Received notifier command: ${interaction.options.getSubcommand()}`);
        return handleNotifierCommand(interaction);
    }
}

// Command handler
export async function handleNotifierCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('target');
    const destination = interaction.options.getUser('destination');
    const game = interaction.options.getString('game');

    logger.debug(`Received notifier command options: ${subcommand} ${target} ${destination} ${game}`);

    const database = await GameDatabase.load();

    switch (subcommand) {
        case 'add':
            if (!target || !destination || !game) {
                await interaction.reply('Missing required arguments!');
                return;
            }

            try {
                database.initializeUser(target.username, target.id);
                database.initializeUser(destination.username, destination.id);
                database.addSubscription(target, destination, game);
                await database.save();
                await interaction.reply(`Added ${game} to ${target.username}'s list for ${destination.username}!`);
            } catch (error) {
                logger.error('Error adding subscription:', error);
                await interaction.reply(`Failed to add game: ${error.message}`);
            }
            break;

        case 'remove':
            if (!target || !destination || !game) {
                await interaction.reply('Missing required arguments!');
                return;
            }

            try {
                database.removeSubscription(target, destination, game);
                await database.save();
                await interaction.reply(`Removed ${game} from ${target.username}'s list for ${destination.username}!`);
            } catch (error) {
                logger.error('Error removing subscription:', error);
                await interaction.reply(`Failed to remove game: ${error.message}`);
            }
            break;

        case 'get-subscriptions':
            await handleGetSubscriptions(interaction, database);
            break;

        case 'get-subscribers':
            await handleGetSubscribers(interaction, database);
            break;
    }
}

async function handleGetSubscriptions(interaction: CommandInteraction, database: GameDatabase) {
    if (!interaction.isChatInputCommand()) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const subscribedGames = database.getSubscribedGames(targetUser);

    if (subscribedGames.size === 0) {
        await interaction.reply(`${targetUser.username} has no subscriptions`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Subscriptions`)
        .setColor('#0099ff')
        .setTimestamp();

    for (const [targetUsername, games] of subscribedGames) {
        embed.addFields({
            name: `Notified when ${targetUsername} plays:`,
            value: games.join('\n'),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleGetSubscribers(interaction: CommandInteraction, database: GameDatabase) {
    if (!interaction.isChatInputCommand()) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const subscribers = database.getSubscribers(targetUser);

    if (subscribers.size === 0) {
        await interaction.reply(`${targetUser.username} has no subscribers`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`Users tracking ${targetUser.username}'s games`)
        .setColor('#00ff99')
        .setTimestamp();

    for (const [subscriberUsername, games] of subscribers) {
        embed.addFields({
            name: `${subscriberUsername} will be notified about:`,
            value: games.join('\n'),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}
