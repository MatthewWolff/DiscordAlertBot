import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";

export interface Command {
    name: string;
    description?: string;

    slashCommandConfig: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

    execute(interaction: ChatInputCommandInteraction): Promise<any>;
}
