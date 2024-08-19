import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, } from "discord.js";
import { Command } from "./command";

export class ReplyCommand implements Command {
    name = "reply";
    description = "replies to bot";
    slashCommandConfig = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        console.log(interaction);
        return interaction.reply("I'm not implemented yet xD");
    }
}
