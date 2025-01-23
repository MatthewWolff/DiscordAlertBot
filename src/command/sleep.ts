import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";

import { Command } from "../model/command";
import { getLogger } from "../util";
import { BOT_OWNER } from "../config/constants";

const logger = getLogger("command.SleepCommand");

export class SleepCommand implements Command {
    name = "sleep";
    description = "Hush the bot";
    slashCommandConfig = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        if (interaction.user.id !== BOT_OWNER) {
            logger.warn(`User ${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id}) tried to sleep the bot`);
        }
    }
}
