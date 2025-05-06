import {
    CacheType,
    ChatInputCommandInteraction,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder
} from 'discord.js';

import { Command } from "../model";
import { getLogger, loadDatabase, saveDatabase } from "../util";

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

    logger.debug(`Received notifier command options: ${subcommand} ${target} ${destination} ${game}`)

    const database = await loadDatabase();

    switch (subcommand) {
        case 'add':
            // Initialize the database structure if it doesn't exist
            if (!database[destination.id]) {
                database[destination.id] = {};
            }
            if (!database[destination.id][target.id]) {
                database[destination.id][target.id] = [target.username.toUpperCase()];
            }

            // Check if the game already exists
            if (database[destination.id][target.id].includes(game)) {
                await interaction.reply(`${game} is already in ${target.username}'s list for ${destination.username}!`);
                return;
            }

            // Add the game
            database[destination.id][target.id].push(game);
            await saveDatabase(database);
            await interaction.reply(`Added ${game} to ${target.username}'s list for ${destination.username}!`);
            break;

        case 'remove':
            // Check if the entries exist
            if (!database[destination.id] || !database[destination.id][target.id]) {
                await interaction.reply(`No games found for ${target.username} in ${destination.username}'s list!`);
                return;
            }

            // Find and remove the game
            const gameIndex = database[destination.id][target.id].indexOf(game);
            if (gameIndex === -1) {
                await interaction.reply(`${game} not found in ${target.username}'s list for ${destination.username}!`);
                return;
            }

            database[destination.id][target.id].splice(gameIndex, 1);
            await saveDatabase(database);
            await interaction.reply(`Removed ${game} from ${target.username}'s list for ${destination.username}!`);
            break;
        case 'get-subscriptions':
            await handleGetSubscriptions(interaction);
            break;
        case 'get-subscribers':
            await handleGetSubscribers(interaction);
            break;
    }
}

async function handleGetSubscriptions(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const database = await loadDatabase();

    const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Subscriptions`)
        .setColor('#0099ff')
        .setTimestamp();

    let foundAny = false;

    // Look through all destination users
    for (const [destinationId, users] of Object.entries(database)) {
        if (users[targetUser.id]) {
            foundAny = true;
            const games = users[targetUser.id].slice(1); // Remove the username entry
            if (games.length > 0) {
                try {
                    const destinationUser = await interaction.client.users.fetch(destinationId);
                    embed.addFields({
                        name: `Notified when ${destinationUser.username} plays:`,
                        value: games.join('\n'),
                        inline: false
                    });
                } catch (error) {
                    console.error(`Error fetching user ${destinationId}:`, error);
                }
            }
        }
    }

    if (!foundAny) {
        await interaction.reply(`${targetUser.username}'s has no subscriptions`);
        return;
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleGetSubscribers(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const database = await loadDatabase();

    // Check if the user has any subscriptions
    const userNotifications = database[targetUser.id];

    if (!userNotifications) {
        await interaction.reply(`${targetUser.username} has no notifications set!`);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`Users tracking ${targetUser.username}'s games`)
        .setColor('#00ff99')
        .setTimestamp();

    let hasEntries = false;

    // Iterate through all users in the subscription list
    for (const [userId, games] of Object.entries(userNotifications)) {
        if (userId === targetUser.id) continue; // Skip config entry

        const gamesList = games.slice(1); // Remove the username entry
        if (gamesList.length > 0) {
            hasEntries = true;
            try {
                const subscribedUser = await interaction.client.users.fetch(userId);
                embed.addFields({
                    name: `${subscribedUser.username} will be notified about:`,
                    value: gamesList.join('\n'),
                    inline: false
                });
            } catch (error) {
                console.error(`Error fetching user ${userId}:`, error);
            }
        }
    }

    if (!hasEntries) {
        await interaction.reply(`${targetUser.username} has no notifications set`);
        return;
    }

    await interaction.reply({ embeds: [embed] });
}

