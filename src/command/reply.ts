import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";

import { Command } from "./command";
import { discordToString, getLogger } from "../util";

const logger = getLogger("command.ReplyCommand");

export class ReplyCommand implements Command {
    name = "reply";
    description = "replies to bot";
    slashCommandConfig = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        logger.warn(`Someone attempted to reply:\n${discordToString(interaction)}`);
        return interaction.reply("I'm not implemented yet xD");
    }
}
