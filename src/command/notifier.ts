import {
    CacheType,
    ChatInputCommandInteraction,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder
} from 'discord.js';
import * as fs from 'fs/promises';

import { Command } from "../model";
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
                .setName('list')
                .setDescription('List tracked games')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to show games for (leave empty to show all)')
                        .setRequired(false)
                )
        );

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        await interaction.reply("processing notifier command");
        return handleNotifierCommand(interaction);
    }
}

interface GameDatabase {
    [userId: string]: {
        [friendId: string]: string[];
    };
}

// Helper functions
async function loadDatabase(): Promise<GameDatabase> {
    try {
        logger.debug("Loading database...");
        const data = await fs.readFile('./gameDatabase.json', 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Error loading database:', error);
        return {};
    }
}

async function saveDatabase(database: GameDatabase): Promise<void> {
    try {
        logger.debug("Saving database...");
        await fs.writeFile('./gameDatabase.json', JSON.stringify(database, null, 2));
    } catch (error) {
        logger.error('Error saving database:', error);
    }
}

// Command handler
export async function handleNotifierCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('target');
    const destination = interaction.options.getUser('destination');
    const game = interaction.options.getString('game');

    logger.debug(`Received notifier command: ${subcommand} ${target} ${destination} ${game}`)

    if (!target || !destination || !game) {
        await interaction.reply('Missing required arguments!');
        return;
    }

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
        case 'list':
            await handleList(interaction);
            break;
    }
}

async function handleList(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const user = interaction.options.getUser('user');
    const database = await loadDatabase();

    if (user) {
        // Show games for specific user
        const embed = new EmbedBuilder()
            .setTitle(`Game Tracking for ${user.username}`)
            .setColor('#0099ff')
            .setTimestamp();

        let foundAny = false;

        // Look through all destination users
        for (const [destinationId, users] of Object.entries(database)) {
            if (users[user.id]) {
                foundAny = true;
                const games = users[user.id].slice(1); // Remove the username entry
                if (games.length > 0) {
                    const destinationUser = await interaction.client.users.fetch(destinationId);
                    embed.addFields({
                        name: `Games tracked by ${destinationUser.username}`,
                        value: games.join('\n') || 'No games',
                        inline: true
                    });
                }
            }
        }

        if (!foundAny) {
            await interaction.reply(`No games are being tracked for ${user.username}`);
            return;
        }

        await interaction.reply({ embeds: [embed] });

    } else {
        // Show all tracked games
        const embed = new EmbedBuilder()
            .setTitle('All Tracked Games')
            .setColor('#0099ff')
            .setTimestamp();

        for (const [destinationId, users] of Object.entries(database)) {
            try {
                const destinationUser = await interaction.client.users.fetch(destinationId);
                const trackedUsers = [];

                for (const [userId, games] of Object.entries(users)) {
                    if (userId === destinationId) continue; // Skip config entry

                    const username = games[0]; // First entry is username
                    const userGames = games.slice(1); // Remove username entry

                    if (userGames.length > 0) {
                        trackedUsers.push(`**${username}**:\n${userGames.join('\n')}`);
                    }
                }

                if (trackedUsers.length > 0) {
                    embed.addFields({
                        name: `${destinationUser.username}'s Tracked Games`,
                        value: trackedUsers.join('\n\n'),
                        inline: false
                    });
                }
            } catch (error) {
                console.error(`Error fetching user ${destinationId}:`, error);
            }
        }

        if (embed.data.fields?.length === 0) {
            await interaction.reply('No games are currently being tracked.');
            return;
        }

        await interaction.reply({ embeds: [embed] });
    }
}
