import { BaseHandler } from "./baseHandler";
import { getLogger } from "../util";
import { ChannelType, Message, VoiceChannel } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";

const logger = getLogger("handler.donnieHandler");

// bot command prefix
const prefix = 'don!';

let isTalking = false;
let channel = null;
let voiceConnection = null;
let dispatcher = null;
let target = null;
let onOff = true;

// https://github.com/aaronr5tv/DonnieThornberryBot/blob/master/bot.js
export class DonnieHandler extends BaseHandler {
    handle(field: any): Promise<void> {
        throw new Error("Donnie does not handle things normally. Please use his other handlers.");
    }


    // TODO: refactor this to be more pleasant
    commands = {
        'target': {
            help: 'Set the person that Donnie will target. Usage: don!target @ElizaThornberry . Must @ (mention) a valid user. THIS MUST BE A VALID USER, MEANING THE NAME MUST BE HIGHLIGHTED BLUE INDICATING YOU ARE MENTIONING A USER.',
            execute: async (message: Message) => {
                if (message.mentions.users.size < 1) {
                    await message.reply('Must mention a valid user.');
                } else {
                    target = message.mentions.users.first().id;
                    this.checkForUserInVoice();
                    if (!target) {
                        await message.reply('Please provide a valid user.')
                    }
                }
            }
        },
        'stop': {
            help: 'Turn Donnie off.',
            execute: () => {
                if (voiceConnection) {
                    voiceConnection.disconnect();
                }
                onOff = false;
            }
        },
        'start': {
            help: 'Turn Donnie on. ;)',
            execute: () => {
                onOff = true;
                this.checkForUserInVoice();
            }
        },
    }

    // YABADOOBEYABABAOABAYDBAYB
    play(connection) {
        dispatcher = connection.play('./donnie.mp3')
            .on('finish', () => {
                if (isTalking) {
                    this.play(connection)
                }
            });
    }


    handleBotCommand(message: Message) {
        let content = message.content;
        if (content.startsWith(prefix)) {
            let cmd = content.slice(prefix.length).split(' ')[0];
            if (this.commands[cmd]) {
                this.commands[cmd].execute(message);
            } else {
                message.reply('Command not found, use "don!help" to see commands.');
            }
        }
    }

    // TODO update
    async handleVoiceStateUpdate(oldState, newState) {
        if (oldState.id === target && newState.id === target && onOff) {
            if (oldState.channelID === null) {
                channel = await this.client.channels.fetch(newState.channelID);
                channel.join().then(connection => {
                    voiceConnection = connection;
                });
            }
            if (oldState.channelID != null && newState.channel === null && voiceConnection != null) {
                channel.leave();
            }
            if (oldState.channelID != null && newState.channel != null) {
                channel = await this.client.channels.fetch(newState.channelID);
                channel.join().then(connection => {
                    voiceConnection = connection;
                });
            }
        }
    }

    // TODO update for new discord API - https://stackoverflow.com/questions/70770884/how-to-get-speaking-status-in-real-time-using-discord-js-v13
    handleSpeaking(member, speaking) {
        if (member.id === target) {
            if (speaking.bitfield === 1 && voiceConnection.speaking.bitfield === 0) {
                this.play(voiceConnection);
                isTalking = true;
            }
            if (speaking.bitfield === 0) {
                dispatcher.end();
                isTalking = false;
            }
        }
    }

    // TODO: rewrite logic to be more readable
    checkForUserInVoice() {
        let vcs = this.client.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
        for (let [_, channel] of vcs) {
            channel = (channel as VoiceChannel)
            if (channel.members.has(target)) {
                if (channel.speakable && channel.joinable) {
                    voiceConnection = joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                    });
                } else {
                    logger.error("Cannot join this voice channel");
                }
                return;
            }
        }
        if (voiceConnection) {
            voiceConnection.disconnect();
        }
    }
}