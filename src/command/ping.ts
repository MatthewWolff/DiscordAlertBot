import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";

import { Command } from "../model/command";

export class PingCommand implements Command {
    name = "ping";
    description = "Pings the bot";
    slashCommandConfig = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        return interaction.reply(":3");
    }
}
